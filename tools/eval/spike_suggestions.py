#!/usr/bin/env python3
"""Spike: can System One suggest options and bias answers from an objective?

This is a probe, not the feature. It answers one question before any TypeScript
is written: does the structured endpoint produce usable suggestions for the two
places a user gets stuck, or does it need a different question shape?

Run: uv run tools/eval/spike_suggestions.py
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

URL = "https://kenari.id/v1/systemone"
KEY = os.environ.get("KENARI_API_KEY") or subprocess.run(
    [os.path.expanduser("~/.local/bin/kenari-key")],
    capture_output=True,
    text=True,
    check=True,
).stdout.strip()

OBJECTIVE = "Pindah kerja ke media fashion, penghasilan naik tanpa jam kerja bertambah"

QUESTIONS = {
    "options_mentioned": {
        "type": "choice",
        "instructions": (
            "Which set of options is the person actually weighing? "
            "Infer from the situation, including an option they did not name."
        ),
        "criteria": {
            "stay_renegotiate_move": "Stay, renegotiate, or move",
            "move_only": "Only moving",
            "stay_or_move": "Stay or move, no renegotiation",
            "undecidable": "The situation does not say what is being chosen between",
        },
    },
    "option_1": {
        "type": "choice",
        "instructions": "What is the most obvious option the person has not written down?",
        "criteria": {
            "do_nothing": "Continue exactly as now",
            "negotiate": "Ask for a change where they are",
            "move": "Take the other path",
            "ask_first": "Find out more before deciding",
        },
    },
    "third_option_invented": {
        "type": "noul",
        "instructions": (
            "Is there a third course of action available that the person did not mention, "
            "which is not simply doing nothing and not simply the obvious alternative?"
        ),
        "criteria": {
            "true": "A distinct third course exists that the text does not name",
            "false": "The situation really is a choice between two things",
        },
    },
    "survivorship": {
        "type": "noul",
        "instructions": (
            "Would asking 'who tried this and failed?' change the person's estimate? "
            "True when the plan depends on an outcome they have only heard about from "
            "people it worked for."
        ),
        "criteria": {
            "true": "The evidence available is likely survivor-biased",
            "false": "No obvious survivor bias in what they are relying on",
        },
    },
    "ostrich": {
        "type": "noul",
        "instructions": (
            "Is there a specific piece of evidence the person seems to be avoiding "
            "because it might contradict the option they prefer?"
        ),
        "criteria": {
            "true": "An uncomfortable check is identifiable",
            "false": "Nothing suggests avoidance",
        },
    },
}


def ask(model, state, questions, retries=6):
    payload = {"model": model, "state": state, "questions": questions}
    for attempt in range(retries):
        req = urllib.request.Request(
            URL,
            data=json.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                time.sleep(3.0 * (attempt + 1))
                continue
            raise RuntimeError(f"HTTP {exc.code}: {exc.read().decode(errors='replace')[:200]}")
        except Exception:  # noqa: BLE001
            time.sleep(2.0 * (attempt + 1))
    raise RuntimeError("exhausted retries")


def main():
    for model in ("clef:free", "jev-1-13-free"):
        print(f"\n=== {model} ===")
        try:
            result = ask(model, OBJECTIVE, QUESTIONS)
        except RuntimeError as exc:
            print("FAILED:", exc)
            continue
        print(json.dumps(result, indent=2, ensure_ascii=False)[:2500])


if __name__ == "__main__":
    main()
