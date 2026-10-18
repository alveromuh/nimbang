import { scoreDecision, stressTest, swingWeights, serializeDecision } from '../src/core/index.ts';
import type { Decision } from '../src/core/index.ts';

const decision: Decision = {
  id: 'contoh-pindah-kerja',
  title: 'Pindah kerja ke media fashion',
  objectives: [
    { id: 'o1', statement: 'Penghasilan naik', kind: 'motivation' },
    { id: 'o2', statement: 'Jam kerja tidak bertambah', kind: 'hygiene' },
  ],
  options: [
    { id: 'a', label: 'Tetap di tempat sekarang', isBaseline: true },
    { id: 'b', label: 'Pindah ke media fashion', isBaseline: false },
    { id: 'c', label: 'Negosiasi ulang di tempat sekarang', isBaseline: false },
  ],
  items: [
    // Penghasilan — a benefit. Higher value = better.
    { id: 'a--o1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 2, probability: 1, risk: 'ordinary' },
    { id: 'b--o1', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 0.8, risk: 'ordinary', referenceClass: '3 dari 4 teman yang pindah dapat sesuai janji' },
    { id: 'c--o1', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 0.6, risk: 'ordinary', referenceClass: 'negosiasi terakhir di kantor ini: 2 dari 5 berhasil' },
    // Jam kerja — a COST. Higher value = worse.
    { id: 'a--o2', optionId: 'a', objectiveId: 'o2', kind: 'cost', value: 3, probability: 1, risk: 'ordinary' },
    { id: 'b--o2', optionId: 'b', objectiveId: 'o2', kind: 'cost', value: 5, probability: 1, risk: 'ordinary' },
    { id: 'c--o2', optionId: 'c', objectiveId: 'o2', kind: 'cost', value: 2, probability: 1, risk: 'ordinary' },
  ],
  claims: [],
  swingPoints: { o1: 100, o2: 40 },
};

const weights = swingWeights(decision.objectives, decision.swingPoints!);
const score = scoreDecision(decision, weights);
const stress = stressTest(decision, weights);

console.log('WEIGHTS', JSON.stringify(weights));
console.log('ANCHORS', JSON.stringify(score.anchors));
console.log('NET', JSON.stringify(score.net));
console.log('RANKING', score.ranking.join(' > '));
console.log('RECOMMENDATION', score.recommendation);
console.log('FATAL', JSON.stringify(score.fatal));
console.log('FLIPS', JSON.stringify(stress.flipsAt));
console.log('TORNADO', JSON.stringify(stress.tornado));

const label = (id: string) => decision.options.find((o) => o.id === id)?.label ?? id;
const itemLabel = (id: string) => {
  const item = decision.items.find((i) => i.id === id);
  if (!item) return id;
  const option = decision.options.find((o) => o.id === item.optionId);
  const objective = decision.objectives.find((o) => o.id === item.objectiveId);
  return `${option?.label} on ${objective?.statement}`;
};
console.log('--- table ---');
for (const [index, id] of score.ranking.entries()) {
  console.log(`${index + 1}. ${label(id)}  net=${(score.net[id] ?? 0).toFixed(3)}`);
}
if (stress.flipsAt) {
  console.log(`flip: ${itemLabel(stress.flipsAt.itemId)} by ${stress.flipsAt.delta.toFixed(2)}`);
}
console.log('--- share link ---');
console.log(`http://localhost:5199/#d=${serializeDecision(decision)}`);
