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
    if (!audioContext) initAudio();
    if (!audioContext) return;
    tone(1000, 0.06, 0.12, 'sine');
  };

  // More urgent double-blip for the final countdown (<=3s)
  const playUrgentBlip = function() {
    if (!audioContext) initAudio();
    if (!audioContext) return;
    tone(1200, 0.09, 0.22, 'square');
  };

  // Final completion sound
  const playNotification = function() {
    if (!audioContext) initAudio();
    if (!audioContext) return;

    tone(800, 0.5, 0.3, 'sine');
    setTimeout(() => tone(1000, 0.4, 0.25, 'sine'), 150);

    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  };

  // Voice encouragement at the 10-second mark ("10 detik lagi, ayo semangat!")
  const playEncouragement = function() {
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('10 detik lagi, ayo semangat!');
        utterance.lang = 'id-ID';
        utterance.rate = 1.05;
        utterance.pitch = 1.1;
        utterance.volume = 1;
        window.speechSynthesis.cancel(); // avoid overlapping utterances
        window.speechSynthesis.speak(utterance);
      } else {
        // fallback if speech synthesis isn't available: two quick beeps
        playUrgentBlip();
        setTimeout(playUrgentBlip, 180);
      }
    } catch (e) {
      console.warn('Speech synthesis failed', e);
    }
    if ('vibrate' in navigator) {
      navigator.vibrate([120, 80, 120]);
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
