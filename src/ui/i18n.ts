/**
 * Bilingual copy.
 *
 * Indonesian is the primary language: the app is Indonesian (`index.html` sets
 * `lang="id"`, every example in the docs is Indonesian). English sits underneath
 * at lower opacity as a reading aid, not as a second interface.
 *
 * **Not everything is bilingual, and that is deliberate.** Two lines under every
 * button and every error message doubles the vertical space and turns a calm form
 * into a wall of text. The rule applied here:
 *
 * - Bilingual: panel headings, field labels, the bias questions, and the hints
 *   that explain what a field wants. These are the places a reader can get stuck.
 * - Indonesian only: buttons, inline errors, the chat transcript, and anything
 *   the user typed. A button is an action, not a sentence to translate.
 */

export interface BiText {
  id: string;
  en: string;
}

export const copy = {
  // Panel headings
  objectives: { id: 'Tujuan', en: 'Objectives' },
  options: { id: 'Opsi', en: 'Options' },
  weights: { id: 'Bobot', en: 'Swing weights' },
  scores: { id: 'Penilaian', en: 'Scores' },
  bias: { id: 'Pemeriksaan bias', en: 'Bias checks' },
  commit: { id: 'Komitmen', en: 'Commit' },

  // Panel hints
  objectivesHint: {
    id: 'Apa yang mau kamu capai, sebelum menyebut opsi?',
    en: 'What are you trying to achieve, before you list options?',
  },
  optionsHint: {
    id: 'Minimal tiga, satu di antaranya tidak melakukan apa-apa.',
    en: 'At least three, one of which is doing nothing.',
  },
  weightsHint: {
    id: 'Seberapa penting opsi bergerak dari terburuk ke terbaik di sini?',
    en: 'How much does it matter that the options move from worst to best here?',
  },
  scoresHint: {
    id: 'Nilai 1–5, untung atau rugi, seberapa mungkin, dan kasus serupa biasanya bagaimana.',
    en: 'Value 1–5, benefit or cost, how likely, and what similar cases usually do.',
  },
  biasHint: {
    id: 'Tiap pertanyaan menargetkan satu cara keputusan ini bisa salah.',
    en: 'Each question targets one way this decision could be wrong.',
  },
  commitHint: {
    id: 'Tulis apa yang kamu harapkan, supaya nanti bisa diperiksa.',
    en: 'Write down what you expect, so you can check it later.',
  },

  // Fields
  optionLabel: { id: 'Opsi', en: 'Option' },
  baseline: { id: 'pembanding', en: 'baseline' },
  sunkCost: { id: 'Biaya yang sudah keluar', en: 'Sunk cost already spent' },
  sunkNote: { id: 'Untuk apa', en: 'What it was for' },
  sunkWhy: {
    id: 'Uang dan waktu yang sudah keluar sama saja, mau lanjut atau berhenti. Jadi tidak bisa membuat satu opsi lebih baik dari yang lain.',
    en: 'Money and time already spent are the same whether you continue or stop, so they cannot make one option better than another.',
  },
  excluded: { id: 'Tidak dihitung', en: 'Excluded from the arithmetic' },

  // Bias questions
  survivorship: { id: 'Siapa yang mencoba ini lalu gagal?', en: 'Who tried this and failed?' },
  survivorshipHint: {
    id: 'Kenapa kamu tidak mendengar dari mereka?',
    en: 'Why have you not heard from them?',
  },
  ostrich: { id: 'Bukti apa yang sedang kamu hindari?', en: 'What evidence are you avoiding?' },
  ostrichHint: { id: 'Hal yang kamu enggan periksa.', en: 'The thing you would rather not check.' },
  hasty: { id: 'Ini berdasar berapa kasus?', en: 'How many cases does this rest on?' },
  hastyHint: { id: 'Angka, bukan perasaan.', en: 'A number, not a feeling.' },
  causation: { id: 'Ini sebab, atau kebetulan waktunya?', en: 'Is this a cause, or a coincidence in time?' },
  causationHint: {
    id: 'Apa yang harus benar supaya ini disebut sebab?',
    en: 'What would have to be true for it to be a cause?',
  },
  comparison: {
    id: 'Apa beda kasusmu dengan kasus pembandingnya?',
    en: 'What differs between your case and the comparison case?',
  },
  comparisonHint: {
    id: 'Pembandingnya biasanya lebih rapi daripada kenyataan.',
    en: 'The comparison is usually cleaner than the reality.',
  },

  // Score card
  // Indonesian-only in the matrix, so these are read with `bi()` rather than
  // rendered bilingually. Kept here so the wording has one home.
  value: { id: 'Nilai', en: 'Value' },
  kind: { id: 'Jenis', en: 'Kind' },
  benefit: { id: 'Untung', en: 'Benefit' },
  cost: { id: 'Rugi', en: 'Cost' },
  probability: { id: 'Peluang', en: 'Probability' },
  referenceClass: { id: 'Kasus pembanding', en: 'Reference class' },

  // AI
  aiOptions: { id: 'Belum tahu opsi apa saja?', en: 'Not sure what the options are?' },
  aiBias: { id: 'Belum tahu mau isi apa?', en: 'Not sure what to write?' },

  // Verdict
  verdict: { id: 'Hasil', en: 'Verdict' },
  recommendation: { id: 'Rekomendasi', en: 'Recommendation' },
  fragility: { id: 'Ketahanan', en: 'Fragility' },
  movesMost: { id: 'Yang paling mengubah jawaban', en: 'What moves the answer most' },
  leads: { id: 'Tertinggi', en: 'Leads' },
} as const;

export type CopyKey = keyof typeof copy;
