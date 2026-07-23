const Settings = (function() {
  'use strict';

  const SETTINGS_KEY = 'appSettings';

  const defaultSettings = {
    defaultRestTime: 60,
    timerSound: true,
    vibration: true,
    weightUnit: 'kg',
    measurementUnit: 'cm',
    theme: 'dark'
  };

  const getSettings = function() {
    const settings = Storage.get(SETTINGS_KEY);
    return settings || { ...defaultSettings };
  };

  const saveSettings = function(newSettings) {
    const current = getSettings();
    const updated = { ...current, ...newSettings };
    Storage.set(SETTINGS_KEY, updated);
    return updated;
  };

  const updateSetting = function(key, value) {
    const settings = getSettings();
    settings[key] = value;
    Storage.set(SETTINGS_KEY, settings);
    return settings;
  };

  const getSetting = function(key) {
    const settings = getSettings();
    return settings[key];
  };

  const resetToDefault = function() {
    Storage.set(SETTINGS_KEY, { ...defaultSettings });
    return { ...defaultSettings };
  };

  const clearAllData = function() {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
      if (confirm('This will delete all workouts, history, progress, and settings. Continue?')) {
        Storage.clear();
        return true;
      }
    }
    return false;
  };

  const exportData = function() {
    const data = {
      workouts: Storage.get('workouts'),
      workoutHistory: Storage.get('workoutHistory'),
      weightLogs: Storage.get('weightLogs'),
      measurements: Storage.get('measurements'),
      settings: getSettings(),
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  };

  const importData = function(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.workouts) Storage.set('workouts', data.workouts);
      if (data.workoutHistory) Storage.set('workoutHistory', data.workoutHistory);
      if (data.weightLogs) Storage.set('weightLogs', data.weightLogs);
      if (data.measurements) Storage.set('measurements', data.measurements);
      if (data.settings) Storage.set(SETTINGS_KEY, data.settings);
      
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  };

  return {
    getSettings: getSettings,
    saveSettings: saveSettings,
    updateSetting: updateSetting,
    getSetting: getSetting,
    resetToDefault: resetToDefault,
    clearAllData: clearAllData,
    exportData: exportData,
    importData: importData
  };
})();
