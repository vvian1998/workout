const App = (function() {
  'use strict';

  let currentScreen = 'home';

  const ICONS = {
    dumbbell: '<path d="M6.5 6.5L17.5 17.5M6.5 17.5L17.5 6.5M12 2V22"/>',
    posture: '<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    core: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>'
  };

  const iconFor = function(name) {
    const key = name.toLowerCase();
    if (key.includes('posture') || key.includes('back')) return ICONS.posture;
    if (key.includes('core') || key.includes('flex') || key.includes('mobil')) return ICONS.core;
    return ICONS.dumbbell;
  };

  const badgeFor = function(exerciseCount) {
    if (exerciseCount <= 4) return { cls: 'badge-low', label: 'Low' };
    if (exerciseCount <= 5) return { cls: 'badge-medium', label: 'Medium' };
    return { cls: 'badge-high', label: 'High' };
  };

  const svg = function(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">' + inner + '</svg>';
  };

  const init = function() {
    setupEventListeners();
    renderHome();
    showScreen('home');
    console.log('Workout Personal initialized');
  };

  const setupEventListeners = function() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showScreen(btn.dataset.screen);
      });
    });

    const exitBtn = document.getElementById('exit-session-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        if (confirm('Keluar dari sesi workout? Progress akan tersimpan.')) {
          Timer.stop();
          showScreen('home');
        }
      });
    }

    const completeBtn = document.getElementById('complete-set-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', handleCompleteSet);
    }

    const pauseBtn = document.getElementById('pause-timer-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', handlePauseToggle);
    }

    const skipBtn = document.getElementById('skip-exercise-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', handleSkip);
    }
  };

  const handlePauseToggle = function() {
    const pauseBtn = document.getElementById('pause-timer-btn');
    if (!Timer.isActive()) return; // nothing running, nothing to pause

    if (Timer.isPaused()) {
      Timer.resume();
      if (pauseBtn) pauseBtn.textContent = 'Pause';
    } else {
      Timer.pause();
      if (pauseBtn) pauseBtn.textContent = 'Resume';
    }
  };

  const handleSkip = function() {
    Timer.stop();
    const pauseBtn = document.getElementById('pause-timer-btn');
    if (pauseBtn) pauseBtn.textContent = 'Pause';

    Session.skipExercise();

    const session = Session.getCurrent();
    if (!session) {
      alert('Workout selesai! Kerja bagus 💪');
      showScreen('home');
      renderHome();
      return;
    }

    renderSession();
  };

  // ---------- HOME ----------
  const renderHome = function() {
    const streakValue = document.querySelector('.streak-value');
    if (streakValue) streakValue.textContent = Progress.getCurrentStreak();

    const dateEl = document.querySelector('header .subtitle');
    if (dateEl) {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const now = new Date();
      dateEl.textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
    }

    const list = document.querySelector('#home-screen .section');
    if (!list) return;
    const workouts = Workout.getAll();

    list.querySelectorAll('.workout-card').forEach(el => el.remove());

    workouts.forEach(w => {
      const badge = badgeFor(w.exercises.length);
      const card = document.createElement('div');
      card.className = 'card workout-card fade-in';
      card.dataset.workout = w.id;
      card.innerHTML = `
        <div class="workout-icon">${svg(iconFor(w.name))}</div>
        <h3>${w.name}</h3>
        <div class="desc">${w.exercises.length} exercise • Hari ${w.day}</div>
        <div style="margin-bottom: 10px;">
          <span class="badge ${badge.cls}">${badge.label}</span>
        </div>
        <div class="meta">
          <span>${svg(ICONS.clock)} ${w.estimatedTime} min</span>
        </div>
      `;
      card.addEventListener('click', () => startWorkout(w.id));
      list.appendChild(card);
    });

    const startBtn = document.getElementById('start-workout-btn');
    if (startBtn) {
      startBtn.onclick = () => {
        const first = workouts[0];
        if (first) startWorkout(first.id);
      };
    }
  };

  // ---------- SESSION ----------
  const startWorkout = function(workoutId) {
    Session.start(workoutId);
    showScreen('session');
    renderSession();
  };

  const renderSession = function() {
    const session = Session.getCurrent();
    if (!session) {
      showScreen('home');
      return;
    }
    const exercise = Session.getCurrentExercise();
    const progress = Session.getProgress();

    document.querySelector('#session-screen .session-exercise h2').textContent = exercise.name;
    document.querySelector('.session-info').textContent =
      'Set ' + session.currentSet + ' dari ' + exercise.sets + ' • ' + exercise.rest + 's rest';
    document.querySelector('.label').textContent = 'Exercise ' + progress.currentExercise + '/' + progress.totalExercises;

    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, i) => {
      dot.className = 'progress-dot';
      if (i < session.currentExerciseIndex) dot.classList.add('completed');
      else if (i === session.currentExerciseIndex) dot.classList.add('current');
    });

    // Static target display — no more tap-to-count. The number shown is just
    // the exercise's target (reps or duration), nothing to increment.
    const repCurrent = document.querySelector('.rep-current');
    const repTotal = document.querySelector('.rep-total');
    if (repCurrent) repCurrent.textContent = exercise.reps;
    if (repTotal) repTotal.textContent = 'Target Reps';

    resetTimerDisplay(exercise.rest);

    const pauseBtn = document.getElementById('pause-timer-btn');
    if (pauseBtn) pauseBtn.textContent = 'Pause';
  };

  // Ring circumference from the SVG (r=100 -> 2*PI*100 ≈ 628)
  const RING_CIRCUMFERENCE = 628;

  const resetTimerDisplay = function(restSeconds) {
    restSeconds = parseInt(restSeconds) || 0;
    const timerDisplay = document.querySelector('.timer-display');
    const timerLabel = document.querySelector('.timer-label');
    const ring = document.querySelector('.timer-progress');
    if (timerDisplay) timerDisplay.textContent = formatTime(restSeconds);
    if (timerLabel) timerLabel.textContent = 'Sisa waktu istirahat';
    if (ring) ring.style.strokeDashoffset = 0;
  };

  const formatTime = function(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + String(s).padStart(2, '0');
  };

  const handleCompleteSet = function() {
    // Static/one-tap: no more manual rep-by-rep counting. Tapping "Selesai Set"
    // immediately commits the set at its target reps and kicks off the rest timer.
    const exercise = Session.getCurrentExercise();
    if (!exercise) return;
    const reps = exercise.reps;
    const restSeconds = parseInt(exercise.rest) || 0;

    Session.completeSet(reps);

    const session = Session.getCurrent();
    if (!session) {
      alert('Workout selesai! Kerja bagus 💪');
      showScreen('home');
      renderHome();
      return;
    }

    renderSession();
    if (restSeconds > 0) {
      startRestTimer(restSeconds);
    }
  };

  const startRestTimer = function(seconds) {
    const timerDisplay = document.querySelector('.timer-display');
    const timerLabel = document.querySelector('.timer-label');
    const ring = document.querySelector('.timer-progress');
    const pauseBtn = document.getElementById('pause-timer-btn');

    if (pauseBtn) pauseBtn.textContent = 'Pause';
    if (timerLabel) timerLabel.textContent = 'Sisa waktu istirahat';

    Timer.start(seconds, function(remaining, total) {
      if (timerDisplay) timerDisplay.textContent = formatTime(remaining);
      if (ring && total > 0) {
        const progress = (total - remaining) / total; // 0 -> 1
        ring.style.strokeDashoffset = RING_CIRCUMFERENCE * progress;
      }
    }, function() {
      if (timerDisplay) timerDisplay.textContent = '0:00';
      if (timerLabel) timerLabel.textContent = 'Istirahat selesai — lanjut!';
      if (ring) ring.style.strokeDashoffset = RING_CIRCUMFERENCE;
    });
  };

  // ---------- HISTORY ----------
  const renderHistory = function() {
    const container = document.getElementById('history-screen');
    if (!container) return;
    const history = (Storage.get('workoutHistory') || []).slice().reverse();

    const pills = container.querySelector('.filter-pills');
    container.innerHTML = '';
    if (pills) container.appendChild(pills);
    container.querySelectorAll('.pill').forEach(pill => {
      pill.onclick = () => {
        container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      };
    });

    if (history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'label fade-in';
      empty.style.textAlign = 'center';
      empty.style.marginTop = '32px';
      empty.textContent = 'Belum ada riwayat workout.';
      container.appendChild(empty);
      return;
    }

    let lastLabel = '';
    history.forEach(item => {
      const label = dayLabel(item.date);
      if (label !== lastLabel) {
        const labelEl = document.createElement('div');
        labelEl.className = 'timeline-label fade-in';
        labelEl.textContent = label;
        container.appendChild(labelEl);
        lastLabel = label;
      }
      const row = document.createElement('div');
      row.className = 'history-item fade-in';
      const time = new Date(item.date);
      row.innerHTML =
        '<div class="history-icon">' + svg(iconFor(item.workoutName)) + '</div>' +
        '<div class="history-info">' +
          '<div class="history-title">' + item.workoutName + '</div>' +
          '<div class="history-meta">' + item.totalExercises + ' exercise • ' + item.duration + ' menit</div>' +
        '</div>' +
        '<div class="history-date">' + String(time.getHours()).padStart(2,'0') + ':' + String(time.getMinutes()).padStart(2,'0') + '</div>';
      container.appendChild(row);
    });
  };

  const dayLabel = function(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const diffDays = Math.round((today - d) / 86400000);
    if (diffDays === 0) return 'Hari Ini';
    if (diffDays === 1) return 'Kemarin';
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  };

  // ---------- STATISTICS ----------
  const renderStatistics = function() {
    const values = document.querySelectorAll('#statistics-screen .stats-grid .stat-value');
    if (values.length >= 4) {
      values[0].textContent = Statistics.getTotalWorkouts();
      values[1].textContent = Progress.getCurrentStreak();
      const totalMin = Statistics.getTotalMinutes();
      values[2].textContent = totalMin >= 60 ? Math.round(totalMin / 60) + 'h' : totalMin + 'm';
      const totalCal = Math.round(totalMin * 8);
      values[3].textContent = totalCal >= 1000 ? (totalCal / 1000).toFixed(1) + 'k' : totalCal;
    }

    const cards = document.querySelectorAll('#statistics-screen .card');
    if (cards.length >= 3) {
      const longestMono = cards[2].querySelector('.mono');
      if (longestMono) longestMono.textContent = Progress.getLongestStreak() + ' hari';
    }
  };

  // ---------- PROGRESS ----------
  const renderProgress = function() {
    const latest = Progress.getLatestWeight();
    const chartValue = document.querySelector('#progress-screen .chart-value');
    const chartChange = document.querySelector('#progress-screen .chart-change');
    if (chartValue) chartValue.textContent = latest ? latest.weight + ' kg' : '-- kg';
    if (chartChange) {
      const change = Progress.getWeightChange();
      chartChange.textContent = change ? (change.change > 0 ? '↑ ' : '↓ ') + Math.abs(change.change) + ' kg' : 'Belum ada data';
    }

    const catatBtn = document.querySelector('#progress-screen .btn-secondary');
    if (catatBtn) {
      catatBtn.onclick = () => {
        const val = prompt('Masukkan berat badan (kg):');
        if (val && !isNaN(parseFloat(val))) {
          Progress.saveWeightLog(parseFloat(val));
          renderProgress();
        }
      };
    }

    const measureTypeMap = { 'Pinggang (cm)': 'waist', 'Lengan (cm)': 'arm', 'Paha (cm)': 'thigh', 'Dada (cm)': 'chest' };
    document.querySelectorAll('#progress-screen .stat-card').forEach(card => {
      const labelEl = card.querySelector('.stat-label');
      const valueEl = card.querySelector('.stat-value');
      if (!labelEl || !valueEl) return;
      const type = measureTypeMap[labelEl.textContent];
      if (!type) return;
      const m = Progress.getLatestMeasurement(type);
      valueEl.textContent = m ? m.value : '--';
      card.style.cursor = 'pointer';
      card.onclick = () => {
        const val = prompt('Masukkan ' + labelEl.textContent + ':');
        if (val && !isNaN(parseFloat(val))) {
          Progress.saveMeasurement(type, parseFloat(val), 'cm');
          renderProgress();
        }
      };
    });
  };

  // ---------- SETTINGS ----------
  const renderSettings = function() {
    const settings = Settings.getSettings();
    const restItem = document.querySelector('#settings-screen .settings-value');
    if (restItem) restItem.textContent = settings.defaultRestTime + ' detik';

    const toggleMap = [
      { label: 'Suara Timer', key: 'timerSound' },
      { label: 'Getaran', key: 'vibration' }
    ];

    document.querySelectorAll('#settings-screen .settings-item').forEach(item => {
      const labelEl = item.querySelector('.settings-label');
      const toggleEl = item.querySelector('.toggle');
      if (!labelEl) return;

      if (toggleEl) {
        const mapping = toggleMap.find(t => t.label === labelEl.textContent);
        if (mapping) {
          toggleEl.classList.toggle('on', !!settings[mapping.key]);
          toggleEl.onclick = () => {
            const newVal = !toggleEl.classList.contains('on');
            toggleEl.classList.toggle('on', newVal);
            Settings.updateSetting(mapping.key, newVal);
          };
        } else {
          toggleEl.onclick = () => toggleEl.classList.toggle('on');
        }
        return;
      }

      if (labelEl.textContent === 'Export Data') {
        item.onclick = () => ExportImport.downloadJSON();
      } else if (labelEl.textContent === 'Hapus Semua Data') {
        item.onclick = () => {
          if (Settings.clearAllData()) {
            location.reload();
          }
        };
      }
    });
  };

  // ---------- SCREEN SWITCHING ----------
  const showScreen = function(screenName) {
    currentScreen = screenName;

    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenName + '-screen');
    if (targetScreen) {
      targetScreen.classList.add('active');
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screenName);
    });

    window.scrollTo(0, 0);

    if (screenName === 'home') renderHome();
    if (screenName === 'progress') renderProgress();
    if (screenName === 'statistics') renderStatistics();
    if (screenName === 'history') renderHistory();
    if (screenName === 'settings') renderSettings();

    if (targetScreen) {
      const fadeElements = targetScreen.querySelectorAll('.fade-in');
      fadeElements.forEach(el => {
        el.style.animation = 'none';
        setTimeout(() => { el.style.animation = ''; }, 10);
      });
    }
  };

  return {
    init: init,
    showScreen: showScreen
  };
})();

document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
