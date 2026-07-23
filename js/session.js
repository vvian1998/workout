const Session = (function() {
  'use strict';

  const STORAGE_KEY = 'activeSession';
  const HISTORY_KEY = 'workoutHistory';

  let currentSession = null;

  const init = function() {
    currentSession = Storage.get(STORAGE_KEY);
  };

  const start = function(workoutId) {
    const workout = Workout.getById(workoutId);
    if (!workout) return null;

    currentSession = {
      workoutId: workout.id,
      workoutName: workout.name,
      startTime: new Date().toISOString(),
      currentExerciseIndex: 0,
      currentSet: 1,
      exercises: workout.exercises.map(ex => ({
        ...ex,
        completedSets: [],
        isComplete: false
      })),
      isComplete: false
    };

    saveSession();
    return currentSession;
  };

  const getCurrent = function() {
    return currentSession;
  };

  const getCurrentExercise = function() {
    if (!currentSession) return null;
    return currentSession.exercises[currentSession.currentExerciseIndex];
  };

  const completeSet = function(reps, notes) {
    if (!currentSession) return false;

    const exercise = getCurrentExercise();
    if (!exercise) return false;

    exercise.completedSets.push({
      setNumber: currentSession.currentSet,
      reps: reps,
      completedAt: new Date().toISOString(),
      notes: notes || ''
    });

    if (currentSession.currentSet >= exercise.sets) {
      exercise.isComplete = true;
      if (currentSession.currentExerciseIndex < currentSession.exercises.length - 1) {
        currentSession.currentExerciseIndex++;
        currentSession.currentSet = 1;
      } else {
        completeWorkout();
      }
    } else {
      currentSession.currentSet++;
    }

    saveSession();
    return true;
  };

  const skipExercise = function() {
    if (!currentSession) return false;

    const exercise = getCurrentExercise();
    if (exercise) {
      exercise.isComplete = true;
    }

    if (currentSession.currentExerciseIndex < currentSession.exercises.length - 1) {
      currentSession.currentExerciseIndex++;
      currentSession.currentSet = 1;
    } else {
      completeWorkout();
    }

    saveSession();
    return true;
  };

  const completeWorkout = function() {
    if (!currentSession) return false;

    currentSession.isComplete = true;
    currentSession.endTime = new Date().toISOString();

    const duration = Math.round(
      (new Date(currentSession.endTime) - new Date(currentSession.startTime)) / 60000
    );

    const historyEntry = {
      id: Date.now(),
      workoutId: currentSession.workoutId,
      workoutName: currentSession.workoutName,
      date: currentSession.startTime,
      duration: duration,
      exercises: currentSession.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        completedSets: ex.completedSets.length,
        isComplete: ex.isComplete
      })),
      totalExercises: currentSession.exercises.length,
      completedExercises: currentSession.exercises.filter(ex => ex.isComplete).length
    };

    const history = Storage.get(HISTORY_KEY) || [];
    history.push(historyEntry);
    Storage.set(HISTORY_KEY, history);

    clearSession();
    return historyEntry;
  };

  const clearSession = function() {
    currentSession = null;
    Storage.remove(STORAGE_KEY);
  };

  const saveSession = function() {
    if (currentSession) {
      Storage.set(STORAGE_KEY, currentSession);
    }
  };

  const getProgress = function() {
    if (!currentSession) return null;

    const totalSets = currentSession.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const completedSets = currentSession.exercises.reduce(
      (sum, ex) => sum + ex.completedSets.length, 0
    );

    return {
      currentExercise: currentSession.currentExerciseIndex + 1,
      totalExercises: currentSession.exercises.length,
      currentSet: currentSession.currentSet,
      totalSets: totalSets,
      completedSets: completedSets,
      percentage: Math.round((completedSets / totalSets) * 100)
    };
  };

  return {
    init: init,
    start: start,
    getCurrent: getCurrent,
    getCurrentExercise: getCurrentExercise,
    completeSet: completeSet,
    skipExercise: skipExercise,
    completeWorkout: completeWorkout,
    clearSession: clearSession,
    getProgress: getProgress
  };
})();

Session.init();
