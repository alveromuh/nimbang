# Pilih Opsi v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A user can state a decision, add options, score them against
objectives, and get a fragility report — all in the browser, without an account.

**Architecture:** Pure functions in `src/core/`, no framework imports. React UI
in `src/ui/`. State is a single JSON document in localStorage, shareable as URL.

**Tech Stack:** TypeScript strict, Vite, React, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-18-pilih-opsi-v1.md`

## Global Constraints

- `src/core/` must not import React, DOM, or any storage API.
- All numeric outputs must be traceable to an input.
- No `any` without a comment justifying it.
- Conventional commits.

## Review Focus

1. **Empty inputs** — a decision with 0 objectives or <3 options must fail
   gracefully, not crash.
2. **Fatal risk** — must block recommendation, not just warn.
3. **Sunk cost** — must be excluded from arithmetic, visibly.
4. **Tie on normalisation** — if all options have the same value on an
   objective, normalisation must not divide by zero.
5. **URL sharing** — the decision document must round-trip through a URL
   without loss.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/core/types.ts`
- Test: `src/core/types.test.ts`

**Interfaces:**
- Produces: `Decision`, `Objective`, `Option`, `Item`, `Claim`, `Prediction` types

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { DecisionSchema } from './types';

describe('Decision schema', () => {
  it('validates a minimal decision', () => {
    const d = {
      id: 'd1',
      title: 'Test',
      objectives: [{ id: 'o1', statement: 'Be happy', kind: 'motivation' }],
      options: [
        { id: 'a', label: 'A', isBaseline: true },
        { id: 'b', label: 'B', isBaseline: false },
        { id: 'c', label: 'C', isBaseline: false },
      ],
      items: [],
      claims: [],
    };
    expect(() => DecisionSchema.parse(d)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/types.test.ts`
Expected: FAIL with "Cannot find module './types'"

- [ ] **Step 3: Implement `src/core/types.ts`**

Define these types and export them: `Decision`, `Objective`, `Option`, `Item`,
`Claim`, `Prediction`. Define a Zod schema for `Decision`.

`ScoreResult` is defined in Task 6, which is where it is produced.

`Objective`, `Option`, `Item`, `Claim` are defined here because later tasks
consume them.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/
git commit -m "feat: project scaffold with decision types"
```

---

### Task 2: Objective gate

**Files:**
- Create: `src/core/frame.ts`
- Test: `src/core/frame.test.ts`

**Interfaces:**
- Consumes: `Decision` type from Task 1
- Produces: `validateFrame(decision: Decision): FrameResult`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { validateFrame } from './frame';

describe('objective gate', () => {
  it('rejects a decision with no objectives', () => {
    const result = validateFrame({ objectives: [] });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/objective/i);
  });
  it('accepts a decision with one objective', () => {
    const result = validateFrame({
      objectives: [{ id: 'o1', statement: 'X', kind: 'motivation' }],
    });
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/frame.test.ts`
Expected: FAIL with "Cannot find module './frame'"

- [ ] **Step 3: Implement `validateFrame` in `src/core/frame.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/frame.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/frame.ts src/core/frame.test.ts
git commit -m "feat: objective gate"
```

---

### Task 3: Option floor (≥3 options, one baseline)

**Files:**
- Create: `src/core/diverge.ts`
- Test: `src/core/diverge.test.ts`

**Interfaces:**
- Consumes: `Decision` type from Task 1
- Produces: `validateDiverge(decision: Decision): DivergeResult`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { validateDiverge } from './diverge';

describe('option floor', () => {
  it('rejects fewer than 3 options', () => {
    const result = validateDiverge({
      options: [
        { id: 'a', label: 'A', isBaseline: true },
        { id: 'b', label: 'B', isBaseline: false },
      ],
    });
    expect(result.ok).toBe(false);
  });
  it('rejects if no baseline', () => {
    const result = validateDiverge({
      options: [
        { id: 'a', label: 'A', isBaseline: false },
        { id: 'b', label: 'B', isBaseline: false },
        { id: 'c', label: 'C', isBaseline: false },
      ],
    });
    expect(result.ok).toBe(false);
  });
  it('accepts 3 options with one baseline', () => {
    const result = validateDiverge({
      options: [
        { id: 'a', label: 'A', isBaseline: true },
        { id: 'b', label: 'B', isBaseline: false },
        { id: 'c', label: 'C', isBaseline: false },
      ],
    });
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/diverge.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `validateDiverge` in `src/core/diverge.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/diverge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/diverge.ts src/core/diverge.test.ts
git commit -m "feat: option floor"
```

---

### Task 4: Claim tagging

**Files:**
- Create: `src/core/tag.ts`
- Test: `src/core/tag.test.ts`

**Interfaces:**
- Consumes: `Decision` type from Task 1
- Produces: `validateTag(decision: Decision): TagResult`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { validateTag } from './tag';

describe('claim tagging', () => {
  it('rejects a fact with no source', () => {
    const result = validateTag({
      claims: [{ id: 'c1', text: 'Salary is 12jt', domain: 'fact' }],
    });
    expect(result.ok).toBe(false);
  });
  it('accepts a fact with a source', () => {
    const result = validateTag({
      claims: [{ id: 'c1', text: 'Salary is 12jt', domain: 'fact', source: 'contract' }],
    });
    expect(result.ok).toBe(true);
  });
  it('rejects a preference with no owner', () => {
    const result = validateTag({
      claims: [{ id: 'c1', text: 'I hate commuting', domain: 'preference' }],
    });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/tag.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `validateTag` in `src/core/tag.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/tag.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/tag.ts src/core/tag.test.ts
git commit -m "feat: claim tagging"
```

---

### Task 5: Swing weighting

**Files:**
- Create: `src/core/weigh.ts`
- Test: `src/core/weigh.test.ts`

**Interfaces:**
- Consumes: `Objective` type from Task 1
- Produces: `swingWeights(objectives: Objective[], points: Record<string, number>): Record<string, number>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { swingWeights } from './weigh';

describe('swing weighting', () => {
  it('normalises swing points to weights summing to 1', () => {
    const objectives = [
      { id: 'o1', statement: 'Money', kind: 'motivation' },
      { id: 'o2', statement: 'Time', kind: 'motivation' },
    ];
    const points = { o1: 100, o2: 50 };
    const weights = swingWeights(objectives, points);
    expect(weights.o1 + weights.o2).toBeCloseTo(1);
    expect(weights.o1).toBeGreaterThan(weights.o2);
  });
  it('rejects if an objective has no points', () => {
    const objectives = [{ id: 'o1', statement: 'Money', kind: 'motivation' }];
    expect(() => swingWeights(objectives, {})).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/weigh.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `swingWeights` in `src/core/weigh.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/weigh.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/weigh.ts src/core/weigh.test.ts
git commit -m "feat: swing weighting"
```

---

### Task 6: Scoring engine

**Files:**
- Create: `src/core/score.ts`
- Test: `src/core/score.test.ts`

**Interfaces:**
- Consumes: `Decision`, `Objective`, `Item` types from Task 1
- Produces: `scoreDecision(decision: Decision, weights: Record<string, number>): ScoreResult`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { scoreDecision } from './score';

describe('scoring', () => {
  it('normalises per objective across options', () => {
    const decision = {
      id: 'd1',
      title: 'Test',
      objectives: [{ id: 'o1', statement: 'Money', kind: 'motivation' }],
      options: [
        { id: 'a', label: 'A', isBaseline: true },
        { id: 'b', label: 'B', isBaseline: false },
        { id: 'c', label: 'C', isBaseline: false },
      ],
      items: [
        { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
        { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
        { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
      ],
      claims: [],
    };
    const weights = { o1: 1 };
    const result = scoreDecision(decision, weights);
    expect(result.net.a).toBe(1);   // (5-1)/(5-1) = 1
    expect(result.net.b).toBe(0.5); // (3-1)/(5-1) = 0.5
    expect(result.net.c).toBe(0);   // (1-1)/(5-1) = 0
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/score.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `scoreDecision` in `src/core/score.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/score.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/score.ts src/core/score.test.ts
git commit -m "feat: scoring engine"
```

---

### Task 7: Probability with reference class

**Files:**
- Create: `src/core/probabilify.ts`
- Test: `src/core/probabilify.test.ts`

**Interfaces:**
- Consumes: `Item` type from Task 1
- Produces: `validateProbabilities(items: Item[]): ProbabilifyResult`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { validateProbabilities } from './probabilify';

describe('probability with reference class', () => {
  it('rejects an item with no reference class', () => {
    const result = validateProbabilities([
      { id: 'i1', probability: 0.8, referenceClass: '' },
    ]);
    expect(result.ok).toBe(false);
  });
  it('accepts an item with a reference class', () => {
    const result = validateProbabilities([
      { id: 'i1', probability: 0.8, referenceClass: 'similar projects' },
    ]);
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/probabilify.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `validateProbabilities` in `src/core/probabilify.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/probabilify.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/probabilify.ts src/core/probabilify.test.ts
git commit -m "feat: probability with reference class"
```

---

### Task 8: Sensitivity

**Files:**
- Create: `src/core/stress.ts`
- Test: `src/core/stress.test.ts`

**Interfaces:**
- Consumes: `ScoreResult` from Task 6
- Produces: `stressTest(decision: Decision, weights: Record<string, number>): StressReport`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { stressTest } from './stress';

describe('sensitivity', () => {
  it('detects a fragile winner', () => {
    const decision = {
      id: 'd1',
      title: 'Test',
      objectives: [{ id: 'o1', statement: 'Money', kind: 'motivation' }],
      options: [
        { id: 'a', label: 'A', isBaseline: true },
        { id: 'b', label: 'B', isBaseline: false },
        { id: 'c', label: 'C', isBaseline: false },
      ],
      items: [
        { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 4, probability: 1, risk: 'ordinary' },
        { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
      ],
      claims: [],
    };
    const weights = { o1: 1 };
    const result = stressTest(decision, weights);
    expect(result.fragile).toBe(true);
    expect(result.flipsAt.itemId).toBe('i1');
    expect(result.flipsAt.delta).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/stress.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `stressTest` in `src/core/stress.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/stress.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/stress.ts src/core/stress.test.ts
git commit -m "feat: sensitivity"
```

---

### Task 9: Bias gate

**Files:**
- Create: `src/core/gate.ts`
- Test: `src/core/gate.test.ts`

**Interfaces:**
- Consumes: `Decision` type from Task 1
- Produces: `validateGate(decision: Decision): GateResult`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { validateGate } from './gate';

describe('bias gate', () => {
  it('rejects if sunk cost is missing', () => {
    const result = validateGate({
      sunkCost: null,
      survivorship: '',
      ostrich: '',
      hastyGeneralisation: '',
      causation: '',
      falseComparison: '',
    });
    expect(result.ok).toBe(false);
  });
  it('rejects if survivorship is empty', () => {
    const result = validateGate({
      sunkCost: { amount: 0, note: '' },
      survivorship: '',
      ostrich: '',
      hastyGeneralisation: '',
      causation: '',
      falseComparison: '',
    });
    expect(result.ok).toBe(false);
  });
  it('accepts if all fields are filled', () => {
    const result = validateGate({
      sunkCost: { amount: 0, note: 'none' },
      survivorship: 'x',
      ostrich: 'x',
      hastyGeneralisation: 'x',
      causation: 'x',
      falseComparison: 'x',
    });
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/gate.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `validateGate` in `src/core/gate.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/gate.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/gate.ts src/core/gate.test.ts
git commit -m "feat: bias gate"
```

---

### Task 10: Commit and calibration

**Files:**
- Create: `src/core/commit.ts`
- Test: `src/core/commit.test.ts`

**Interfaces:**
- Consumes: `Decision` type from Task 1
- Produces: `brierScore(predictions: { p: number, o: boolean }[]): number`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { brierScore } from './commit';

describe('Brier score', () => {
  it('scores a perfect forecast as 0', () => {
    const score = brierScore([
      { p: 1, o: true },
      { p: 1, o: true },
    ]);
    expect(score).toBe(0);
  });
  it('scores a random guess as 0.25', () => {
    const score = brierScore([
      { p: 0.5, o: true },
      { p: 0.5, o: false },
    ]);
    expect(score).toBe(0.25);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/commit.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `brierScore` in `src/core/commit.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/commit.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/commit.ts src/core/commit.test.ts
git commit -m "feat: commit and calibration"
```

---

### Task 11: URL round-trip

**Files:**
- Create: `src/core/serialize.ts`
- Test: `src/core/serialize.test.ts`

**Interfaces:**
- Consumes: `Decision` type from Task 1
- Produces: `serializeDecision(decision: Decision): string`, `deserializeDecision(s: string): Decision`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { serializeDecision, deserializeDecision } from './serialize';

describe('URL round-trip', () => {
  it('round-trips a decision', () => {
    const decision = {
      id: 'd1',
      title: 'Test',
      objectives: [{ id: 'o1', statement: 'Money', kind: 'motivation' }],
      options: [
        { id: 'a', label: 'A', isBaseline: true },
        { id: 'b', label: 'B', isBaseline: false },
        { id: 'c', label: 'C', isBaseline: false },
      ],
      items: [],
      claims: [],
    };
    const s = serializeDecision(decision);
    const back = deserializeDecision(s);
    expect(back).toEqual(decision);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/serialize.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `serializeDecision` and `deserializeDecision` in `src/core/serialize.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/serialize.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/serialize.ts src/core/serialize.test.ts
git commit -m "feat: URL round-trip"
```

---

### Task 12: Minimal UI

**Files:**
- Create: `src/ui/App.tsx`
- Create: `src/ui/DecisionForm.tsx`
- Create: `src/ui/Result.tsx`
- Test: `src/ui/App.test.tsx`

**Interfaces:**
- Consumes: all core functions from Tasks 1–11
- Produces: a working app

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the form', () => {
    render(<App />);
    expect(screen.getByText(/objective/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/ui/App.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement the UI in `src/ui/`**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/ui/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/
git commit -m "feat: minimal UI"
```

---

### Task 13: Integration test

**Files:**
- Create: `src/integration.test.ts`

**Interfaces:**
- Consumes: all core functions

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { validateFrame, validateDiverge, validateTag, swingWeights, scoreDecision, stressTest, validateGate, brierScore, serializeDecision, deserializeDecision } from './core/index';

describe('integration', () => {
  it('runs the full pipeline', () => {
    // ... a complete decision, scored end to end
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/integration.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the integration test**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/integration.test.ts
git commit -m "test: integration"
```

---

### Task 14: Build and deploy

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the failing test**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 12 }
      - uses: actions/setup-node@v4
        with: { node-version: 26, cache: pnpm }
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 2: Run the build locally**

Run: `pnpm build`
Expected: succeeds, emits `dist/`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: test and build"
```

---

## Self-review checklist

- [ ] Every stage in the spec has a task.
- [ ] Every task has a failing test, a verification command, and a commit.
- [ ] Type names are consistent across tasks.
- [ ] The five Review Focus items each have a test.
- [ ] The plan is shorter than the code it describes.
