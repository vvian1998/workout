# Phase 10: Quick Wins ✅

**Tanggal:** 2026-07-24
**Status:** Selesai

## Ringkasan

Implementasi 4 quick wins yang direkomendasikan sebelumnya, semua di `js/app.js`, `index.html`, `css/style.css`.

---

### 1. **Wake Lock API** 🔓
Layar tidak lagi mati sendiri di tengah workout (masalah paling menyebalkan
saat plank 45 detik terus HP terkunci).

```javascript
const requestWakeLock = function() {
  if (!('wakeLock' in navigator)) return;
  navigator.wakeLock.request('screen').then(function(lock) {
    wakeLock = lock;
    wakeLock.addEventListener('release', function() { wakeLock = null; });
  }).catch(function() { wakeLock = null; }); // gagal = non-fatal, fallback normal
};
```

- Diminta saat `startWorkout()` dipanggil (awal sesi)
- Dilepas saat `finishWorkoutFlow()` (workout selesai) dan saat tombol
  **Keluar** ditekan
- **Auto re-acquire**: browser otomatis melepas wake lock kalau tab/app
  di-background-kan. Ditambahkan listener `visibilitychange` yang
  meminta ulang begitu user kembali ke app, selama sesi masih berjalan
  (`Session.getCurrent()` masih ada)
- Fitur ini tidak didukung semua browser lama — di-guard dengan feature
  check, jadi aman kalau tidak tersedia (fallback: perilaku normal seperti
  sebelumnya)

---

### 2. **Voice Announcement Nama Exercise** 🔊
Begitu Preparation screen muncul, sistem otomatis mengucapkan nama exercise:

> *"Push-up, bersiap"*

```javascript
const announceExercise = function(exercise) {
  // ... cek setting timerSound ...
  const utterance = new SpeechSynthesisUtterance(exercise.name + ', bersiap');
  utterance.lang = 'id-ID';
  window.speechSynthesis.speak(utterance);
};
```

- Menghormati setting **Suara Timer** di halaman Settings (kalau di-off,
  tidak bicara)
- Dibatalkan (`speechSynthesis.cancel()`) kalau Preparation di-skip lebih
  cepat dari suara selesai, supaya tidak nyambung ke fase berikutnya

---

### 3. **Vibration Pattern GO! Lebih Tegas** 📳
Sebelumnya tick biasa dan "GO!" cuma beda panjang getar tipis. Sekarang:

| Event | Pattern |
|---|---|
| Tick biasa (5,4,3,2,1) | getar pendek `35ms` |
| **GO!** | getar-jeda-getar-jeda-getar panjang `[70,40,70,40,160]` — terasa jelas berbeda tanpa lihat layar |

Sekaligus **bug kecil diperbaiki**: fungsi ini sebelumnya mengecek setting
`timerSound` padahal isinya getaran — sekarang benar mengecek setting
**Getaran** di Settings.

---

### 4. **Tap-to-Skip Preparation** 👆
Preparation screen sekarang bisa di-tap (di mana saja di layar) untuk
langsung lompat ke exercise, tanpa perlu menunggu countdown 5 detik penuh.

- **Tidak menambah tombol** — seluruh area layar jadi "tombol" (cursor
  pointer), plus hint kecil di bawah: *"Ketuk layar untuk lewati"*
- Aman dari double-trigger: dijaga dengan flag `prepActive`, jadi kalau
  countdown natural selesai (masuk fase "GO!" 450ms) barengan dengan tap
  user, tidak terjadi pemanggilan `onDone()` dua kali
- Membatalkan voice announcement yang sedang jalan saat di-skip

```javascript
const handlePrepTap = function() {
  if (!prepActive) return;
  finishPreparation(); // clear interval, cancel speech, lanjut ke exercise
};
```

---

## Files Modified

1. **`js/app.js`**
   - `requestWakeLock()` / `releaseWakeLock()` — baru
   - `startWorkout()` — panggil `requestWakeLock()`
   - `finishWorkoutFlow()` — panggil `releaseWakeLock()`
   - `exit-session-btn` handler — cleanup wake lock + prep state
   - `runPreparation()` — refactor pakai `prepActive`/`prepOnDone`, panggil `announceExercise()`
   - `finishPreparation()` — baru, single exit point (natural selesai ATAU tap-skip)
   - `handlePrepTap()` — baru
   - `announceExercise()` — baru
   - `playPrepTick()` — pattern GO! diperkuat + bug fix (cek setting `vibration`, bukan `timerSound`)
   - `visibilitychange` listener — baru, re-acquire wake lock

2. **`index.html`**
   - Tambah `<div class="prep-skip-hint">Ketuk layar untuk lewati</div>` di Preparation screen

3. **`css/style.css`**
   - `.preparation-screen` — tambah `cursor: pointer`
   - `.prep-skip-hint` — style baru (kecil, muted, subtle)

---

## Testing Checklist

- ✅ Wake lock diminta saat workout dimulai (cek: layar tidak mati sendiri saat idle di tengah sesi)
- ✅ Wake lock dilepas saat workout selesai / exit
- ✅ Wake lock diminta ulang otomatis setelah app di-background lalu kembali
- ✅ Voice mengucapkan nama exercise saat Preparation muncul
- ✅ Voice tidak bicara kalau setting "Suara Timer" off
- ✅ Voice dibatalkan kalau Preparation di-skip
- ✅ Vibration GO! terasa beda dari tick biasa
- ✅ Vibration menghormati setting "Getaran" (bukan lagi salah cek "Suara Timer")
- ✅ Tap di mana saja pada Preparation screen langsung lanjut ke exercise
- ✅ Tidak ada double-call `onDone()` kalau tap terjadi persis saat countdown natural selesai
- ✅ HTML balanced (189 open / 189 close div)
- ✅ `node -c js/app.js` lolos syntax check

## Browser Compatibility Notes

- **Wake Lock API**: Chrome/Edge/Opera Android & Desktop ✅, Safari iOS 16.4+ ✅, fallback aman di browser lama (fitur di-skip diam-diam)
- **Speech Synthesis**: didukung luas, fallback diam-diam kalau tidak tersedia
- **Vibration API**: mobile only (tidak ada efek di desktop, tidak error)
