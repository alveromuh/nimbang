# Kritik Repository Nimbang

**Basis review:** branch `main`, commit `f367207` (`docs: clarify LLM gateway configuration`). Ini review kode dan dokumentasi pada snapshot tersebut, bukan audit keamanan formal atau evaluasi empiris metode keputusan.

## Ringkasan

Fondasi teknis repo cukup rapi: core dipisahkan dari UI, validasi skema digunakan untuk data tersimpan dan tautan, dan suite tes berjalan. Verifikasi lokal pada snapshot ini: **261 tes lulus (29 file); `pnpm build` berhasil**.

Risiko terbesar ada pada keandalan alur data dan interpretasi skor. Sebagian aturan yang dijanjikan framework belum ditegakkan oleh alur aplikasi, dan rumus skor berpotensi bertentangan dengan klaim bahwa jumlah item tidak menguntungkan opsi.

## Temuan

### Tinggi — Tautan keputusan bersama dapat kehilangan data saat penyimpanan gagal

**Lokasi:** `src/ui/App.tsx`, inisialisasi `sharedDecisionFromUrl()`.

Keputusan dari fragment URL disimpan melalui `saveDecision(shared)`, tetapi nilai baliknya tidak diperiksa. Fragment kemudian dihapus dari URL. Jika `localStorage` gagal menulis, data pada tautan sudah dibuang dari alamat dan tidak tersimpan di library. Pengguna dapat kehilangan keputusan tanpa pemberitahuan. Alur membuat keputusan baru juga tidak memeriksa kegagalan `saveDecision`.

**Saran:** Pertahankan fragment sampai penyimpanan berhasil, atau tampilkan data hasil impor dalam state sementara dengan peringatan dan opsi ekspor/coba lagi. Periksa dan tangani kegagalan simpan saat membuat keputusan baru juga. Tambahkan tes untuk storage yang melempar saat `setItem`.

### Tinggi — Rumus skor tidak menjamin jumlah item netral terhadap hasil

**Lokasi:** `src/core/score.ts`; klaim terkait ada di komentar fungsi dan `docs/core-engine-scope.md` bagian E5.

Skor menormalisasi setiap item terhadap minimum dan maksimum semua item pada tujuan, lalu menjumlahkan kontribusi item. Jika satu opsi memiliki beberapa item manfaat, kontribusinya dapat dijumlah beberapa kali. Dengan demikian, normalisasi ini tidak dengan sendirinya menjamin bahwa opsi tidak diuntungkan oleh banyaknya item yang dicatat. Selain itu, min–max per tujuan pada kumpulan item membuat hasil dipengaruhi oleh item mana yang dicatat dan dapat mengubah kontribusi ketika data ditambah.

**Saran:** Putuskan unit evaluasi yang dimaksud: satu nilai agregat per opsi-tujuan, atau beberapa atribut dengan metode agregasi/skalanya yang dinyatakan. Pastikan setiap atribut tidak menggandakan bobot tujuan tanpa sengaja. Buat tes pembanding: keputusan yang sama dengan satu item versus item yang dipecah/ditambah harus berperilaku sesuai aturan yang dipilih. Revisi klaim dokumentasi jika jaminan tersebut memang tidak dimaksudkan.

### Tinggi — Validasi Tag dan kelas referensi belum menjadi syarat alur pengguna

**Lokasi:** `src/core/tag.ts`, `src/core/probabilify.ts`, `src/ui/DecisionWorkspace.tsx`, `src/ui/ItemEditor.tsx`.

Validator untuk klaim fakta/preferensi dan probabilitas tanpa reference class tersedia di core. Namun workspace menghitung hasil berdasarkan frame, diverge, gate, dan bobot; validasi Tag/Probabilify tidak dipanggil di jalur hasil itu. UI juga tidak menyediakan editor klaim, dan `referenceClass` boleh kosong. Jadi aturan framework yang menyatakan setiap fakta perlu sumber dan setiap probabilitas perlu kelas pembanding belum ditegakkan saat keputusan dipakai.

**Saran:** Tentukan apakah aturan tersebut wajib untuk memperoleh hasil atau hanya anjuran. Jika wajib, sediakan UI untuk melengkapi klaim, panggil validator pada transisi yang tepat, dan tampilkan kesalahan per item/claim. Jika tidak wajib, ubah kata-kata “harus” pada framework agar sesuai dengan perilaku produk.

### Sedang — Hasil dapat muncul ketika matriks penilaian masih kosong atau parsial

**Lokasi:** `src/ui/DecisionWorkspace.tsx`, kalkulasi `result`; `src/core/score.ts`.

Validasi diverge memastikan jumlah opsi, baseline, dan label, tetapi tidak mewajibkan setiap pasangan opsi–tujuan memiliki penilaian. Item yang tidak ada tidak ikut perhitungan. Akibatnya skor dapat tampil meskipun sebagian opsi belum dinilai, dan pengguna mungkin mengartikan kekosongan sebagai hasil netral atau nol.

**Saran:** Tampilkan cakupan matriks dengan jelas (misalnya jumlah sel terisi dari total), dan jangan tampilkan rekomendasi sebagai hasil lengkap sebelum aturan kelengkapan yang dipilih terpenuhi. Bila sel kosong memang sengaja berarti “tidak ada dampak”, nyatakan itu eksplisit dan sediakan cara membedakannya dari “belum dinilai”.

### Sedang — Presisi angka berisiko memberi kesan kepastian berlebihan

**Lokasi:** `src/ui/Result.tsx`; logika normalisasi di `src/core/score.ts`.

Hasil menampilkan skor dan margin hingga tiga desimal, sementara nilai masukan bersifat subjektif dan berskala 1–5. Normalisasi min–max juga membuat hasil bergantung pada opsi dan item yang dimasukkan. Angka presisi bukan bukti bahwa masukan atau kesimpulannya presisi.

**Saran:** Jelaskan skala dan asumsi di dekat hasil, bedakan hasil hitung dari kepastian, dan prioritaskan interpretasi sensitivitas/ketidakpastian daripada presisi desimal. Uji dengan contoh yang mencerminkan data parsial, nilai ekstrem, dan perubahan kumpulan opsi.

### Sedang — Bias gate bisa menjadi checklist pengisian, bukan pemeriksaan substantif

**Lokasi:** `src/core/gate.ts`, `src/ui/GatePanel.tsx`.

Gate terutama menilai apakah teks sudah diisi. Jawaban yang sangat dangkal tetap dapat memenuhi gate, lalu hasil skor ditampilkan. Ini mungkin sesuai jika gate hanya dimaksudkan sebagai refleksi wajib, tetapi antarmuka dapat memberi kesan bahwa bias telah “diatasi” setelah kolom terisi.

**Saran:** Jelaskan bahwa gate adalah prompt refleksi, bukan deteksi atau penghapusan bias. Pertimbangkan meminta bukti/contoh konkret pada pertanyaan yang relevan, tanpa mengklaim sistem dapat memvalidasi kualitas introspeksi secara objektif.

## Yang sudah baik

- `src/core/` relatif mandiri dan diuji tanpa bergantung pada UI.
- Penyimpanan draft menangani JSON rusak dan storage yang tidak tersedia tanpa crash; kegagalan simpan saat edit juga dapat ditampilkan.
- Panel AI dibatasi pada tugas terstruktur, hasil usulan perlu persetujuan pengguna, dan model tidak menerima skor/bobot untuk membuat keputusan.
- Dokumentasi berusaha memisahkan sumber primer, keputusan desain, dan batas metode; beberapa keterbatasan metodologi dinyatakan secara terbuka.
- Tes dan build berhasil pada snapshot yang direview.

## Urutan prioritas yang disarankan

1. Tangani kegagalan penyimpanan pada impor link dan pembuatan keputusan baru agar tidak ada kehilangan data diam-diam.
2. Tetapkan aturan agregasi skor yang benar-benar dimaksud, lalu selaraskan kode, contoh, dan klaim dokumentasi.
3. Tegaskan aturan Tag/reference class: wajib di alur produk atau opsional di framework, kemudian sesuaikan implementasinya.
4. Perjelas status data yang belum lengkap dan bagaimana hasil harus ditafsirkan.
5. Tambahkan uji skenario produk end-to-end di samping unit test rumus.

## Batas review

Ini review snapshot `main` yang berhasil di-clone, bukan review seluruh riwayat commit, deployment publik, atau pengujian pengguna. Saya menjalankan tes dan build lokal; saya tidak menguji layanan gateway eksternal maupun melakukan validasi empiris bahwa skor mencerminkan preferensi pengguna secara konsisten.
