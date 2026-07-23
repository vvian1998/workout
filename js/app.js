const App = (function() {
  'use strict';

  let currentScreen = 'home';

  const init = function() {
    setupEventListeners();
    showScreen('home');
    console.log('Workout Personal initialized');
  };

  const setupEventListeners = function() {
    // Navigation buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        showScreen(screen);
      });
    });

    // Start workout button
    const startBtn = document.getElementById('start-workout-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        showScreen('session');
      });
    }

    // Exit session button
    const exitBtn = document.getElementById('exit-session-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        showScreen('home');
      });
    }

    // Complete set button
    const completeBtn = document.getElementById('complete-set-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        handleCompleteSet();
      });
    }

    // Workout cards
    const workoutCards = document.querySelectorAll('.workout-card');
    workoutCards.forEach(card => {
      card.addEventListener('click', () => {
        showScreen('session');
      });
    });

    // Filter pills
    const pills = document.querySelectorAll('.pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });

    // Toggle switches
    const toggles = document.querySelectorAll('.toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('on');
      });
    });
  };

  const showScreen = function(screenName) {
    currentScreen = screenName;
    
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
      screen.classList.remove('active');
    });

    // Show selected screen
    const targetScreen = document.getElementById(screenName + '-screen');
    if (targetScreen) {
      targetScreen.classList.add('active');
    }

    // Update navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      if (btn.dataset.screen === screenName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Scroll to top
    window.scrollTo(0, 0);

    // Trigger animations
    const fadeElements = targetScreen.querySelectorAll('.fade-in');
    fadeElements.forEach(el => {
      el.style.animation = 'none';
      setTimeout(() => {
        el.style.animation = '';
      }, 10);
    });
  };

  const handleCompleteSet = function() {
    const repCurrent = document.querySelector('.rep-current');
    if (repCurrent) {
      const current = parseInt(repCurrent.textContent);
      const repTotal = document.querySelector('.rep-total');
      const total = parseInt(repTotal.textContent.replace('/ ', ''));
      
      if (current < total) {
        repCurrent.textContent = current + 1;
        
        // Add bounce animation
        repCurrent.style.animation = 'none';
        setTimeout(() => {
          repCurrent.style.animation = 'fadeUp 0.3s ease-out';
        }, 10);
      } else {
        // Set completed
        alert('Set selesai! Istirahat 60 detik.');
      }
    }
  };

  return {
    init: init,
    showScreen: showScreen
  };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
