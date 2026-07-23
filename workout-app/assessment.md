# Assessment Workout Personal App

**Tanggal Review:** Senin, 20 Juli 2026

---

## 1. Yang Sudah Dibuat

| File | Status |
|---|---|
| index.html | Struktur dasar sudah ada: heading, container jadwal mingguan, sesi hari ini, tombol start |
| css/style.css | Dark theme dasar, styling untuk schedule, day cards, dan button |
| js/storage.js | Module IIFE bersih, CRUD LocalStorage dengan prefix workout_, error handling baik |
| js/timer.js | Kerangka IIFE sudah ada, tapi semua method masih TODO |
| js/progress.js | getWeeklySummary() sudah ada logikanya, tapi method lain masih TODO |
| js/workout.js | Data 20 latihan sudah lengkap sesuai PRD (5 hari), state session, save/load localStorage |
| js/app.js | Module IIFE dengan routing, greeting, renderHome yang cukup detail |
| app.js (root) | File kosong |

---

## 2. Yang Belum Sesuai PRD

- Data latihan di workout.js menggunakan format reps untuk semua jenis (termasuk durasi seperti "30-45 detik"). PRD memisahkan antara repetisi dan durasi. Seharusnya ada field duration terpisah.
- index.html tidak memiliki elemen navigasi (tab/bar navigasi antara Home, Session, Progress, Settings) padahal js/app.js sudah punya logika navigasi dengan .nav-btn.
- index.html tidak memiliki div#app-container padahal js/app.js me-render semua konten ke #app-container.
- Tidak ada halaman Session. PRD mensyaratkan mode latihan dengan timer istirahat otomatis, tombol Tandai Selesai per gerakan dan per sesi.
- Tidak ada halaman Progress. PRD mensyaratkan log berat badan, catatan subjektif, riwayat sesi, ringkasan mingguan.
- Tidak ada halaman Settings (Phase 7 roadmap).
- Reschedule (geser hari latihan) belum ada. PRD 4.1 menyebutkan fitur ini.

---

## 3. Error / Inkonsistensi

### KRITIS - Akan crash saat dijalankan:

1. exercises tidak terdefinisi - workout.js menggunakan variabel exercises di completeCurrentExercise(), getCurrentExercise(), isSessionComplete(), padahal data bernama workoutData. ReferenceError. (js/workout.js baris ~55-75)

2. #app-container tidak ada di HTML - js/app.js melakukan document.getElementById(app-container) lalu .innerHTML = html, tapi index.html tidak punya elemen tersebut. TypeError null.innerHTML. (js/app.js baris ~95)

3. Workout module tidak ada - js/app.js memanggil Workout.getTodayWorkout() dan Workout.getCurrentDayOfWeek(), tapi js/workout.js tidak membungkus kode dalam module Workout dan tidak mengekspor method tersebut. (js/app.js vs js/workout.js)

4. Script tidak di-load semua - index.html hanya memuat js/app.js, tapi tidak memuat js/storage.js, js/workout.js, js/progress.js, js/timer.js. Module-module tersebut tidak akan tersedia. (index.html)

### INKONSISTENSI - Tidak crash tapi bermasalah:

5. Pola module tidak konsisten - app.js, storage.js, timer.js, progress.js menggunakan IIFE module pattern. Tapi workout.js menggunakan global functions/variables biasa. (Arsitektur)

6. workout.js tidak pakai Storage module - Langsung pakai localStorage.setItem/getItem padahal sudah ada Storage wrapper di storage.js. (Duplikasi)

7. app.js kosong di root - File app.js di root tidak digunakan (yang dipakai js/app.js). Membingungkan. (Struktur file)

8. index.html vs js/app.js mismatch - HTML punya #weekly-schedule, #today-session, #start-btn, tapi JS me-render ke #app-container dengan HTML yang sama sekali berbeda. Ada 2 pendekatan yang bertabrakan. (HTML vs JS)

---

## 4. Prioritas Perbaikan

### Prioritas 1 - KRITIS (app tidak bisa jalan):

1. Tambahkan semua script tag di index.html (storage -> workout -> progress -> timer -> app) dengan urutan yang benar
2. Fix workout.js - ganti semua exercises -> workoutData, atau buat variabel alias
3. Fix #app-container - tambahkan div ini di index.html, ATAU ubah js/app.js agar render ke elemen yang sudah ada (#weekly-schedule, #today-session)
4. Buat Workout module - bungkus workout.js dalam IIFE pattern yang mengekspor getTodayWorkout(), getCurrentDayOfWeek(), dll.

### Prioritas 2 - KONSISTENSI:

5. Samakan pola module - refactor workout.js ke IIFE pattern seperti module lainnya
6. Gunakan Storage module di workout.js - hapus akses localStorage langsung
7. Hapus app.js kosong di root - membingungkan
8. Rekonsiliasi index.html dengan js/app.js - tentukan: apakah render via JS (SPA-style ke #app-container) atau manipulasi DOM langsung ke elemen yang sudah ada di HTML?

### Prioritas 3 - FITUR (sesuai roadmap):

9. Implementasi Timer module (Phase 4)
10. Implementasi Progress module yang sebenarnya (Phase 5-6)
11. Tambahkan navigasi bottom bar di HTML
12. Data latihan: pisahkan field reps dan duration sesuai PRD

---

## Catatan Tambahan

- Proyek sudah melewati Phase 1-5 berdasarkan struktur file yang ada
- Arsitektur modular sudah baik, tapi perlu konsistensi
- Dark theme sudah diimplementasikan dengan baik
- Data latihan sudah lengkap sesuai PRD (20 gerakan untuk 5 hari)
- Perlu keputusan: SPA-style rendering atau DOM manipulation langsung?

---

**Status:** Menunggu instruksi untuk perbaikan Prioritas 1
