/**
 * The public surface of the decision engine.
 *
 * Everything here is a pure function over plain data. Nothing in `src/core/`
 * imports React, the DOM, or a storage API, and this file is the boundary that
 * makes that checkable: a consumer imports from `core`, never from a stage file.
 */
export * from './types';
export { validateFrame, type FrameResult } from './frame';
export { validateDiverge, type DivergeResult } from './diverge';
export { validateTag, type TagResult } from './tag';
export { swingWeights } from './weigh';
export { scoreDecision, itemSlope, type ScoreResult, type ScoreAnchors } from './score';
export { validateProbabilities, type ProbabilifyResult, type ProbabilityInput } from './probabilify';
export { stressTest, type StressReport, type FlipPoint, type TornadoEntry } from './stress';
export { validateGate, type GateInputs, type GateResult } from './gate';
export { brierScore, resolvePredictions, type ResolvedPrediction } from './commit';
export { serializeDecision, deserializeDecision } from './serialize';
