const Timer = (function() {
  'use strict';

  let intervalId = null;
  let remainingSeconds = 0;
  let totalSeconds = 0;
  let isRunning = false;
  let isPaused = false;
  let onTickCallback = null;
  let onCompleteCallback = null;
  let encouragementSaid = false;

  // Audio context for notification
  let audioContext = null;

  // Read user preference from Settings (defaults to true if Settings isn't
  // available yet or the key was never set, matching Settings' own defaults).
  const soundEnabled = function() {
    try {
      if (typeof Settings === 'undefined') return true;
      const val = Settings.getSetting('timerSound');
      return val !== false;
    } catch (e) {
      return true;
    }
  };

  const vibrationEnabled = function() {
    try {
      if (typeof Settings === 'undefined') return true;
      const val = Settings.getSetting('vibration');
      return val !== false;
    } catch (e) {
      return true;
    }
  };

  const doVibrate = function(pattern) {
    if (!vibrationEnabled()) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const initAudio = function() {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    }
    // resume in case the browser suspended it (autoplay policy)
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  };

  // Generic short tone helper
  const tone = function(freq, duration, volume, type) {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = freq;
    oscillator.type = type || 'sine';

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  // Soft "blip" heard every second while the timer is counting down,
  // so it's always obvious the timer is actually running.
  const playBlip = function() {
    if (!soundEnabled()) return;
    if (!audioContext) initAudio();
    if (!audioContext) return;
    tone(1000, 0.06, 0.12, 'sine');
  };

  // More urgent double-blip for the final countdown (<=3s)
  const playUrgentBlip = function() {
    if (!soundEnabled()) return;
    if (!audioContext) initAudio();
    if (!audioContext) return;
    tone(1200, 0.09, 0.22, 'square');
  };

  // Final completion sound
  const playNotification = function() {
    if (soundEnabled()) {
      if (!audioContext) initAudio();
      if (audioContext) {
        tone(800, 0.5, 0.3, 'sine');
        setTimeout(() => tone(1000, 0.4, 0.25, 'sine'), 150);
      }
    }

    doVibrate([200, 100, 200, 100, 200]);
  };

  // Voice encouragement at the 10-second mark ("10 detik lagi, ayo semangat!")
  const playEncouragement = function() {
    speak('10 detik lagi, ayo semangat!');
    doVibrate([120, 80, 120]);
  };

  // Random hype phrases spoken when a rest timer finishes, so it's not the
  // same line every single time.
  const FINISH_PHRASES = [
    'Waktu habis, ayo lanjut, semangat!',
    'Istirahat selesai, kamu pasti bisa!',
    'Oke, gaskeun set berikutnya!',
    'Mantap, lanjut lagi, jangan menyerah!',
    'Waktunya balik gerak, semangat terus!',
    'Selesai istirahat, ayo kita lanjutkan!'
  ];

  const playFinishEncouragement = function() {
    const phrase = FINISH_PHRASES[Math.floor(Math.random() * FINISH_PHRASES.length)];
    speak(phrase);
  };

  // Shared helper for speaking a phrase via Web Speech API, with a beep
  // fallback when speech synthesis isn't available.
  const speak = function(text) {
    if (!soundEnabled()) return;
    try {
      if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 1.05;
        utterance.pitch = 1.1;
        utterance.volume = 1;
        window.speechSynthesis.cancel(); // avoid overlapping utterances
        window.speechSynthesis.speak(utterance);
      } else {
        playUrgentBlip();
        setTimeout(playUrgentBlip, 180);
      }
    } catch (e) {
      console.warn('Speech synthesis failed', e);
    }
  };

  const tick = function() {
    remainingSeconds--;

    if (onTickCallback) {
      onTickCallback(remainingSeconds, totalSeconds);
    }

    if (remainingSeconds <= 0) {
      stop();
      playNotification();
      setTimeout(playFinishEncouragement, 300); // let the beep finish first
      if (onCompleteCallback) {
        onCompleteCallback();
      }
      return;
    }

    if (remainingSeconds === 10 && !encouragementSaid) {
      encouragementSaid = true;
      playEncouragement();
    } else if (remainingSeconds <= 3) {
      playUrgentBlip();
    } else {
      playBlip();
    }
  };

  const start = function(seconds, onTick, onComplete) {
    stop();

    initAudio(); // must init inside a user-gesture-triggered call for autoplay policies

    remainingSeconds = seconds;
    totalSeconds = seconds;
    onTickCallback = onTick;
    onCompleteCallback = onComplete;
    isRunning = true;
    isPaused = false;
    encouragementSaid = seconds <= 10; // don't fire the cue if the timer starts at/under 10s

    if (onTickCallback) {
      onTickCallback(remainingSeconds, totalSeconds);
    }

    intervalId = setInterval(tick, 1000);
  };

  const pause = function() {
    if (intervalId && isRunning && !isPaused) {
      clearInterval(intervalId);
      intervalId = null;
      isPaused = true;
    }
  };

  const resume = function() {
    if (isPaused && remainingSeconds > 0) {
      initAudio();
      isPaused = false;
      intervalId = setInterval(tick, 1000);
    }
  };

  const stop = function() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isRunning = false;
    isPaused = false;
    remainingSeconds = 0;
    totalSeconds = 0;
  };

  const reset = function(seconds) {
    stop();
    remainingSeconds = seconds;
    totalSeconds = seconds;
    if (onTickCallback) {
      onTickCallback(remainingSeconds, totalSeconds);
    }
  };

  const getRemaining = function() {
    return remainingSeconds;
  };

  const getTotal = function() {
    return totalSeconds;
  };

  const isActive = function() {
    return isRunning || remainingSeconds > 0;
  };

  const isTimerPaused = function() {
    return isPaused;
  };

  const getProgress = function() {
    if (totalSeconds === 0) return 0;
    return ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
  };

  return {
    initAudio: initAudio,
    start: start,
    pause: pause,
    resume: resume,
    stop: stop,
    reset: reset,
    getRemaining: getRemaining,
    getTotal: getTotal,
    isActive: isActive,
    isPaused: isTimerPaused,
    getProgress: getProgress
  };
})();
