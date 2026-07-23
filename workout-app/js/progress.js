const Progress = (function() {
  'use strict';

  const WEIGHT_KEY = 'weightLogs';
  const MEASUREMENTS_KEY = 'measurements';

  // Weight tracking
  const saveWeightLog = function(weight, date) {
    const logs = Storage.get(WEIGHT_KEY) || [];
    logs.push({
      weight: parseFloat(weight),
      date: date || new Date().toISOString(),
      id: Date.now()
    });
    logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    Storage.set(WEIGHT_KEY, logs);
    return true;
  };

  const getWeightLogs = function() {
    return Storage.get(WEIGHT_KEY) || [];
  };

  const getLatestWeight = function() {
    const logs = getWeightLogs();
    return logs.length > 0 ? logs[logs.length - 1] : null;
  };

  const getWeightChange = function() {
    const logs = getWeightLogs();
    if (logs.length < 2) return null;
    
    const first = logs[0].weight;
    const last = logs[logs.length - 1].weight;
    const change = last - first;
    const percentage = ((change / first) * 100).toFixed(1);
    
    return {
      change: change.toFixed(1),
      percentage: percentage,
      first: first,
      last: last
    };
  };

  const deleteWeightLog = function(id) {
    const logs = getWeightLogs();
    const filtered = logs.filter(log => log.id !== id);
    Storage.set(WEIGHT_KEY, filtered);
    return true;
  };

  // Measurements tracking
  const saveMeasurement = function(type, value, unit, date) {
    const measurements = Storage.get(MEASUREMENTS_KEY) || [];
    measurements.push({
      type: type,
      value: parseFloat(value),
      unit: unit || 'cm',
      date: date || new Date().toISOString(),
      id: Date.now()
    });
    measurements.sort((a, b) => new Date(a.date) - new Date(b.date));
    Storage.set(MEASUREMENTS_KEY, measurements);
    return true;
  };

  const getMeasurements = function() {
    return Storage.get(MEASUREMENTS_KEY) || [];
  };

  const getMeasurementsByType = function(type) {
    const measurements = getMeasurements();
    return measurements.filter(m => m.type === type);
  };

  const getLatestMeasurement = function(type) {
    const measurements = getMeasurementsByType(type);
    return measurements.length > 0 ? measurements[measurements.length - 1] : null;
  };

  const deleteMeasurement = function(id) {
    const measurements = getMeasurements();
    const filtered = measurements.filter(m => m.id !== id);
    Storage.set(MEASUREMENTS_KEY, filtered);
    return true;
  };

  // Workout consistency
  const getWorkoutHistory = function() {
    return Storage.get('workoutHistory') || [];
  };

  const getWorkoutsThisWeek = function() {
    const history = getWorkoutHistory();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    return history.filter(w => new Date(w.date) >= weekStart).length;
  };

  const getWorkoutsThisMonth = function() {
    const history = getWorkoutHistory();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return history.filter(w => new Date(w.date) >= monthStart).length;
  };

  const getCurrentStreak = function() {
    const history = getWorkoutHistory();
    if (history.length === 0) return 0;
    
    const sorted = history.sort((a, b) => new Date(b.date) - new Date(a.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let checkDate = new Date(today);
    
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toDateString();
      const hasWorkout = sorted.some(w => {
        const workoutDate = new Date(w.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate.toDateString() === dateStr;
      });
      
      if (hasWorkout) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getLongestStreak = function() {
    const history = getWorkoutHistory();
    if (history.length === 0) return 0;
    
    const dates = history
      .map(w => new Date(w.date).toDateString())
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => new Date(a) - new Date(b));
    
    let longest = 0;
    let current = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        current++;
      } else {
        longest = Math.max(longest, current);
        current = 1;
      }
    }
    
    return Math.max(longest, current);
  };

  const getTotalWorkouts = function() {
    return getWorkoutHistory().length;
  };

  const getTotalMinutes = function() {
    const history = getWorkoutHistory();
    return history.reduce((sum, w) => sum + (w.duration || 0), 0);
  };

  const getWeeklyStats = function() {
    const history = getWorkoutHistory();
    const now = new Date();
    const weeks = [];
    
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const weekWorkouts = history.filter(w => {
        const date = new Date(w.date);
        return date >= weekStart && date < weekEnd;
      });
      
      weeks.push({
        weekStart: weekStart,
        workouts: weekWorkouts.length,
        totalMinutes: weekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0)
      });
    }
    
    return weeks.reverse();
  };

  return {
    saveWeightLog: saveWeightLog,
    getWeightLogs: getWeightLogs,
    getLatestWeight: getLatestWeight,
    getWeightChange: getWeightChange,
    deleteWeightLog: deleteWeightLog,
    saveMeasurement: saveMeasurement,
    getMeasurements: getMeasurements,
    getMeasurementsByType: getMeasurementsByType,
    getLatestMeasurement: getLatestMeasurement,
    deleteMeasurement: deleteMeasurement,
    getWorkoutsThisWeek: getWorkoutsThisWeek,
    getWorkoutsThisMonth: getWorkoutsThisMonth,
    getCurrentStreak: getCurrentStreak,
    getLongestStreak: getLongestStreak,
    getTotalWorkouts: getTotalWorkouts,
    getTotalMinutes: getTotalMinutes,
    getWeeklyStats: getWeeklyStats
  };
})();
