const Statistics = (function() {
  'use strict';

  const getHistory = function() {
    return Storage.get('workoutHistory') || [];
  };

  const getTotalWorkouts = function() {
    return getHistory().length;
  };

  const getTotalMinutes = function() {
    return getHistory().reduce((sum, w) => sum + (w.duration || 0), 0);
  };

  const getTotalSets = function() {
    return getHistory().reduce((sum, w) => {
      return sum + w.exercises.reduce((exSum, ex) => exSum + ex.completedSets, 0);
    }, 0);
  };

  const getAverageDuration = function() {
    const history = getHistory();
    if (history.length === 0) return 0;
    return Math.round(getTotalMinutes() / history.length);
  };

  const getMostFrequentWorkout = function() {
    const history = getHistory();
    if (history.length === 0) return null;

    const counts = {};
    history.forEach(w => {
      counts[w.workoutName] = (counts[w.workoutName] || 0) + 1;
    });

    let maxCount = 0;
    let mostFrequent = null;
    Object.keys(counts).forEach(name => {
      if (counts[name] > maxCount) {
        maxCount = counts[name];
        mostFrequent = { name: name, count: counts[name] };
      }
    });

    return mostFrequent;
  };

  const getWorkoutsByMonth = function() {
    const history = getHistory();
    const months = {};

    history.forEach(w => {
      const date = new Date(w.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = (months[key] || 0) + 1;
    });

    return Object.keys(months).sort().map(key => ({
      month: key,
      count: months[key]
    }));
  };

  const getWorkoutsByDayOfWeek = function() {
    const history = getHistory();
    const days = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    history.forEach(w => {
      const day = new Date(w.date).getDay();
      days[day]++;
    });

    return dayNames.map((name, index) => ({
      day: name,
      count: days[index]
    }));
  };

  const getCompletionRate = function() {
    const history = getHistory();
    if (history.length === 0) return 0;

    const totalExercises = history.reduce((sum, w) => sum + w.totalExercises, 0);
    const completedExercises = history.reduce((sum, w) => sum + w.completedExercises, 0);

    return Math.round((completedExercises / totalExercises) * 100);
  };

  const getFavoriteExercises = function() {
    const history = getHistory();
    const exerciseCounts = {};

    history.forEach(w => {
      w.exercises.forEach(ex => {
        exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + 1;
      });
    });

    return Object.keys(exerciseCounts)
      .map(name => ({ name: name, count: exerciseCounts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getMonthlyStats = function() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const history = getHistory().filter(w => {
      const date = new Date(w.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    return {
      workouts: history.length,
      minutes: history.reduce((sum, w) => sum + (w.duration || 0), 0),
      sets: history.reduce((sum, w) => {
        return sum + w.exercises.reduce((exSum, ex) => exSum + ex.completedSets, 0);
      }, 0)
    };
  };

  const getAllTimeStats = function() {
    return {
      totalWorkouts: getTotalWorkouts(),
      totalMinutes: getTotalMinutes(),
      totalSets: getTotalSets(),
      averageDuration: getAverageDuration(),
      completionRate: getCompletionRate()
    };
  };

  return {
    getTotalWorkouts: getTotalWorkouts,
    getTotalMinutes: getTotalMinutes,
    getTotalSets: getTotalSets,
    getAverageDuration: getAverageDuration,
    getMostFrequentWorkout: getMostFrequentWorkout,
    getWorkoutsByMonth: getWorkoutsByMonth,
    getWorkoutsByDayOfWeek: getWorkoutsByDayOfWeek,
    getCompletionRate: getCompletionRate,
    getFavoriteExercises: getFavoriteExercises,
    getMonthlyStats: getMonthlyStats,
    getAllTimeStats: getAllTimeStats
  };
})();
