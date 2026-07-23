// Storage module - localStorage wrapper
const Storage = (function() {
  'use strict';
  
  const PREFIX = 'workout_';
  
  const get = function(key) {
    try {
      const data = localStorage.getItem(PREFIX + key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Storage.get error:', error);
      return null;
    }
  };
  
  const set = function(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage.set error:', error);
      return false;
    }
  };
  
  const remove = function(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return true;
    } catch (error) {
      console.error('Storage.remove error:', error);
      return false;
    }
  };
  
  const clear = function() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX)) {
          keys.push(key);
        }
      }
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Storage.clear error:', error);
      return false;
    }
  };
  
  return {
    get: get,
    set: set,
    remove: remove,
    clear: clear
  };
})();
