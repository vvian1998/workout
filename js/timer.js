const Timer = (function() {
  'use strict';

  let intervalId = null;
  let remainingSeconds = 0;
  let totalSeconds = 0;
  let isRunning = false;
  let isPaused = false;
  let onTickCallback = null;
  let onCompleteCallback = null;

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
  };

  const playNotification = function() {
    if (!audioContext) {
      initAudio();
    }

    if (!audioContext) return;

    // Create beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Vibration for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  };

  const start = function(seconds, onTick, onComplete) {
    stop();
    
    remainingSeconds = seconds;
    totalSeconds = seconds;
    onTickCallback = onTick;
    onCompleteCallback = onComplete;
    isRunning = true;
    isPaused = false;

    if (onTickCallback) {
      onTickCallback(remainingSeconds, totalSeconds);
    }

    intervalId = setInterval(function() {
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
      }
    }, 1000);
  };

  const pause = function() {
    if (intervalId && isRunning && !isPaused) {
      clearInterval(intervalId);
      isPaused = true;
    }
  };

  const resume = function() {
    if (isPaused && remainingSeconds > 0) {
      isPaused = false;
      intervalId = setInterval(function() {
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
        }
      }, 1000);
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
