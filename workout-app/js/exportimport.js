const ExportImport = (function() {
  'use strict';

  const BACKUP_KEY = 'lastBackup';

  const exportData = function() {
    try {
      const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        workouts: Storage.get('workouts') || [],
        workoutHistory: Storage.get('workoutHistory') || [],
        weightLogs: Storage.get('weightLogs') || [],
        measurements: Storage.get('measurements') || [],
        settings: Settings.getSettings()
      };

      return {
        success: true,
        data: data,
        size: JSON.stringify(data).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  const downloadJSON = function() {
    const result = exportData();
    if (!result.success) {
      alert('Export failed: ' + result.error);
      return;
    }

    const json = JSON.stringify(result.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workout-backup-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Storage.set(BACKUP_KEY, new Date().toISOString());
    return true;
  };

  const downloadCSV = function() {
    const history = Storage.get('workoutHistory') || [];
    if (history.length === 0) {
      alert('No workout history to export');
      return;
    }

    let csv = 'Date,Workout,Duration (min),Exercises Completed,Total Exercises\n';
    history.forEach(workout => {
      const date = new Date(workout.date).toLocaleDateString();
      csv += `${date},${workout.workoutName},${workout.duration},${workout.completedExercises},${workout.totalExercises}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workout-history-' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  };

  const validateImport = function(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      if (!data.version) {
        return { valid: false, error: 'Invalid backup file: missing version' };
      }

      const required = ['workouts', 'workoutHistory', 'weightLogs', 'measurements', 'settings'];
      const missing = required.filter(key => !(key in data));

      if (missing.length > 0) {
        return { valid: false, error: 'Missing data: ' + missing.join(', ') };
      }

      return {
        valid: true,
        preview: {
          version: data.version,
          exportDate: data.exportDate,
          workouts: data.workouts.length,
          workoutHistory: data.workoutHistory.length,
          weightLogs: data.weightLogs.length,
          measurements: data.measurements.length
        }
      };
    } catch (error) {
      return { valid: false, error: 'Invalid JSON: ' + error.message };
    }
  };

  const importData = function(jsonString) {
    const validation = validateImport(jsonString);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const data = JSON.parse(jsonString);

      Storage.set('workouts', data.workouts);
      Storage.set('workoutHistory', data.workoutHistory);
      Storage.set('weightLogs', data.weightLogs);
      Storage.set('measurements', data.measurements);
      Settings.saveSettings(data.settings);

      return {
        success: true,
        imported: {
          workouts: data.workouts.length,
          workoutHistory: data.workoutHistory.length,
          weightLogs: data.weightLogs.length,
          measurements: data.measurements.length
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getLastBackup = function() {
    return Storage.get(BACKUP_KEY);
  };

  const getStorageInfo = function() {
    const keys = ['workouts', 'workoutHistory', 'weightLogs', 'measurements', 'appSettings'];
    let totalSize = 0;
    const breakdown = {};

    keys.forEach(key => {
      const data = Storage.get(key);
      if (data) {
        const size = JSON.stringify(data).length;
        breakdown[key] = size;
        totalSize += size;
      }
    });

    return {
      totalSize: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      breakdown: breakdown
    };
  };

  return {
    exportData: exportData,
    downloadJSON: downloadJSON,
    downloadCSV: downloadCSV,
    validateImport: validateImport,
    importData: importData,
    getLastBackup: getLastBackup,
    getStorageInfo: getStorageInfo
  };
})();
