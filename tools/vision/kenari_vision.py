#!/usr/bin/env python3
"""Read a photo of a book page with a vision model on Kenari.id.

This is project tooling for the research phase, not part of the app. It exists
so source material can be extracted into `docs/sources/` without transcribing
prose by hand.

Usage
-----
    ./kenari_vision.py <image> [--model M] [--prompt P] [--max-tokens N]

    # default: free model, good enough for body text and simple tables
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

Verified models (image input, on Kenari.id)
-------------------------------------------
    agnes-3-0-flash:free     free    default; correct on skewed, dimmed photos
    agnes-2-5-flash:free     free    older, same family
    claude-sonnet-5          paid    ~4.5x the prompt tokens, cleaner tables
    gemini-3-6-flash         paid    cheap alternative
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
DEFAULT_MODEL = "agnes-3-0-flash:free"
DEFAULT_PROMPT = (
    "Transkripsikan seluruh teks pada gambar ini persis seperti tertulis. "
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


def build_payload(args: argparse.Namespace) -> dict:
    mime = mimetypes.guess_type(args.image)[0] or "image/jpeg"
    return {
        "model": args.model,
        "max_tokens": args.max_tokens,
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


def call(payload: dict) -> dict:
    req = urllib.request.Request(
        BASE,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {api_key()}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.loads(resp.read())


def main() -> int:
    ap = argparse.ArgumentParser(description="Read a photo of a page with a vision model.")
    ap.add_argument("image", help="path to a page photo")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--prompt", default=DEFAULT_PROMPT)
    ap.add_argument("--max-tokens", type=int, default=8000)
    ap.add_argument("--detail", default="high", choices=["low", "high", "auto"])
    args = ap.parse_args()

    if not os.path.isfile(args.image):
        print(f"no such file: {args.image}", file=sys.stderr)
        return 1

    try:
        body = call(build_payload(args))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:800]
        print(f"HTTP {exc.code}: {detail}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001 - surface the real cause
        print(f"request failed: {exc}", file=sys.stderr)
        return 1

    message = body["choices"][0]["message"]
    text = message.get("content") or ""
    if isinstance(text, list):
        text = "".join(
            part.get("text", "") for part in text if isinstance(part, dict)
        )
    print(text)

    usage = body.get("usage") or {}
    if usage:
        print(
            f"\n--- usage: prompt={usage.get('prompt_tokens')} "
            f"completion={usage.get('completion_tokens')} model={body.get('model')}",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
