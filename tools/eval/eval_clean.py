#!/usr/bin/env python3
"""Clean re-run. Difference from eval_systemone.py: no silent failure swallowing.

Every call is retried on 429 with backoff, and a call that still fails is
recorded as FAILED rather than counted as a disagreement. The first run had
`except Exception: pass` in the agreement/permute loops, which scored rate-limit
failures as instability. That was a measurement bug.
"""
import json
import os
import statistics
import subprocess
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eval_cases import CASES, QUESTIONS  # noqa: E402

URL = "https://kenari.id/v1/systemone"
MODELS = ["jev-1-13-free", "clef:free", "clef-flash:free"]
KEY = os.environ.get("KENARI_API_KEY") or subprocess.run(
    [os.path.expanduser("~/.local/bin/kenari-key")],
    capture_output=True, text=True, check=True,
).stdout.strip()

STATS = {"calls": 0, "retries": 0, "failed": 0}


def ask(model, state, questions, retries=6):
    payload = {"model": model, "state": state, "questions": questions}
    for attempt in range(retries):
        STATS["calls"] += 1
        req = urllib.request.Request(
            URL, data=json.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as exc:
            body = exc.read().decode(errors="replace")[:160]
            if exc.code == 429:
                STATS["retries"] += 1
                time.sleep(3.0 * (attempt + 1))
                continue
            raise RuntimeError(f"HTTP {exc.code}: {body}")
        except Exception as exc:  # noqa: BLE001
            STATS["retries"] += 1
            time.sleep(2.0 * (attempt + 1))
    STATS["failed"] += 1
    raise RuntimeError("exhausted retries")


def permuted(q):
    out = json.loads(json.dumps(q))
    for v in out.values():
        if v.get("type") == "choice":
            v["criteria"] = dict(reversed(list(v["criteria"].items())))
    return out


def spearman(xs, ys):
    def rank(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        rk = [0.0] * len(v)
        for pos, i in enumerate(order):
            rk[i] = pos + 1
        return rk
    rx, ry = rank(xs), rank(ys)
    n = len(xs)
    mx, my = sum(rx) / n, sum(ry) / n
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5
    return num / den if den else float("nan")


def main():
    results = {}
    for model in MODELS:
        print(f"\n{'='*72}\n{model}\n{'='*72}", flush=True)
        rows, failures = [], []
        for case in CASES:
            try:
                body = ask(model, case["state"], QUESTIONS)
            except Exception as exc:  # noqa: BLE001
                failures.append({"id": case["id"], "error": str(exc)})
                print(f"  {case['id']}  FAILED {exc}", flush=True)
                continue
            a = body["answers"]
            rows.append({
                "id": case["id"],
                "expected": case["tipe"],
                "got": a["tipe_keputusan"]["choice"],
                "correct": a["tipe_keputusan"]["choice"] == case["tipe"],
                "confidence": a["tipe_keputusan"].get("confidence", 0.0),
                "tujuan_prob": a["punya_tujuan"]["noul"],
                "tujuan_expected": case["tujuan"],
                "kejelasan": a["kejelasan"]["score"],
                "kejelasan_min": case["kejelasan_min"],
                "usage": body.get("usage", {}),
            })
            time.sleep(1.0)

        # determinism: 3 identical runs per case, on 4 cases
        det_ids = ["c01", "c05", "c07", "c19"]
        stable_same, stable_perm, det_fail = 0, 0, 0
        for cid in det_ids:
            case = next(c for c in CASES if c["id"] == cid)
            first = next(r["got"] for r in rows if r["id"] == cid)
            try:
                same = [ask(model, case["state"], QUESTIONS)["answers"]["tipe_keputusan"]["choice"]
                        for _ in range(3)]
                perm = [ask(model, case["state"], permuted(QUESTIONS))["answers"]["tipe_keputusan"]["choice"]
                        for _ in range(3)]
                stable_same += 1 if len(set(same)) == 1 else 0
                stable_perm += 1 if len(set(perm)) == 1 else 0
                if len(set(perm)) > 1 or perm[0] != first:
                    print(f"  ORDER-SENSITIVE {cid}: first={first} permuted={perm}", flush=True)
            except Exception as exc:  # noqa: BLE001
                det_fail += 1
                print(f"  {cid} determinism FAILED {exc}", flush=True)
            time.sleep(1.0)

        n = len(rows)
        conf = [r["confidence"] for r in rows]
        tp = [(r["tujuan_prob"], r["tujuan_expected"]) for r in rows]
        summary = {
            "n_scored": n,
            "n_failed": len(failures),
            "accuracy": sum(r["correct"] for r in rows) / n if n else None,
            "mean_confidence": statistics.fmean(conf) if conf else None,
            "tujuan_spearman": spearman([p for p, _ in tp], [1 if t else 0 for _, t in tp]) if n > 2 else None,
            "tujuan_acc_at_05": sum(1 for p, t in tp if (p >= 0.5) == t) / n if n else None,
            "det_identical_stable": f"{stable_same}/{len(det_ids)}",
            "det_permute_stable": f"{stable_perm}/{len(det_ids)}",
            "det_failures": det_fail,
            "tokens": sum(r["usage"].get("input_tokens", 0) for r in rows),
        }
        results[model] = {"summary": summary, "rows": rows, "failures": failures}
        print(f"\n  accuracy={summary['accuracy']:.0%}  mean_conf={summary['mean_confidence']:.2f}  "
              f"tujuan_rho={summary['tujuan_spearman']:.2f}  "
              f"identical={summary['det_identical_stable']}  "
              f"permute={summary['det_permute_stable']}  "
              f"tokens={summary['tokens']}  failed={summary['n_failed']}", flush=True)

    print(f"\nAPI calls={STATS['calls']}  retries(429/err)={STATS['retries']}  exhausted={STATS['failed']}")
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_clean.json")
    json.dump({"stats": STATS, "results": results}, open(out, "w"), indent=2, ensure_ascii=False)
    print(f"-> {out}")


if __name__ == "__main__":
    main()
