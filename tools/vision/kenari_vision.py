#!/usr/bin/env python3
"""Read a photo of a book spread with a vision model on Kenari.id.

This is project tooling for the research phase, not part of the app. It exists
so source material can be extracted into `docs/sources/` without transcribing
prose by hand.

Usage
-----
    ./kenari_vision.py <image> [--model M] [--prompt P] [--max-tokens N]

    # default: cheap reasoning model, good enough for body text and tables
    ./kenari_vision.py page-042.jpg

    # escalation: dense tables, formulas, diagrams, handwriting
    ./kenari_vision.py page-042.jpg --model claude-sonnet-5

    # ask a question instead of transcribing
    ./kenari_vision.py page-042.jpg --prompt "Which rows of the table are blank?"

Credentials
-----------
The API key is read at call time from `KENARI_API_KEY` if set, otherwise from
the `kenari-key` helper (`~/.local/bin/kenari-key`), which greps it out of
`~/.hermes/.env`. The key is never written to disk here and never printed.

Reasoning models
----------------
`deepseek-v4-1-flash` is a reasoning model: it spends completion tokens on a
`reasoning` field before emitting `content`. With max_tokens=8000 the whole
budget can go to reasoning and `content` comes back empty while `finish_reason`
still reads `stop`. Two defences, both on by default:
  - `reasoning_effort: "none"` for transcription, which does not need thinking
  - a generous max_tokens, plus one retry with the budget doubled if content is empty

Verified models (image input, on Kenari.id)
-------------------------------------------
    deepseek-v4-1-flash      paid    default; reasoning, needs the guards above
    deepseek-v4-1-flash:free free    same model, free tier rate-limits hard
    agnes-3-0-flash:free     free    fast, no reasoning, good on simple pages
    claude-sonnet-5          paid    ~4.5x the prompt tokens, cleanest tables

Photographing
-------------
Photos are usually book SPREADS: two facing pages per frame. The prompt asks the
model to separate them and report the printed page numbers, which is what makes
the extracted notes citable.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import subprocess
import sys
import urllib.error
import urllib.request

BASE = "https://kenari.id/v1/chat/completions"
DEFAULT_MODEL = "deepseek-v4-1-flash"
DEFAULT_PROMPT = (
    "Transkripsikan seluruh teks pada gambar ini persis seperti tertulis. "
    "Gambar ini bisa berisi SATU atau DUA halaman buku yang terbuka. "
    "Kalau dua halaman, tulis pemisah '--- HALAMAN KIRI ---' dan "
    "'--- HALAMAN KANAN ---' dan sebutkan nomor halaman yang tercetak. "
    "Pertahankan struktur: judul, paragraf, dan tabel (gunakan markdown table). "
    "Untuk diagram, jelaskan teks dan panahnya. Jangan menambahkan komentar."
)


def api_key() -> str:
    """Resolve the Kenari key without ever persisting or echoing it."""
    key = os.environ.get("KENARI_API_KEY", "").strip()
    if key:
        return key

    helper = os.path.expanduser("~/.local/bin/kenari-key")
    if not os.path.isfile(helper):
        raise SystemExit(
            "no API key: set KENARI_API_KEY or install the kenari-key helper"
        )
    out = subprocess.run([helper], capture_output=True, text=True, check=False)
    key = out.stdout.strip()
    if not key:
        raise SystemExit("kenari-key returned an empty key")
    return key


def encode(path: str) -> str:
    with open(path, "rb") as fh:
        return base64.b64encode(fh.read()).decode()


def build_payload(args: argparse.Namespace, max_tokens: int) -> dict:
    mime = mimetypes.guess_type(args.image)[0] or "image/jpeg"
    payload = {
        "model": args.model,
        "max_tokens": max_tokens,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": args.prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{encode(args.image)}",
                            "detail": args.detail,
                        },
                    },
                ],
            }
        ],
    }
    if args.reasoning and args.reasoning != "default":
        payload["reasoning_effort"] = args.reasoning
    return payload


def call(payload: dict) -> dict:
    req = urllib.request.Request(
        BASE,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {api_key()}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=600) as resp:
        return json.loads(resp.read())


def extract_text(body: dict) -> str:
    message = body["choices"][0]["message"]
    text = message.get("content") or ""
    if isinstance(text, list):
        text = "".join(
            part.get("text", "") for part in text if isinstance(part, dict)
        )
    return text.strip()


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Read a photo of a book spread with a vision model."
    )
    ap.add_argument("image", help="path to a page photo")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--prompt", default=DEFAULT_PROMPT)
    ap.add_argument("--max-tokens", type=int, default=32000)
    ap.add_argument("--detail", default="high", choices=["low", "high", "auto"])
    ap.add_argument(
        "--reasoning",
        default="none",
        choices=["default", "none", "low", "high", "max"],
        help="reasoning_effort; 'none' stops the model burning the budget thinking",
    )
    args = ap.parse_args()

    if not os.path.isfile(args.image):
        print(f"no such file: {args.image}", file=sys.stderr)
        return 1

    budget = args.max_tokens
    for _ in range(3):
        try:
            body = call(build_payload(args, budget))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")[:800]
            print(f"HTTP {exc.code}: {detail}", file=sys.stderr)
            return 1
        except Exception as exc:  # noqa: BLE001 - surface the real cause
            print(f"request failed: {exc}", file=sys.stderr)
            return 1

        text = extract_text(body)
        usage = body.get("usage") or {}
        finish = body["choices"][0].get("finish_reason")
        if text:
            print(text)
            print(
                f"\n--- usage: prompt={usage.get('prompt_tokens')} "
                f"completion={usage.get('completion_tokens')} "
                f"finish={finish} model={body.get('model')}",
                file=sys.stderr,
            )
            return 0

        print(
            f"empty content (finish={finish}, "
            f"completion={usage.get('completion_tokens')}); "
            f"retrying with max_tokens={budget * 2}",
            file=sys.stderr,
        )
        budget *= 2

    print("failed: no content after 3 attempts", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
