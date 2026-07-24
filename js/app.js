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

  // ---------- WAKE LOCK ----------
  // Keeps the screen from auto-locking mid-workout (mid-plank timer hitting
  // a black screen is the single most annoying bug in a workout app). Not
  // supported everywhere, and can fail silently (low battery mode, etc.) —
  // both are fine, the app just falls back to normal screen-timeout behavior.
  let wakeLock = null;

  const requestWakeLock = function() {
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock.request('screen').then(function(lock) {
      wakeLock = lock;
      wakeLock.addEventListener('release', function() {
        wakeLock = null;
      });
    }).catch(function() {
      wakeLock = null; // e.g. battery saver, or page not visible — non-fatal
    });
  };

  const releaseWakeLock = function() {
    if (wakeLock) {
      wakeLock.release().catch(function() {});
      wakeLock = null;
    }
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
          if (prepIntervalId) {
            clearInterval(prepIntervalId);
            prepIntervalId = null;
          }
          prepActive = false;
          prepOnDone = null;
          releaseWakeLock();
          showScreen('home');
        }
      });
    }

    // Tap-anywhere-to-skip on the Preparation screen — no dedicated button
    // (keeps the screen clean), but power users who already know the move
    // shouldn't have to sit through a full 5-second countdown every set.
    const prepScreen = document.getElementById('preparation-screen');
    if (prepScreen) {
      prepScreen.addEventListener('click', handlePrepTap);
    }

    // Re-acquire the wake lock if the tab/screen comes back into view
    // mid-session — the OS silently releases it whenever the page is
    // hidden (e.g. user switches app briefly), so it doesn't reapply on
    // its own once they come back.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Session.getCurrent()) {
        requestWakeLock();
      }
    });

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

    const addTimeBtn = document.getElementById('add-time-btn');
    if (addTimeBtn) {
      addTimeBtn.addEventListener('click', handleAddTime);
    }

    const reviewBackBtn = document.getElementById('review-back-btn');
    if (reviewBackBtn) {
      reviewBackBtn.addEventListener('click', () => showScreen('home'));
    }

    const startSessionBtn = document.getElementById('start-session-btn');
    if (startSessionBtn) {
      startSessionBtn.addEventListener('click', () => {
        if (pendingWorkoutId !== null) {
          startWorkout(pendingWorkoutId);
        }
      });
    }

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDifficultySelect(btn.dataset.difficulty));
    });

    const congratsDoneBtn = document.getElementById('congrats-done-btn');
    if (congratsDoneBtn) {
      congratsDoneBtn.addEventListener('click', () => {
        showScreen('home');
        renderHome();
      });
    }
  };

  // Max 2 taps of "+15s" per rest period, to avoid rest dragging on forever.
  const MAX_ADD_TIME_TAPS = 2;
  const ADD_TIME_SECONDS = 15;
  let addTimeTapsUsed = 0;

  const handleAddTime = function() {
    if (sessionPhase !== 'rest') return; // "+15s" only ever applies to rest
    if (addTimeTapsUsed >= MAX_ADD_TIME_TAPS) return;
    Timer.addTime(ADD_TIME_SECONDS);
    addTimeTapsUsed++;
    const addTimeBtn = document.getElementById('add-time-btn');
    if (addTimeBtn && addTimeTapsUsed >= MAX_ADD_TIME_TAPS) {
      addTimeBtn.disabled = true;
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

  // ---------- CONGRATS / WORKOUT COMPLETION ----------
  const MET_BODYWEIGHT_TRAINING = 6; // rough MET value for moderate calisthenics
  const DEFAULT_WEIGHT_KG = 65; // fallback if the user never logged a weight

  const estimateCalories = function(durationSeconds) {
    const weightLog = (typeof Progress !== 'undefined') ? Progress.getLatestWeight() : null;
    const weightKg = weightLog && weightLog.weight ? weightLog.weight : DEFAULT_WEIGHT_KG;
    const durationHours = durationSeconds / 3600;
    return Math.round(MET_BODYWEIGHT_TRAINING * weightKg * durationHours);
  };

  const finishWorkoutFlow = function() {
    Timer.stop();
    releaseWakeLock();

    const history = Storage.get('workoutHistory') || [];
    const last = history[history.length - 1];
    const durationSeconds = last ? (last.durationSeconds || 0) : 0;
    const calories = estimateCalories(durationSeconds);

    Session.updateLastHistoryEntry({ caloriesBurned: calories });

    const durationEl = document.getElementById('congrats-duration');
    const caloriesEl = document.getElementById('congrats-calories');
    if (durationEl) durationEl.textContent = formatTime(durationSeconds);
    if (caloriesEl) caloriesEl.textContent = calories + ' kcal';

    document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('selected'));

    showScreen('congrats');
  };

  const handleDifficultySelect = function(difficulty) {
    Session.updateLastHistoryEntry({ difficultyRating: difficulty });
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.difficulty === difficulty);
    });
  };

  const handleSkip = function() {
    Timer.stop();
    const pauseBtn = document.getElementById('pause-timer-btn');
    if (pauseBtn) pauseBtn.textContent = 'Pause';

    if (sessionPhase === 'rest') {
      // Skip straight past whatever rest is left, but still show the
      // "get ready" countdown before diving into the next exercise/set.
      const nextExercise = Session.getCurrentExercise();
      runPreparation(nextExercise, function() {
        enterExercisePhase();
      });
      return;
    }

    // Skipping mid-exercise skips all remaining sets of it and moves on
    // without an intervening rest (the user chose to move on, not to rest).
    Session.skipExercise();

    const session = Session.getCurrent();
    if (!session) {
      finishWorkoutFlow();
      return;
    }

    const nextExercise = Session.getCurrentExercise();
    runPreparation(nextExercise, function() {
      enterExercisePhase();
    });
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
      card.addEventListener('click', () => showReviewScreen(w.id));
      list.appendChild(card);
    });

    const startBtn = document.getElementById('start-workout-btn');
    if (startBtn) {
      startBtn.onclick = () => {
        const first = workouts[0];
        if (first) showReviewScreen(first.id);
      };
    }
  };

  // ---------- REVIEW (shown before a session actually starts) ----------
  let pendingWorkoutId = null;

  const showReviewScreen = function(workoutId) {
    pendingWorkoutId = workoutId;
    renderReviewScreen(workoutId);
    showScreen('review');
  };

  const renderReviewScreen = function(workoutId) {
    const workout = Workout.getById(workoutId);
    if (!workout) return;

    const nameEl = document.getElementById('review-workout-name');
    const metaEl = document.getElementById('review-workout-meta');
    const listEl = document.getElementById('review-exercise-list');
    if (nameEl) nameEl.textContent = workout.name;
    if (metaEl) metaEl.textContent = workout.exercises.length + ' exercise • ~' + workout.estimatedTime + ' menit';

    if (listEl) {
      listEl.innerHTML = '';
      workout.exercises.forEach(ex => {
        const item = document.createElement('div');
        item.className = 'review-exercise-item';
        item.innerHTML =
          '<div class="review-exercise-name">' + ex.name + '</div>' +
          '<div class="review-exercise-meta">' + ex.sets + ' set x ' + ex.reps + '<br>' + ex.rest + 's rest</div>';
        listEl.appendChild(item);
      });
    }
  };

  // ---------- SESSION ----------
  // A set has two phases: the exercise itself, then (if it has rest > 0) the
  // rest period that follows it. Kept as an explicit phase so it's always
  // clear what the timer is currently counting, and so "+15s" only ever
  // shows up where it's meant to — during rest.
  let sessionPhase = 'exercise';

  // Ring circumference from the SVG (r=100 -> 2*PI*100 ≈ 628)
  const RING_CIRCUMFERENCE = 628;

  const formatTime = function(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + String(s).padStart(2, '0');
  };

  // Reads a target duration (in seconds) out of a reps string like
  // "30-45 detik", "20 detik" or "2 menit". Returns null for rep-count
  // exercises (15, "10-12", "12 per sisi", ...) — those have no timer of
  // their own and are finished manually with the "Selesai Set" button.
  const parseExerciseDurationSeconds = function(reps) {
    if (typeof reps !== 'string') return null;
    const lower = reps.toLowerCase();
    if (lower.indexOf('detik') === -1 && lower.indexOf('menit') === -1) return null;
    const numbers = (lower.match(/\d+(\.\d+)?/g) || []).map(Number);
    if (numbers.length === 0) return null;
    const maxNum = Math.max.apply(null, numbers);
    return Math.round(lower.indexOf('menit') !== -1 ? maxNum * 60 : maxNum);
  };

  const startWorkout = function(workoutId) {
    Session.start(workoutId);
    requestWakeLock();
    const exercise = Session.getCurrentExercise();
    runPreparation(exercise, function() {
      enterExercisePhase();
    });
  };

  // ----- PREPARATION PHASE (5-4-3-2-1-GO before every exercise) -----
  let prepIntervalId = null;
  let prepActive = false;
  let prepOnDone = null;
  const PREP_SECONDS = 5;

  const runPreparation = function(exercise, onDone) {
    if (!exercise) { onDone(); return; }

    // Clear any stray preparation timer (defensive — avoids duplicated
    // intervals if this ever gets called twice in a row).
    if (prepIntervalId) {
      clearInterval(prepIntervalId);
      prepIntervalId = null;
    }
    prepActive = true;
    prepOnDone = onDone;

    const nameEl = document.getElementById('prep-exercise-name');
    const targetEl = document.getElementById('prep-exercise-target');
    const iconEl = document.getElementById('prep-icon');
    const countdownEl = document.getElementById('prep-countdown');

    if (nameEl) nameEl.textContent = exercise.name;
    if (iconEl) iconEl.innerHTML = svg(iconFor(exercise.name));

    if (targetEl) {
      const durationSeconds = parseExerciseDurationSeconds(exercise.reps);
      targetEl.textContent = durationSeconds
        ? exercise.reps
        : exercise.sets + 'x' + exercise.reps + ' reps';
    }

    Timer.initAudio(); // user-gesture-adjacent call, keeps audio unlocked

    let count = PREP_SECONDS;
    const renderCount = function(value, isGo) {
      if (!countdownEl) return;
      countdownEl.classList.remove('tick', 'go');
      countdownEl.textContent = isGo ? 'GO!' : String(value);
      // reflow so the animation reliably restarts each tick
      void countdownEl.offsetWidth;
      countdownEl.classList.add(isGo ? 'go' : 'tick');
    };

    showScreen('preparation');
    renderCount(count, false);
    playPrepTick(false);
    announceExercise(exercise);

    prepIntervalId = setInterval(function() {
      count--;
      if (count > 0) {
        renderCount(count, false);
        playPrepTick(false);
      } else {
        renderCount(0, true);
        playPrepTick(true);
        clearInterval(prepIntervalId);
        prepIntervalId = null;
        setTimeout(finishPreparation, 450); // let the "GO!" animation land
      }
    }, 1000);
  };

  // Ends the Preparation phase — reached either by the countdown running
  // out naturally, or by the user tapping the screen to skip ahead.
  // Guarded by prepActive so the natural-completion setTimeout can't fire
  // a second time after a tap already resolved it.
  const finishPreparation = function() {
    if (!prepActive) return;
    prepActive = false;
    if (prepIntervalId) {
      clearInterval(prepIntervalId);
      prepIntervalId = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const done = prepOnDone;
    prepOnDone = null;
    showScreen('session');
    if (done) done();
  };

  // Tap-anywhere-on-screen skip — jumps straight into the exercise instead
  // of waiting out the rest of the 5-4-3-2-1 countdown.
  const handlePrepTap = function() {
    if (!prepActive) return;
    finishPreparation();
  };

  // Speaks the exercise name once, right as Preparation begins, so the
  // user doesn't have to be looking at the screen to know what's next.
  const announceExercise = function(exercise) {
    if (typeof Settings !== 'undefined') {
      try {
        if (Settings.getSetting('timerSound') === false) return;
      } catch (e) { /* fall through and try to speak anyway */ }
    }
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      const utterance = new SpeechSynthesisUtterance(exercise.name + ', bersiap');
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.volume = 1;
      window.speechSynthesis.cancel(); // avoid overlapping utterances
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed', e);
    }
  };

  // Short, cheap tick sounds for the countdown — reuses Timer's audio
  // context via the same soundEnabled() preference the workout timer uses.
  // GO! gets a distinctly longer, punchier pattern than the plain ticks so
  // it reads as "different" even without looking at the screen.
  const playPrepTick = function(isGo) {
    if (typeof Settings !== 'undefined') {
      try {
        if (Settings.getSetting('vibration') === false) return;
      } catch (e) { /* fall through and vibrate */ }
    }
    if (!('vibrate' in navigator)) return;
    navigator.vibrate(isGo ? [70, 40, 70, 40, 160] : 35);
  };

  // ----- EXERCISE PHASE -----
  const enterExercisePhase = function() {
    const session = Session.getCurrent();
    if (!session) {
      showScreen('home');
      return;
    }
    sessionPhase = 'exercise';

    const exercise = Session.getCurrentExercise();
    const progress = Session.getProgress();

    document.querySelector('#session-screen .session-exercise h2').textContent = exercise.name;
    document.querySelector('.session-info').textContent =
      'Set ' + session.currentSet + ' dari ' + exercise.sets;
    document.querySelector('.label').textContent = 'Exercise ' + progress.currentExercise + '/' + progress.totalExercises;

    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, i) => {
      dot.className = 'progress-dot';
      if (i < session.currentExerciseIndex) dot.classList.add('completed');
      else if (i === session.currentExerciseIndex) dot.classList.add('current');
    });

    // Static target display — the number shown is just the exercise's
    // target (reps or duration), nothing to increment.
    const repCurrent = document.querySelector('.rep-current');
    const repTotal = document.querySelector('.rep-total');
    if (repCurrent) repCurrent.textContent = exercise.reps;
    if (repTotal) repTotal.textContent = 'Target Reps';

    const pauseBtn = document.getElementById('pause-timer-btn');
    if (pauseBtn) pauseBtn.textContent = 'Pause';

    const skipBtn = document.getElementById('skip-exercise-btn');
    if (skipBtn) skipBtn.textContent = 'Skip';

    // "+15s" only ever applies to rest — hidden for the exercise itself.
    // Uses inline style directly (not a CSS class) so this doesn't depend
    // on css/style.css having loaded/refreshed correctly.
    const addTimeBtn = document.getElementById('add-time-btn');
    if (addTimeBtn) addTimeBtn.style.display = 'none';

    const completeBtn = document.getElementById('complete-set-btn');
    const completeLabel = document.getElementById('complete-set-label');
    if (completeBtn) completeBtn.style.display = '';

    const timerDisplay = document.querySelector('.timer-display');
    const timerLabel = document.querySelector('.timer-label');
    const ring = document.querySelector('.timer-progress');

    // Remove next exercise preview if it exists (we're back to exercise phase)
    const preview = document.querySelector('.next-exercise-preview');
    if (preview) preview.remove();

    const durationSeconds = parseExerciseDurationSeconds(exercise.reps);

    if (durationSeconds) {
      // Timed exercise (e.g. Plank, "30-45 detik"): runs its own countdown
      // with sound, and auto-advances to rest the moment it hits zero.
      if (completeLabel) completeLabel.textContent = 'Selesai Lebih Awal';
      if (timerLabel) timerLabel.textContent = 'Latihan berjalan';
      
      // Initialize audio context for sound effects
      Timer.initAudio();
      
      Timer.start(durationSeconds, function(remaining, total) {
        if (timerDisplay) {
          timerDisplay.textContent = formatTime(remaining);
          // Add pulse effect for last 3 seconds
          if (remaining <= 3 && remaining > 0) {
            timerDisplay.style.transform = 'scale(1.05)';
          } else {
            timerDisplay.style.transform = 'scale(1)';
          }
        }
        if (ring && total > 0) {
          const progress = (total - remaining) / total; // 0 -> 1
          ring.style.strokeDashoffset = RING_CIRCUMFERENCE * progress;
        }
      }, function() {
        if (timerDisplay) timerDisplay.style.transform = 'scale(1)';
        advanceAfterExercise(exercise);
      });
    } else {
      // Rep-count exercise: nothing to count down, so the timer stays put
      // and the set is finished manually.
      Timer.stop();
      if (completeLabel) completeLabel.textContent = 'Selesai Set';
      if (timerDisplay) timerDisplay.textContent = '--:--';
      if (timerLabel) timerLabel.textContent = 'Selesaikan set ini, lalu tekan tombol';
      if (ring) ring.style.strokeDashoffset = RING_CIRCUMFERENCE;
    }
  };

  const handleCompleteSet = function() {
    if (sessionPhase === 'rest') return; // nothing to "complete" while resting

    const exercise = Session.getCurrentExercise();
    if (!exercise) return;

    advanceAfterExercise(exercise);
  };

  // Commits the set that was just finished (whether the exercise timer ran
  // out or the person tapped the button), then either starts the rest that
  // belongs to that exercise or, if there's none, moves straight to the
  // next exercise. If that was the last set of the workout, Session already
  // closed itself out, so we go to the congrats screen instead.
  const advanceAfterExercise = function(finishedExercise) {
    Timer.stop();
    const restSeconds = parseInt(finishedExercise.rest, 10) || 0;

    Session.completeSet(finishedExercise.reps);

    const session = Session.getCurrent();
    if (!session) {
      finishWorkoutFlow();
      return;
    }

    if (restSeconds > 0) {
      enterRestPhase(restSeconds);
    } else {
      enterExercisePhase();
    }
  };

  // ----- REST PHASE -----
  const enterRestPhase = function(seconds) {
    sessionPhase = 'rest';

    const pauseBtn = document.getElementById('pause-timer-btn');
    const skipBtn = document.getElementById('skip-exercise-btn');
    const addTimeBtn = document.getElementById('add-time-btn');
    const completeBtn = document.getElementById('complete-set-btn');
    const timerLabel = document.querySelector('.timer-label');

    if (pauseBtn) pauseBtn.textContent = 'Pause';
    if (skipBtn) skipBtn.textContent = 'Lewati Istirahat';
    if (completeBtn) completeBtn.style.display = 'none'; // nothing to complete during rest
    if (timerLabel) timerLabel.textContent = 'Sisa waktu istirahat';

    // Fresh rest period -> fresh allowance of "+15s" taps.
    addTimeTapsUsed = 0;
    if (addTimeBtn) {
      addTimeBtn.style.display = '';
      addTimeBtn.disabled = false;
    }

    // Show next exercise preview
    showNextExercisePreview();

    const timerDisplay = document.querySelector('.timer-display');
    const ring = document.querySelector('.timer-progress');

    Timer.start(seconds, function(remaining, total) {
      if (timerDisplay) timerDisplay.textContent = formatTime(remaining);
      if (ring && total > 0) {
        const progress = (total - remaining) / total; // 0 -> 1
        ring.style.strokeDashoffset = RING_CIRCUMFERENCE * progress;
      }
    }, function() {
      // Rest is over — show the "get ready" countdown, then auto-advance
      // into the next exercise/set.
      const nextExercise = Session.getCurrentExercise();
      runPreparation(nextExercise, function() {
        enterExercisePhase();
      });
    });
  };

  // Show preview of what's coming up right after this rest — this must
  // reflect Session's *current* pointer (Session.completeSet already
  // advanced set/exercise before rest starts), NOT "index + 1", which
  // was wrong whenever rest falls between two sets of the same exercise.
  const showNextExercisePreview = function() {
    const session = Session.getCurrent();
    const nextExercise = Session.getCurrentExercise();

    const repCounter = document.querySelector('.rep-counter');
    if (!repCounter) return;

    // Remove existing preview if any
    const existingPreview = document.querySelector('.next-exercise-preview');
    if (existingPreview) existingPreview.remove();

    if (session && nextExercise) {
      const preview = document.createElement('div');
      preview.className = 'next-exercise-preview';

      const durationSeconds = parseExerciseDurationSeconds(nextExercise.reps);
      const targetDisplay = durationSeconds
        ? nextExercise.reps
        : nextExercise.reps + ' reps';

      preview.innerHTML = `
        <div class="label">Latihan Berikutnya</div>
        <div class="next-exercise-row">
          <div class="next-exercise-icon">${svg(iconFor(nextExercise.name))}</div>
          <div>
            <div class="exercise-name">${nextExercise.name}</div>
            <div class="exercise-details">
              Target ${targetDisplay} • Set ${session.currentSet}/${nextExercise.sets}
            </div>
          </div>
        </div>
      `;

      repCounter.parentNode.insertBefore(preview, repCounter);
    }
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
