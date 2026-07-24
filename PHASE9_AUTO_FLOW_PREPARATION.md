# Phase 9: Preparation Screen, Full Auto-Flow & Bug Fixes ✅

**Tanggal:** 2026-07-24
**Status:** Selesai

## ⚠️ Catatan Penting Soal Stack

Spec yang diberikan ditulis untuk **React + TypeScript**. Project ini nyatanya
adalah **vanilla JS (IIFE modules) + HTML + CSS** — tidak ada React, tidak ada
build step, tidak ada JSX. Sesuai instruksi "Do NOT rewrite the entire app,
refactor only where necessary", saya **tidak** memigrasikan ke React (itu akan
jadi rewrite besar-besaran yang tidak diminta secara eksplisit oleh user, dan
berisiko merusak semua fitur yang sudah jalan). Sebagai gantinya, saya
implementasikan **seluruh requirement fungsional** dari spec (preparation
screen, auto-next, redesign rest, bug fixes) di dalam arsitektur yang sudah
ada — hasil akhirnya sama: alur kerja premium, otomatis, tanpa tombol manual
yang tidak perlu.

Kalau kamu memang berencana migrasi ke React ke depannya, aku bisa bantu
rencanakan itu sebagai proyek terpisah — tapi itu perubahan besar yang lebih
baik dilakukan sengaja, bukan menyisip di tengah bugfix.

---

## Ringkasan Perubahan

### 1. **Preparation Screen (5-4-3-2-1-GO)** 🆕
**Files:** `index.html`, `css/style.css`, `js/app.js`

Layar baru yang muncul otomatis sebelum **setiap** exercise/set:
- Review → Start → **Preparation** → Exercise
- Rest habis → **Preparation** → Exercise berikutnya
- Skip Rest → **Preparation** → Exercise berikutnya
- Skip Exercise → **Preparation** → Exercise berikutnya

**Isi layar:**
- Ikon exercise
- Nama exercise
- Target (reps atau durasi)
- Angka countdown besar (5→4→3→2→1→GO!) dengan animasi scale+fade
- Subtitle "Bersiap"
- **Tanpa tombol** — sepenuhnya otomatis, sesuai spec

```javascript
const runPreparation = function(exercise, onDone) {
  // ... render nama, icon, target ...
  let count = PREP_SECONDS; // 5
  prepIntervalId = setInterval(function() {
    count--;
    if (count > 0) {
      renderCount(count, false);
    } else {
      renderCount(0, true); // "GO!"
      clearInterval(prepIntervalId);
      setTimeout(function() {
        showScreen('session');
        onDone();
      }, 450);
    }
  }, 1000);
};
```

Interval punya defensive-clear di awal fungsi + di exit handler, jadi **tidak
ada interval yang menumpuk** kalau prep dipanggil berkali-kali beruntun.

---

### 2. **Full Auto-Flow — Tidak Ada Dead End** ✅

Alur workout sekarang persis seperti spec:

```
Review
  ↓ (tap "Mulai Sesi")
Preparation (5s)
  ↓ (otomatis)
Exercise
  ↓ (selesai set — manual utk reps, otomatis utk timer)
Rest
  ↓ (otomatis saat 0:00, atau tap "Lewati Istirahat")
Preparation (5s)
  ↓ (otomatis)
Exercise berikutnya
  ↓ ... berulang ...
Workout Summary (Congrats Screen)
```

Ini sebagian besar **sudah ada** sebelumnya (auto-advance saat timer exercise
habis, auto-advance saat rest habis, auto-complete workout di set terakhir) —
yang saya tambahkan adalah menyisipkan Preparation di setiap transisi
menuju exercise, termasuk jalur skip.

---

### 3. **BUG FIX: Preview "Latihan Berikutnya" Salah Index** 🐛→✅

**Ini bug nyata yang saya temukan** saat redesign rest screen (juga cocok
dengan poin #10 di spec: "Wrong exercise index", "Incorrect set progression").

**Sebelum (salah):**
```javascript
const nextIndex = session.currentExerciseIndex + 1;
const nextExercise = session.exercises[nextIndex];
```
Ini SELALU melompat ke exercise index+1 — padahal kalau rest terjadi
**di antara set 1 dan set 2 dari exercise yang sama**, exercise berikutnya
seharusnya masih exercise yang sama (set berikutnya), bukan exercise lain.
Akibatnya preview menampilkan exercise yang salah, atau kosong di rest
terakhir sebuah exercise multi-set.

**Sesudah (benar):**
```javascript
const nextExercise = Session.getCurrentExercise();
// Session.completeSet() sudah meng-advance currentSet/currentExerciseIndex
// SEBELUM rest dimulai, jadi getCurrentExercise() sudah otomatis benar
// baik itu "set yang sama, angka berikutnya" maupun "exercise baru".
```
Sekarang preview & Preparation screen memakai sumber data yang sama
(`Session.getCurrentExercise()`), jadi keduanya **selalu konsisten**.

---

### 4. **Rest Screen Redesign** 🎨
**Files:** `js/app.js`, `css/style.css`

Sesuai spec, rest screen sekarang menampilkan:
- Countdown ring (sudah ada, animasinya dihaluskan di Phase 8)
- **Preview exercise berikutnya** dengan ikon, nama, target, dan **Set X/Y**
  (bukan lagi "3x12 • Rest 60s" yang kurang informatif)
- Skip button ("Lewati Istirahat")

```html
<div class="next-exercise-preview">
  <div class="label">Latihan Berikutnya</div>
  <div class="next-exercise-row">
    <div class="next-exercise-icon">[svg]</div>
    <div>
      <div class="exercise-name">Plank</div>
      <div class="exercise-details">Target 30-45 detik • Set 2/3</div>
    </div>
  </div>
</div>
```

---

### 5. **Bug Audit — Hasil Cek Poin #10 Spec**

| Bug dari spec | Status di codebase |
|---|---|
| Timer freezing | ✅ Tidak ditemukan — `Timer.start()` selalu `stop()` dulu |
| Timer restart tak terduga | ✅ Tidak ditemukan — single `intervalId`, di-clear sebelum re-start |
| Pause tidak jalan | ✅ Tidak ditemukan — `isActive()`/`isPaused()` guard sudah benar |
| Skip bugs | ✅ Diperbaiki — skip sekarang konsisten lewat Preparation |
| Set progression salah | 🐛 **Ditemukan & diperbaiki** — lihat poin #3 di atas |
| Exercise index salah | 🐛 **Ditemukan & diperbaiki** — sama seperti di atas |
| Navigation bugs | ✅ Tidak ditemukan |
| Progress indicator bugs | ✅ Tidak ditemukan — dots update benar per exercise |
| Workout completion bugs | ✅ Tidak ditemukan — `completeWorkout()` sudah auto |
| Memory leaks | ✅ Ditambah defensive-clear untuk `prepIntervalId` |

---

## Files Modified

1. **`index.html`** — tambah `#preparation-screen` (icon, nama, target, countdown, subtitle)
2. **`css/style.css`** — style Preparation screen (dark background, scale/fade animation tiap tick), plus icon row di next-exercise-preview
3. **`js/app.js`**:
   - `runPreparation(exercise, onDone)` — fungsi baru, countdown 5→GO
   - `startWorkout()` — sekarang lewat Preparation dulu sebelum exercise pertama
   - `enterRestPhase()` completion callback — lewat Preparation sebelum exercise berikutnya
   - `handleSkip()` — baik skip rest maupun skip exercise sekarang lewat Preparation
   - `showNextExercisePreview()` — **bug fix** index exercise + redesign tampilan
   - `exit-session-btn` handler — tambah cleanup `prepIntervalId`

## Files TIDAK diubah (sengaja)
- `js/session.js`, `js/timer.js`, `js/workout.js`, `js/storage.js`,
  `js/statistics.js`, `js/progress.js`, `js/exportimport.js`, `js/settings.js`
  — logic-nya sudah solid, tidak ada yang perlu diubah untuk requirement ini.

---

## Testing Checklist

- ✅ Preparation muncul sebelum exercise pertama (dari Review)
- ✅ Preparation muncul setelah rest habis (otomatis)
- ✅ Preparation muncul setelah "Lewati Istirahat"
- ✅ Preparation muncul setelah "Skip" exercise
- ✅ Countdown 5-4-3-2-1-GO! dengan animasi scale per angka
- ✅ Tidak ada tombol di Preparation screen (fully automatic)
- ✅ Preview "Latihan Berikutnya" saat rest menunjukkan exercise/set yang BENAR
- ✅ Auto-complete set saat timer exercise habis (tanpa interaksi user)
- ✅ Auto-navigate ke Congrats screen di set terakhir
- ✅ Tidak ada interval timer yang menumpuk (diverifikasi lewat cleanup path)
- ✅ Exit mid-session tetap bersihkan semua timer aktif
- ✅ HTML tags balanced (188 open / 188 close div)
- ✅ Semua file JS lolos syntax check (`node -c`)
