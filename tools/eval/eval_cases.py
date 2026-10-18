"""Evaluation cases for /v1/systemone as a decision-extraction layer.

Ground truth is chosen to be defensible: each case has one reading a careful
human would agree on. Where a case is genuinely ambiguous, it is marked
`ambiguous: True` and excluded from the accuracy score but kept in the run so
we can see how the model handles it.
"""

# tipe_keputusan ground truth:
#   pilih_opsi | ya_tidak | prioritas | alokasi | beli_info | belum_jelas
CASES = [
    {
        "id": "c01",
        "state": "Aku mau ambil S2 di luar negeri atau kerja dulu di Jakarta. "
                 "S2 butuh 2 tahun dan biaya 400 juta, kerja langsung dapat 15 juta per bulan.",
        "tipe": "pilih_opsi",
        "tujuan": True,
        "kejelasan_min": 2,
    },
    {
        "id": "c02",
        "state": "Mau beli mobil. Ada tiga pilihan: Avanza 250 juta, Xpander 280 juta, "
                 "atau Innova bekas 230 juta. Semua untuk keluarga 5 orang.",
        "tipe": "pilih_opsi",
        "tujuan": True,
        "kejelasan_min": 2,
    },
    {
        "id": "c03",
        "state": "Apakah aku harus resign bulan depan?",
        "tipe": "ya_tidak",
        "tujuan": False,
        "kejelasan_min": 0,
    },
    {
        "id": "c04",
        "state": "Haruskah saya ikut bootcamp data science 8 minggu yang biayanya 12 juta?",
        "tipe": "ya_tidak",
        "tujuan": False,
        "kejelasan_min": 1,
    },
    {
        "id": "c05",
        "state": "Aku punya 6 proyek di kantor dan cuma bisa fokus 2 bulan ini: "
                 "migrasi database, redesign landing page, audit keamanan, "
                 "integrasi payment, dokumentasi API, dan training tim baru.",
        "tipe": "prioritas",
        "tujuan": True,
        "kejelasan_min": 2,
    },
    {
        "id": "c06",
        "state": "Ada 5 tawaran freelance masuk, waktuku cuma cukup untuk 2. "
                 "Mana yang aku ambil?",
        "tipe": "prioritas",
        "tujuan": True,
        "kejelasan_min": 1,
    },
    {
        "id": "c07",
        "state": "Gaji 10 juta per bulan. Bingung membaginya untuk tabungan, "
                 "cicilan rumah, dan biaya hidup.",
        "tipe": "alokasi",
        "tujuan": True,
        "kejelasan_min": 2,
    },
    {
        "id": "c08",
        "state": "Budget marketing 50 juta untuk kuartal ini. Harus dibagi ke "
                 "iklan digital, event, dan konten.",
        "tipe": "alokasi",
        "tujuan": True,
        "kejelasan_min": 2,
    },
    {
        "id": "c09",
        "state": "Aku mau beli laptop bekas tapi belum tahu harga pasarnya. "
                 "Perlu survey dulu atau langsung beli saja?",
        "tipe": "beli_info",
        "tujuan": True,
        "kejelasan_min": 1,
    },
    {
        "id": "c10",
        "state": "Sebelum tanda tangan kontrak 3 tahun, apakah worth it "
                 "menyewa konsultan hukum dulu?",
        "tipe": "beli_info",
        "tujuan": True,
        "kejelasan_min": 1,
    },
    {
        "id": "c11",
        "state": "Aku bingung hidupku mau ke mana. Rasanya stuck.",
        "tipe": "belum_jelas",
        "tujuan": False,
        "kejelasan_min": 0,
    },
    {
        "id": "c12",
        "state": "Harus pindah kerja atau tidak?",
        "tipe": "ya_tidak",
        "tujuan": False,
        "kejelasan_min": 0,
    },
    {
        "id": "c13",
        "state": "Aku bingung mau pindah kerja apa nggak. Gaji sekarang 12 juta, "
                 "tapi bosnya nyebelin dan nggak ada jenjang karier. Ada tawaran 15 juta "
                 "di perusahaan lain, tapi harus pindah ke Surabaya dan ninggalin keluarga. "
                 "Aku juga lagi mikir buka usaha kecil-kecilan di samping kerja.",
        "tipe": "pilih_opsi",
        "tujuan": False,
        "kejelasan_min": 2,
    },
    {
        "id": "c14",
        "state": "Pilih karier di Jakarta atau balik ke kampung buat jaga orang tua?",
        "tipe": "pilih_opsi",
        "tujuan": True,
        "kejelasan_min": 1,
    },
    {
        "id": "c15",
        "state": "Dari 12 fitur yang diminta user, mana 3 yang harus dibangun "
                 "di sprint berikutnya?",
        "tipe": "prioritas",
        "tujuan": True,
        "kejelasan_min": 1,
    },
    {
        "id": "c16",
        "state": "Mau sewa kantor 30 juta setahun atau tetap WFH?",
        "tipe": "pilih_opsi",
        "tujuan": True,
        "kejelasan_min": 1,
    },
    {
        "id": "c17",
        "state": "Haruskah aku mengambil pinjaman 200 juta untuk renovasi rumah? "
                 "Bunga 11 persen per tahun, tenor 5 tahun.",
        "tipe": "ya_tidak",
        "tujuan": True,
        "kejelasan_min": 1,
    },
    {
        "id": "c18",
        "state": "Tim marketing 4 orang. Harus dibagi ke 3 kanal: sosmed, "
                 "performance ads, dan partnership.",
        "tipe": "alokasi",
        "tujuan": True,
        "kejelasan_min": 2,
    },
    {
        "id": "c19",
        "state": "Investasi 100 juta: deposito, reksadana pasar uang, atau SBN ritel?",
        "tipe": "pilih_opsi",
        "tujuan": True,
        "kejelasan_min": 2,
    },
    {
        "id": "c20",
        "state": "Apa yang harus aku lakukan?",
        "tipe": "belum_jelas",
        "tujuan": False,
        "kejelasan_min": 0,
    },
]

QUESTIONS = {
    "tipe_keputusan": {
        "type": "choice",
        "instructions": "What shape of decision is the person actually facing?",
        "criteria": {
            "pilih_opsi": "Choosing among several named alternatives",
            "ya_tidak": "A single yes or no on one proposal",
            "prioritas": "Ranking or selecting a subset under limited capacity",
            "alokasi": "Dividing a fixed resource among uses",
            "beli_info": "Deciding whether to gather information before deciding",
            "belum_jelas": "No decision stated yet; only a feeling or an open question",
        },
    },
    "punya_tujuan": {
        "type": "noul",
        "instructions": "Does the text state a concrete objective the person wants to reach?",
        "criteria": {
            "true": "A goal, constraint, or desired outcome is stated",
            "false": "Only options, complaints, or feelings; no stated objective",
        },
    },
    "kejelasan": {
        "type": "score",
        "instructions": "How ready is this to be scored in a cost-benefit model?",
        "criteria": [
            "Nothing to score: no options and no criteria",
            "One dimension only: options named but no criteria, or criteria with no options",
            "Options and rough criteria, no numbers",
            "Options with criteria and some numbers",
            "Fully specified and ready to score",
        ],
    },
}
