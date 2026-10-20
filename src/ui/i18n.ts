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
    id: 'Apa yang mau kamu capai? Tulis ini sebelum memilih opsi.',
    en: 'What are you trying to achieve? Write it before choosing options.',
  },
  optionsHint: {
    id: 'Opsi apa saja yang tersedia sekarang?',
    en: 'What options are available right now?',
  },
  weightsHint: {
    id: 'Seberapa besar bedanya dari opsi terburuk ke terbaik di sini?',
    en: 'How much does it matter to go from the worst to the best option here?',
  },
  scoresHint: {
    id: 'Nilai 1–5 per sel. Untung menambah, rugi mengurangi.',
    en: 'Value 1–5 per cell. Benefit adds, cost subtracts.',
  },
  coverageHint: {
    id: 'Satu sel: satu opsi pada satu atribut. Kosong berarti belum dinilai, bukan nol.',
    en: 'One cell: one option on one attribute. Empty means unassessed, not zero.',
  },
  coverageComplete: {
    id: 'Semua sel sudah dinilai.',
    en: 'Every cell is assessed.',
  },
  coverageMissing: {
    id: 'Rekomendasi menunggu semua sel dinilai.',
    en: 'The recommendation waits until every cell is assessed.',
  },
  tagMissing: {
    id: 'Lengkapi sumber setiap klaim fakta dan pemilik setiap preferensi.',
    en: 'Give every factual claim a source and every preference an owner.',
  },
  claims: { id: 'Klaim', en: 'Claims' },
  claimsHint: {
    id: 'Fakta perlu sumber. Preferensi perlu pemilik.',
    en: 'A fact needs a source. A preference needs an owner.',
  },
  claimText: { id: 'Klaim', en: 'Claim' },
  claimTextPlaceholder: {
    id: 'mis. Gaji di sana 12 juta',
    en: 'e.g. The salary there is 12 million',
  },
  claimDomain: { id: 'Jenis', en: 'Domain' },
  fact: { id: 'Fakta', en: 'Fact' },
  preference: { id: 'Preferensi', en: 'Preference' },
  claimSource: { id: 'Sumber', en: 'Source' },
  claimSourcePlaceholder: { id: 'mis. slip gaji, atau tanya HRD', en: 'e.g. payslip, or ask HR' },
  claimOwner: { id: 'Pemilik', en: 'Owner' },
  claimOwnerPlaceholder: { id: 'mis. saya sendiri', en: 'e.g. my own' },
  addClaim: { id: 'Tambah klaim', en: 'Add claim' },
  removeClaim: { id: 'Hapus klaim', en: 'Remove claim' },
  claimsEmpty: {
    id: 'Belum ada klaim. Boleh kosong, tapi klaim yang ditulis harus lengkap.',
    en: 'No claims yet. Empty is allowed, but a claim you write must be complete.',
  },
  referenceMissing: {
    id: 'Isi kasus pembanding di setiap penilaian.',
    en: 'Fill in a reference class for every assessment.',
  },
  biasHint: {
    id: 'Pertanyaan refleksi, bukan pendeteksi bias.',
    en: 'Reflection prompts, not bias detection.',
  },
  commitHint: {
    id: 'Tulis apa yang kamu harapkan, lalu periksa nanti.',
    en: 'Write down what you expect, then check it later.',
  },

  // Fields
  optionLabel: { id: 'Opsi', en: 'Option' },
  baseline: { id: 'pembanding', en: 'baseline' },
  /**
   * Why the first row exists and cannot be removed.
   *
   * The hint used to carry this, and it read as a rule about the *method* rather
   * than an explanation of the row in front of the reader. The row is locked, so
   * the explanation belongs beside it.
   */
  baselineNote: {
    id: 'Pembanding: keadaan kalau kamu tidak memilih apa pun. Baris ini selalu ada.',
    en: 'Baseline: what happens if you choose nothing. This row is always here.',
  },
  sunkCost: { id: 'Biaya yang sudah keluar', en: 'Sunk cost already spent' },
  sunkNote: { id: 'Untuk apa', en: 'What it was for' },
  sunkWhy: {
    id: 'Uang yang sudah keluar tetap keluar, apa pun pilihanmu. Jadi tidak menimbang.',
    en: 'Money already spent stays spent whatever you choose, so it carries no weight.',
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
  /** What the numbers on this screen are, and are not. */
  netScale: {
    id: 'Skor bersih itu perbandingan, bukan ukuran. Tiap atribut dinormalkan ke 0–1 menurut opsi yang kamu masukkan, lalu ditimbang. Nol berarti tidak lebih baik dari opsi terburuk di atribut itu, bukan berarti tidak ada dampak.',
    en: 'A net score is a comparison, not a measurement. Each attribute is normalised to 0–1 across the options you entered, then weighted. Zero means no better than the worst option on that attribute — not that there is no effect.',
  },
  netDepends: {
    id: 'Karena itu menambah atau menghapus opsi bisa mengubah skor semua opsi lain. Angka di sini hanya bisa dibandingkan satu sama lain.',
    en: 'So adding or removing an option can change every other score. Numbers here are only comparable with each other.',
  },
} as const;

export type CopyKey = keyof typeof copy;
