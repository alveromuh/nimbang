import type { Decision } from '../src/core/types.ts';

/**
 * Worked decision: moving to a smaller city to trade salary for rent, commute,
 * and time at home.
 *
 * Written for the current schema, so it exercises what the product now enforces:
 *
 * - Two named attributes on the money objective. Salary and cost of living are
 *   different dimensions of "money", and scoring them as one column would hide
 *   which of the two moved the answer.
 * - Exactly one assessment per option-and-attribute cell. The engine rejects a
 *   second item on the same cell, because that would let an option gain by being
 *   written down twice.
 * - A reference class on every probability, so the recommendation is not
 *   withheld.
 * - Claims on both sides of the fact/preference line, each tagged.
 *
 * The inputs are illustrative, not advice. Replace them with your own evidence.
 */
export const decision: Decision = {
  id: 'contoh-pindah-kota-kecil',
  title: 'Pindah ke kota lebih kecil demi biaya hidup dan waktu bersama',
  objectives: [
    {
      id: 'money',
      statement: 'Sisa uang tiap bulan setelah semua pengeluaran',
      kind: 'hygiene',
      attributes: [
        { id: 'money-pay', name: 'Gaji bersih' },
        { id: 'money-cost', name: 'Biaya hidup' },
      ],
    },
    {
      id: 'time',
      statement: 'Waktu dan tenaga yang tersisa untuk keluarga setiap hari',
      kind: 'motivation',
      attributes: [{ id: 'time-hours', name: 'Jam dengan keluarga' }],
    },
    {
      id: 'work',
      statement: 'Pilihan kerja yang tersedia dan kemungkinan berkembang',
      kind: 'motivation',
      attributes: [{ id: 'work-options', name: 'Peluang kerja' }],
    },
  ],
  options: [
    { id: 'stay', label: 'Tetap di kota sekarang tanpa perubahan', isBaseline: true },
    { id: 'remote', label: 'Pindah, tetapi negosiasikan kerja remote dari kota baru', isBaseline: false },
    { id: 'move', label: 'Pindah dan cari kerja lokal di kota baru', isBaseline: false },
    { id: 'rent', label: 'Tetap, tetapi pindah ke kontrakan lebih murah dan lebih dekat kantor', isBaseline: false },
  ],
  items: [
    // stay
    { id: 'stay-pay', optionId: 'stay', objectiveId: 'money', attributeId: 'money-pay', kind: 'benefit', value: 4, probability: 1, risk: 'ordinary', referenceClass: 'Gaji berjalan sekarang, tetap selama dua tahun; tidak ada kenaikan yang dijanjikan.' },
    { id: 'stay-cost', optionId: 'stay', objectiveId: 'money', attributeId: 'money-cost', kind: 'cost', value: 5, probability: 1, risk: 'ordinary', referenceClass: 'Rekap pengeluaran tiga bulan terakhir: sewa, transport, dan makan di luar.' },
    { id: 'stay-hours', optionId: 'stay', objectiveId: 'time', attributeId: 'time-hours', kind: 'cost', value: 5, probability: 1, risk: 'ordinary', referenceClass: 'Perjalanan pulang-pergi 100 menit, lima hari seminggu, dari catatan masuk kantor.' },
    { id: 'stay-options', optionId: 'stay', objectiveId: 'work', attributeId: 'work-options', kind: 'benefit', value: 4, probability: 0.85, risk: 'ordinary', referenceClass: 'Tiga lowongan setara dibuka di kota ini dalam enam bulan terakhir; jaringan sudah terbentuk.' },

    // remote
    { id: 'remote-pay', optionId: 'remote', objectiveId: 'money', attributeId: 'money-pay', kind: 'benefit', value: 4, probability: 0.7, risk: 'ordinary', referenceClass: 'Perusahaan mengizinkan remote tiga hari; gaji penuh hanya jika atasan menyetujui secara tertulis.' },
    { id: 'remote-cost', optionId: 'remote', objectiveId: 'money', attributeId: 'money-cost', kind: 'cost', value: 2, probability: 0.9, risk: 'ordinary', referenceClass: 'Sewa di kota tujuan sekitar 45% lebih murah menurut lima iklan yang masih aktif bulan ini.' },
    { id: 'remote-hours', optionId: 'remote', objectiveId: 'time', attributeId: 'time-hours', kind: 'benefit', value: 4, probability: 0.8, risk: 'ordinary', referenceClass: 'Hilangnya perjalanan harian menambah sekitar 90 menit, dikurangi rapat daring di malam hari.' },
    { id: 'remote-options', optionId: 'remote', objectiveId: 'work', attributeId: 'work-options', kind: 'cost', value: 3, probability: 0.6, risk: 'ordinary', referenceClass: 'Di kota baru hanya ada dua perusahaan sejenis; kalau remote dicabut, pilihan menyempit.' },

    // move
    { id: 'move-pay', optionId: 'move', objectiveId: 'money', attributeId: 'money-pay', kind: 'cost', value: 3, probability: 0.75, risk: 'ordinary', referenceClass: 'Delapan lowongan lokal: 20–30% di bawah gaji sekarang; angka pasti baru setelah tawaran tertulis.' },
    { id: 'move-cost', optionId: 'move', objectiveId: 'money', attributeId: 'money-cost', kind: 'cost', value: 2, probability: 0.9, risk: 'ordinary', referenceClass: 'Sewa dan transport turun sekitar 40%; biaya naik untuk kunjungan keluarga empat kali setahun.' },
    { id: 'move-hours', optionId: 'move', objectiveId: 'time', attributeId: 'time-hours', kind: 'benefit', value: 5, probability: 0.85, risk: 'ordinary', referenceClass: 'Perjalanan 15 menit, berdasarkan rute yang sudah dicoba pada jam sibuk.' },
    { id: 'move-options', optionId: 'move', objectiveId: 'work', attributeId: 'work-options', kind: 'cost', value: 4, probability: 0.8, risk: 'ordinary', referenceClass: 'Industri ini terkonsentrasi di kota besar; di kota tujuan hanya dua pemberi kerja relevan.' },

    // rent
    { id: 'rent-pay', optionId: 'rent', objectiveId: 'money', attributeId: 'money-pay', kind: 'benefit', value: 4, probability: 1, risk: 'ordinary', referenceClass: 'Gaji tidak berubah; tidak ada biaya pindah kerja, hanya biaya pindahan sekali.' },
    { id: 'rent-cost', optionId: 'rent', objectiveId: 'money', attributeId: 'money-cost', kind: 'cost', value: 3, probability: 0.95, risk: 'ordinary', referenceClass: 'Kontrakan lebih murah 25% menurut empat iklan yang sudah dikunjungi; pindahan sekitar satu bulan sewa.' },
    { id: 'rent-hours', optionId: 'rent', objectiveId: 'time', attributeId: 'time-hours', kind: 'benefit', value: 3, probability: 0.9, risk: 'ordinary', referenceClass: 'Perjalanan turun dari 100 menjadi sekitar 50 menit, dihitung dari rute alternatif.' },
    { id: 'rent-options', optionId: 'rent', objectiveId: 'work', attributeId: 'work-options', kind: 'benefit', value: 4, probability: 0.85, risk: 'ordinary', referenceClass: 'Jaringan kerja tetap utuh; tidak ada perubahan pemberi kerja.' },
  ],
  claims: [
    {
      id: 'rent-actual',
      text: 'Sewa kontrakan sekarang Rp 4,5 juta per bulan.',
      domain: 'fact',
      source: 'Surat perjanjian sewa yang sedang berjalan',
    },
    {
      id: 'family-evening',
      text: 'Saya ingin bisa makan malam bersama anak setiap hari kerja.',
      domain: 'preference',
      owner: 'Saya dan pasangan',
    },
    {
      id: 'commute-cost',
      text: 'Biaya transportasi bulanan sekitar Rp 900 ribu.',
      domain: 'fact',
      source: 'Mutasi rekening tiga bulan terakhir',
    },
  ],
  swingPoints: { money: 100, time: 90, work: 55 },
  gate: {
    sunkCost: {
      amount: 12000000,
      note: 'Biaya renovasi dapur tahun lalu. Tidak dipakai menimbang, karena uangnya sudah keluar apa pun yang dipilih.',
    },
    survivorship:
      'Saya belum bicara dengan orang yang pindah ke kota kecil lalu kesulitan mendapat kerja lagi. Itu yang perlu dicari.',
    ostrich:
      'Saya menghindari memeriksa apakah gaji lokal benar-benar cukup, karena takut jawabannya membatalkan rencana yang sudah saya ceritakan.',
    hastyGeneralisation:
      'Penilaian tentang kota tujuan baru berdasar dua kunjungan dan tiga artikel. Belum ada data biaya hidup yang sistematis.',
    causation:
      'Perjalanan panjang bertepatan dengan rasa lelah, tetapi bisa juga karena jam tidur yang kurang. Pindah belum tentu menyelesaikannya.',
    falseComparison:
      'Teman yang pindah lebih dulu belum punya anak dan bisa kerja remote penuh. Kondisi saya berbeda.',
  },
  predictions: [
    {
      claimId: 'remote-approved',
      text: 'Dalam 8 minggu ada persetujuan tertulis untuk kerja remote tiga hari per minggu.',
      probability: 0.45,
    },
    {
      claimId: 'budget-holds',
      text: 'Dalam 3 bulan pertama, sisa uang bulanan di kota baru minimal sama dengan sekarang.',
      probability: 0.4,
    },
    {
      claimId: 'local-offer',
      text: 'Dalam 6 bulan ada tawaran kerja lokal dengan gaji paling banyak 20% di bawah gaji sekarang.',
      probability: 0.35,
    },
  ],
  reviewAt: '2027-06-01',
  outcomes: {},
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const encoded = Buffer.from(JSON.stringify(decision), 'utf8').toString('base64url');
  console.log(`http://localhost:5199/#d=${encoded}`);
}
