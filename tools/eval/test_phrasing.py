#!/usr/bin/env python3
"""Is the tujuan-detection failure the model's fault or the question's?

jev missed 4 of 14 true-goal cases, all of them cases where the goal is
implicit (a list of options with an unstated aim). Test three phrasings on
exactly those cases plus controls.
"""
import json
import os
import subprocess
import time
import urllib.error
import urllib.request

URL = "https://kenari.id/v1/systemone"
KEY = os.environ.get("KENARI_API_KEY") or subprocess.run(
    [os.path.expanduser("~/.local/bin/kenari-key")],
    capture_output=True, text=True, check=True,
).stdout.strip()

# cases where jev scored a true-goal case below 0.5
MISSES = {
    "c07": "Gaji 10 juta per bulan. Bingung membaginya untuk tabungan, cicilan rumah, dan biaya hidup.",
    "c14": "Pilih karier di Jakarta atau balik ke kampung buat jaga orang tua?",
    "c16": "Mau sewa kantor 30 juta setahun atau tetap WFH?",
    "c19": "Investasi 100 juta: deposito, reksadana pasar uang, atau SBN ritel?",
}
# controls that were correct
HITS = {
    "c01": "Aku mau ambil S2 di luar negeri atau kerja dulu di Jakarta. S2 butuh 2 tahun dan biaya 400 juta, kerja langsung dapat 15 juta per bulan.",
    "c09": "Aku mau beli laptop bekas tapi belum tahu harga pasarnya. Perlu survey dulu atau langsung beli saja?",
}
# genuinely goal-less
NEG = {
    "c03": "Apakah aku harus resign bulan depan?",
    "c20": "Apa yang harus aku lakukan?",
}

PHRASINGS = {
    "A_current": {
        "type": "noul",
        "instructions": "Does the text state a concrete objective the person wants to reach?",
        "criteria": {"true": "A goal, constraint, or desired outcome is stated",
                     "false": "Only options, complaints, or feelings; no stated objective"},
    },
    "B_any_aim": {
        "type": "noul",
        "instructions": "Can a desired outcome be inferred from this text, even if the person never states it as a goal?",
        "criteria": {"true": "An aim is identifiable, stated or implied by the options and numbers given",
                     "false": "Nothing suggests what the person wants to achieve"},
    },
    "C_decision_criteria": {
        "type": "noul",
        "instructions": "Could you name at least one criterion for judging these options, based on what the person wants?",
        "criteria": {"true": "A criterion is identifiable from the text",
                     "false": "No criterion can be identified"},
    },
}


def ask(model, state, q, retries=6):
    for attempt in range(retries):
        req = urllib.request.Request(
            URL,
            data=json.dumps({"model": model, "state": state,
                             "questions": {"t": q}}).encode(),
            headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())["answers"]["t"]["noul"]
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                time.sleep(3.0 * (attempt + 1))
                continue
            raise
    raise RuntimeError("rate limited")


for model in ["jev-1-13-free", "clef:free"]:
    print(f"\n{'='*68}\n{model}\n{'='*68}")
    print(f"{'case':<6} {'truth':<6} " + " ".join(f"{p:<13}" for p in PHRASINGS))
    for label, group, truth in [("MISS", MISSES, True), ("HIT", HITS, True), ("NEG", NEG, False)]:
        for cid, state in group.items():
            vals = []
            for pname, q in PHRASINGS.items():
                try:
                    vals.append(ask(model, state, q))
                except Exception:  # noqa: BLE001
                    vals.append(float("nan"))
                time.sleep(0.8)
            cells = " ".join(f"{v:<13.2f}" for v in vals)
            flags = "".join("+" if (v >= 0.5) == truth else "-" for v in vals)
            print(f"{cid:<6} {str(truth):<6} {cells}  {flags}")
    print("\n  (+ = correct at 0.5 threshold, - = wrong)")
