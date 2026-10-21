import type { Decision } from '../src/core/types.ts';

/**
 * Worked decision: a common personal trade-off between income, family time,
 * burnout, and career growth. Scores and probabilities are illustrative inputs,
 * not claims about what a person should choose; replace them with your evidence.
 */
export const decision: Decision = {
  id: 'contoh-karier-keluarga',
  title: 'Cari penghasilan lebih baik tanpa mengorbankan keluarga dan kesehatan',
  objectives: [
    { id: 'income', statement: 'Penghasilan bersih cukup dan stabil untuk kebutuhan keluarga', kind: 'hygiene' },
    { id: 'family', statement: 'Punya waktu dan tenaga untuk keluarga setiap hari', kind: 'motivation' },
    { id: 'health', statement: 'Mengurangi stres dan menjaga kesehatan', kind: 'hygiene' },
    { id: 'growth', statement: 'Tetap punya peluang belajar dan berkembang', kind: 'motivation' },
  ],
  options: [
    { id: 'stay', label: 'Tetap di pekerjaan sekarang tanpa perubahan besar', isBaseline: true },
    { id: 'boundaries', label: 'Tetap, tetapi negosiasikan batas jam kerja dan kenaikan gaji', isBaseline: false },
    { id: 'new-job', label: 'Cari pekerjaan baru dengan gaji dan jam kerja yang lebih sehat', isBaseline: false },
    { id: 'side-income', label: 'Tetap bekerja sambil menguji usaha sampingan kecil selama 6 bulan', isBaseline: false },
  ],
  items: [
    { id: 'stay-income', optionId: 'stay', objectiveId: 'income', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary', referenceClass: 'Gaji bersih berjalan sekarang, sudah tetap dua tahun; tidak ada kenaikan yang dijanjikan.' },
    { id: 'stay-family', optionId: 'stay', objectiveId: 'family', kind: 'benefit', value: 2, probability: 1, risk: 'ordinary', referenceClass: 'Jam pulang kerja saat ini; makan malam bersama keluarga terjadi sekitar dua kali seminggu.' },
    { id: 'stay-health', optionId: 'stay', objectiveId: 'health', kind: 'benefit', value: 2, probability: 1, risk: 'ordinary', referenceClass: 'Tidur rata-rata enam jam dan sakit kepala hampir tiap minggu selama tiga bulan terakhir.' },
    { id: 'stay-growth', optionId: 'stay', objectiveId: 'growth', kind: 'benefit', value: 2, probability: 1, risk: 'ordinary', referenceClass: 'Tidak ada proyek baru atau pelatihan dalam dua tahun; jalur promosi belum jelas.' },

    { id: 'boundaries-income', optionId: 'boundaries', objectiveId: 'income', kind: 'benefit', value: 4, probability: 0.55, risk: 'ordinary', referenceClass: 'Perkiraan kasar dari dua pembicaraan kenaikan gaji sebelumnya; perlu cek kebijakan perusahaan dan kisaran pasar.' },
    { id: 'boundaries-family', optionId: 'boundaries', objectiveId: 'family', kind: 'benefit', value: 4, probability: 0.65, risk: 'ordinary', referenceClass: 'Jam lembur berkurang jika atasan menyetujui batas jam; uji selama 8 minggu.' },
    { id: 'boundaries-health', optionId: 'boundaries', objectiveId: 'health', kind: 'benefit', value: 4, probability: 0.6, risk: 'ordinary', referenceClass: 'Perkiraan pribadi; tinjau tingkat stres mingguan selama 8 minggu.' },
    { id: 'boundaries-growth', optionId: 'boundaries', objectiveId: 'growth', kind: 'benefit', value: 3, probability: 0.7, risk: 'ordinary', referenceClass: 'Berdasarkan peluang proyek internal yang sudah dibicarakan dengan manajer.' },

    { id: 'new-income', optionId: 'new-job', objectiveId: 'income', kind: 'benefit', value: 5, probability: 0.7, risk: 'ordinary', referenceClass: 'Bandingkan sekurangnya 5 lowongan yang sesuai dan verifikasi tawaran tertulis sebelum mengundurkan diri.' },
    { id: 'new-family', optionId: 'new-job', objectiveId: 'family', kind: 'benefit', value: 4, probability: 0.55, risk: 'ordinary', referenceClass: 'Tanyakan jam kerja nyata kepada 2 calon rekan kerja; jangan hanya mengandalkan deskripsi lowongan.' },
    { id: 'new-health', optionId: 'new-job', objectiveId: 'health', kind: 'benefit', value: 4, probability: 0.6, risk: 'ordinary', referenceClass: 'Perkiraan; bandingkan perjalanan, beban kerja, dan fleksibilitas pada tawaran konkret.' },
    { id: 'new-growth', optionId: 'new-job', objectiveId: 'growth', kind: 'benefit', value: 5, probability: 0.75, risk: 'ordinary', referenceClass: 'Ukur dari tanggung jawab, dukungan belajar, dan jalur promosi yang dijelaskan saat wawancara.' },

    { id: 'side-income-income', optionId: 'side-income', objectiveId: 'income', kind: 'benefit', value: 4, probability: 0.35, risk: 'ordinary', referenceClass: 'Belum ada pelanggan tetap; validasi dengan 3 pelanggan berbayar sebelum menambah modal.' },
    { id: 'side-income-family', optionId: 'side-income', objectiveId: 'family', kind: 'cost', value: 4, probability: 0.8, risk: 'ordinary', referenceClass: 'Uji batas maksimum 6 jam per minggu dan catat waktu keluarga yang tergeser.' },
    { id: 'side-income-health', optionId: 'side-income', objectiveId: 'health', kind: 'cost', value: 4, probability: 0.75, risk: 'ordinary', referenceClass: 'Dua sumber kerja berisiko menambah beban; pantau jam tidur dan stres tiap minggu.' },
    { id: 'side-income-growth', optionId: 'side-income', objectiveId: 'growth', kind: 'benefit', value: 4, probability: 0.7, risk: 'ordinary', referenceClass: 'Nilai pembelajaran dari uji pasar dan umpan balik pelanggan selama 6 bulan.' },
  ],
  claims: [
    { id: 'household-budget', text: 'Pengeluaran pokok keluarga sekitar Rp 9 juta per bulan.', domain: 'fact', source: 'Rekap pengeluaran 3 bulan terakhir' },
    { id: 'family-presence', text: 'Saya ingin hadir untuk makan malam dan akhir pekan bersama keluarga.', domain: 'preference', owner: 'Saya dan keluarga' },
  ],
  swingPoints: { income: 100, family: 90, health: 85, growth: 45 },
  gate: {
    sunkCost: { amount: 0, note: 'Tidak ada biaya yang sudah dikeluarkan yang seharusnya menentukan pilihan; gaji bulan berjalan bukan alasan untuk bertahan.' },
    survivorship: 'Tanyakan kepada orang yang pindah kerja lalu menyesal, dan kepada yang mencoba usaha sampingan tetapi tidak mendapat pelanggan.',
    ostrich: 'Saya mungkin menghindari melihat bahwa pekerjaan sekarang sudah mengganggu tidur dan suasana hati.',
    hastyGeneralisation: 'Penilaian tentang tempat kerja baru masih berdasarkan beberapa lowongan dan cerita dua teman; datanya belum cukup.',
    causation: 'Stres mungkin terkait pekerjaan, tetapi bisa juga dipengaruhi kondisi keluarga atau kesehatan lain; jangan menganggap pindah pasti menyelesaikannya.',
    falseComparison: 'Teman yang sukses pindah punya tabungan dan tanggungan berbeda; bandingkan gaji bersih, jam nyata, perjalanan, dan kebutuhan keluarga saya.',
  },
  predictions: [
    { claimId: 'salary-offer', text: 'Dalam 12 minggu saya mendapat setidaknya satu tawaran tertulis dengan kenaikan gaji bersih minimal 15%.', probability: 0.55 },
    { claimId: 'boundaries-trial', text: 'Jika menegosiasikan batas kerja, lembur saya turun menjadi paling banyak 5 jam per minggu selama 8 minggu.', probability: 0.6 },
    { claimId: 'side-income-test', text: 'Dalam 6 bulan, usaha sampingan mendapat minimal 3 pelanggan berbayar tanpa melebihi 6 jam per minggu.', probability: 0.35 },
  ],
  reviewAt: '2027-04-20',
  outcomes: {},
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const encoded = Buffer.from(JSON.stringify(decision), 'utf8').toString('base64url');
  console.log(`http://localhost:5199/#d=${encoded}`);
}