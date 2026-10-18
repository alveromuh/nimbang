# How to use Nimbang

A worked example, then the order the app asks for things and why.

Run it: `pnpm dev`, then open <http://localhost:5199/>.

## The example

**The decision:** a job offer at a fashion media company, against staying put
and against renegotiating where you are.

Load it instantly by pasting this into your browser:

```
http://localhost:5199/#d=eyJpZCI6ImNvbnRvaC1waW5kYWgta2VyamEiLCJ0aXRsZSI6IlBpbmRhaCBrZXJqYSBrZSBtZWRpYSBmYXNoaW9uIiwib2JqZWN0aXZlcyI6W3siaWQiOiJvMSIsInN0YXRlbWVudCI6IlBlbmdhc2lsYW4gbmFpayIsImtpbmQiOiJtb3RpdmF0aW9uIn0seyJpZCI6Im8yIiwic3RhdGVtZW50IjoiSmFtIGtlcmphIHRpZGFrIGJlcnRhbWJhaCIsImtpbmQiOiJoeWdpZW5lIn1dLCJvcHRpb25zIjpbeyJpZCI6ImEiLCJsYWJlbCI6IlRldGFwIGRpIHRlbXBhdCBzZWthcmFuZyIsImlzQmFzZWxpbmUiOnRydWV9LHsiaWQiOiJiIiwibGFiZWwiOiJQaW5kYWgga2UgbWVkaWEgZmFzaGlvbiIsImlzQmFzZWxpbmUiOmZhbHNlfSx7ImlkIjoiYyIsImxhYmVsIjoiTmVnb3NpYXNpIHVsYW5nIGRpIHRlbXBhdCBzZWthcmFuZyIsImlzQmFzZWxpbmUiOmZhbHNlfV0sIml0ZW1zIjpbeyJpZCI6ImEtLW8xIiwib3B0aW9uSWQiOiJhIiwib2JqZWN0aXZlSWQiOiJvMSIsImtpbmQiOiJiZW5lZml0IiwidmFsdWUiOjIsInByb2JhYmlsaXR5IjoxLCJyaXNrIjoib3JkaW5hcnkifSx7ImlkIjoiYi0tbzEiLCJvcHRpb25JZCI6ImIiLCJvYmplY3RpdmVJZCI6Im8xIiwia2luZCI6ImJlbmVmaXQiLCJ2YWx1ZSI6NSwicHJvYmFiaWxpdHkiOjAuOCwicmlzayI6Im9yZGluYXJ5IiwicmVmZXJlbmNlQ2xhc3MiOiIzIGRhcmkgNCB0ZW1hbiB5YW5nIHBpbmRhaCBkYXBhdCBzZXN1YWkgamFuamkifSx7ImlkIjoiYy0tbzEiLCJvcHRpb25JZCI6ImMiLCJvYmplY3RpdmVJZCI6Im8xIiwia2luZCI6ImJlbmVmaXQiLCJ2YWx1ZSI6MywicHJvYmFiaWxpdHkiOjAuNiwicmlzayI6Im9yZGluYXJ5IiwicmVmZXJlbmNlQ2xhc3MiOiJuZWdvc2lhbmkgdGVyYWtoaXIgZGkga2FudG9yIGluaTogMiBkYXJpIDUgYmVyaGFzaWwifSx7ImlkIjoiYS0tbzIiLCJvcHRpb25JZCI6ImEiLCJvYmplY3RpdmVJZCI6Im8yIiwia2luZCI6ImNvc3QiLCJ2YWx1ZSI6MywicHJvYmFiaWxpdHkiOjEsInJpc2siOiJvcmRpbmFyeSJ9LHsiaWQiOiJiLS1vMiIsIm9wdGlvbklkIjoiYiIsIm9iamVjdGl2ZUlkIjoibzIiLCJraW5kIjoiY29zdCIsInZhbHVlIjo1LCJwcm9iYWJpbGl0eSI6MSwicmlzayI6Im9yZGluYXJ5In0seyJpZCI6ImMtLW8yIiwib3B0aW9uSWQiOiJjIiwib2JqZWN0aXZlSWQiOiJvMiIsImtpbmQiOiJjb3N0IiwidmFsdWUiOjIsInByb2JhYmlsaXR5IjoxLCJyaXNrIjoib3JkaW5hcnkifV0sImNsYWltcyI6W10sInN3aW5nUG9pbnRzIjp7Im8xIjoxMDAsIm8yIjo0MH19
```

### The inputs

| | **Tetap** (baseline) | **Pindah** | **Negosiasi** |
|---|---|---|---|
| **Penghasilan naik** — *benefit*, weight 100 | 2 · sure | 5 · **80%** | 3 · **60%** |
| **Jam kerja tidak bertambah** — *cost*, weight 40 | 3 | 5 | 2 |

Two things in that table are the whole point:

- **"Pindah" scores 5 on income but only at 80%.** A pros/cons list would have
  written "5" and moved on. The probability is what makes it a forecast rather
  than a wish.
- **"Jam kerja" is a cost, not a benefit.** Its 5 means *worst*, so it subtracts.
  Getting this backwards is the most common mistake with a scoring table.

Swing weights: income matters more (100) than hours (40), so income carries 71%
of the decision.

### The output

```
1. Pindah ke media fashion              0.286   <- leads
2. Negosiasi ulang di tempat sekarang   0.143
3. Tetap di tempat sekarang            -0.095

Fragility: +-0.75
```

Read the second block first. **The winner leads by 0.143, and a 0.75 change in
one input reverses it.** So the honest conclusion is not "move jobs" — it is:

> Go and check the salary. If the offer is as promised, move. If it is one notch
> lower than promised, renegotiate instead.

That is the difference between this and a calculator. It tells you what you do
not know yet, not just what you wrote down.

### The reference classes

Under each probability, the example records what it is based on:

- Pindah: *"3 dari 4 teman yang pindah dapat sesuai janji"*
- Negosiasi: *"negosiasi terakhir di kantor ini: 2 dari 5 berhasil"*

These are the fields that turn a guess into something checkable. They are also
where you usually discover your number was wrong.

## The order the app asks for things

The order is deliberate, and it is the part people want to skip.

**1. Objective, before options.** The app refuses to rank anything until you
state what you are trying to achieve. Starting from a list of options means you
can only ever choose among the ones you already thought of.

**2. At least three options, one of them "do nothing".** The baseline is
mandatory because it is the option people forget, and it usually has the lowest
switching cost. Three is the floor because two options is a false dichotomy.

**3. Swing weights.** Not "how important is this" — that question has no anchor
and everyone answers 5. The question is: *how much does it matter that the
options move from worst to best on this objective?*

**4. Scores.** Per option, per objective: a value 1–5, benefit or cost, and
optionally a probability and reference class under `+ Likelihood`.

**5. Bias checks.** Six required fields, and they cannot be skipped. Sunk cost is
recorded and badged **excluded from the arithmetic** — money already spent is the
same whether you continue or stop.

**6. Commit.** Write down what you expect and when you will check. Later, mark
what happened and the app computes a **Brier score**: lower is better, 0.25 is a
coin toss. This is the part that makes you better at judging over time rather
than just better at this one decision.

## Common mistakes

| Mistake | What happens | Fix |
|---|---|---|
| All items set to `benefit` | Costs add to the score instead of subtracting | Set `Kind` to **Cost** for hours, money spent, risk |
| Every probability left at 1 | The ranking looks confident and is fragile for no visible reason | Use `+ Likelihood` where you are genuinely unsure |
| No reference class | The probability is an opinion with a decimal point | Write what similar cases did |
| Scores all 4s and 5s | Normalisation spreads a tiny real difference across the whole 0–1 range | Score the *difference*, not the absolute quality |
| Ignoring the fragility line | The app told you what to check and you skipped it | Treat the delta as your to-do list |

## Doing it without the UI

The engine is a pure library, so the same decision can be computed in a script.
See [`examples/contoh-pindah-kerja.ts`](../examples/contoh-pindah-kerja.ts):

```bash
npx tsx examples/contoh-pindah-kerja.ts
```

It prints the weights, the normalisation anchors, the net scores, the ranking,
the break-even and the tornado, and emits a share link you can paste into the app.
