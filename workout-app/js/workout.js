const Workout = (function() {
  'use strict';

  const STORAGE_KEY = 'workouts';

  const defaultWorkouts = [
    {
      id: 1,
      day: 1,
      name: 'Full Body A',
      estimatedTime: 30,
      exercises: [
        { name: 'Squat', sets: 3, reps: 15, rest: 60 },
        { name: 'Push-up', sets: 3, reps: '10-12', rest: 60 },
        { name: 'Plank', sets: 3, reps: '30-45 detik', rest: 45 },
        { name: 'Glute Bridge', sets: 3, reps: 15, rest: 60 },
        { name: 'Superman Hold', sets: 3, reps: '20 detik', rest: 45 }
      ]
    },
    {
      id: 2,
      day: 2,
      name: 'Posture & Back',
      estimatedTime: 25,
      exercises: [
        { name: 'Reverse Snow Angel', sets: 3, reps: 12, rest: 60 },
        { name: 'Superman', sets: 3, reps: 15, rest: 60 },
        { name: 'Bird Dog', sets: 3, reps: '12 per sisi', rest: 45 },
        { name: 'Wall Angel', sets: 3, reps: 10, rest: 60 },
        { name: 'Cat-Cow Stretch', sets: 1, reps: '2 menit', rest: 0 }
      ]
    },
    {
      id: 4,
      day: 4,
      name: 'Full Body B',
      estimatedTime: 35,
      exercises: [
        { name: 'Lunges', sets: 3, reps: '12 per kaki', rest: 60 },
        { name: 'Pike Push-up', sets: 3, reps: '8-10', rest: 60 },
        { name: 'Side Plank', sets: 3, reps: '20-30 detik per sisi', rest: 45 },
        { name: 'Step-up', sets: 3, reps: '12 per kaki', rest: 60 },
        { name: 'Dead Bug', sets: 3, reps: '12 per sisi', rest: 45 }
      ]
    },
    {
      id: 5,
      day: 5,
      name: 'Core & Mobility',
      estimatedTime: 30,
      exercises: [
        { name: 'Plank to Push-up', sets: 3, reps: 10, rest: 60 },
        { name: 'Russian Twist', sets: 3, reps: 20, rest: 60 },
        { name: 'Hollow Body Hold', sets: 3, reps: '20-30 detik', rest: 45 },
        { name: 'Hip Flexor Stretch', sets: 1, reps: '2 menit per sisi', rest: 30 },
        { name: 'Thoracic Spine Rotation', sets: 2, reps: '10 per sisi', rest: 45 }
      ]
    }
  ];

  const init = function() {
    const existing = Storage.get(STORAGE_KEY);
    if (!existing) {
      Storage.set(STORAGE_KEY, defaultWorkouts);
    }
  };

  const getAll = function() {
    return Storage.get(STORAGE_KEY) || [];
  };

  const getById = function(id) {
    const workouts = getAll();
    return workouts.find(w => w.id === id) || null;
  };

  const getByDay = function(day) {
    const workouts = getAll();
    return workouts.find(w => w.day === day) || null;
  };

  const add = function(workout) {
    const workouts = getAll();
    workout.id = Date.now();
    workouts.push(workout);
    Storage.set(STORAGE_KEY, workouts);
    return workout;
  };

  const update = function(id, updates) {
    const workouts = getAll();
    const index = workouts.findIndex(w => w.id === id);
    if (index !== -1) {
      workouts[index] = { ...workouts[index], ...updates };
      Storage.set(STORAGE_KEY, workouts);
      return workouts[index];
    }
    return null;
  };

  const remove = function(id) {
    const workouts = getAll();
    const filtered = workouts.filter(w => w.id !== id);
    Storage.set(STORAGE_KEY, filtered);
  };

  return {
    init: init,
    getAll: getAll,
    getById: getById,
    getByDay: getByDay,
    add: add,
    update: update,
    remove: remove
  };
})();

Workout.init();
