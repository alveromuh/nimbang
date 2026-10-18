#!/usr/bin/env python3
"""Batch-extract every book spread photo in a directory.

Order is derived from the WhatsApp filename timestamp, which reflects capture
order (the camera fired ~1/second), not from directory listing order.

Resumable: an existing .md for a photo is skipped unless --force is given.
Each output keeps the source filename in a header so a note can be traced back.

Usage:
    ./batch_ocr.py ../../docs/sources/raw [--out ../../docs/sources/raw-text]
"""
import argparse
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
HELPER = os.path.join(HERE, "kenari_vision.py")

STAMP = re.compile(
    r"at (\d+)\.(\d+)\.(\d+) (AM|PM)(?: \((\d+)\))?\.(?:jpe?g)$", re.IGNORECASE
)


def sort_key(name: str):
    m = STAMP.search(name)
    if not m:
        return (99, 99, 99, 99, 0)
    hh, mm, ss, ampm, dup = m.groups()
    hh, mm, ss = int(hh), int(mm), int(ss)
    if ampm.upper() == "PM" and hh != 12:
        hh += 12
    if ampm.upper() == "AM" and hh == 12:
        hh = 0
    return (hh, mm, ss, int(dup or 0), 0)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--out", default=None)
    ap.add_argument("--model", default="deepseek-v4-1-flash")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    src = os.path.abspath(args.src)
    out = os.path.abspath(args.out or os.path.join(os.path.dirname(src), "raw-text"))
    os.makedirs(out, exist_ok=True)

    photos = sorted(
        (f for f in os.listdir(src) if f.lower().endswith((".jpeg", ".jpg"))),
        key=sort_key,
    )
    print(f"{len(photos)} photos -> {out}", flush=True)

    failures = []
    for i, name in enumerate(photos, 1):
        stem = f"p{i:03d}"
        target = os.path.join(out, f"{stem}.md")
        if os.path.exists(target) and not args.force:
            print(f"[{i:>3}/{len(photos)}] {stem} skip (exists)", flush=True)
            continue

        proc = subprocess.run(
            [sys.executable, HELPER, os.path.join(src, name), "--model", args.model],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0 or not proc.stdout.strip():
            failures.append((name, proc.stderr.strip()[:300]))
            print(f"[{i:>3}/{len(photos)}] {stem} FAILED: {proc.stderr.strip()[:160]}", flush=True)
            time.sleep(2)
            continue

        with open(target, "w") as fh:
            fh.write(f"<!-- source photo: {name} -->\n")
            fh.write(f"<!-- order: {i} of {len(photos)} -->\n\n")
            fh.write(proc.stdout)

        usage = [ln for ln in proc.stderr.splitlines() if "usage:" in ln]
        print(f"[{i:>3}/{len(photos)}] {stem} ok  {len(proc.stdout)} chars  {usage[0] if usage else ''}", flush=True)
        time.sleep(0.4)

    print(f"\ndone. failures={len(failures)}")
    for name, err in failures:
        print(f"  {name}: {err}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
