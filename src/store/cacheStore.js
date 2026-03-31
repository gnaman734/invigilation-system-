import { create } from 'zustand';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function isFresh(updatedAt) {
  if (!updatedAt) {
    return false;
  }

  return Date.now() - updatedAt < FIVE_MINUTES_MS;
}

export const useCacheStore = create((set, get) => ({
  instructors: [],
  instructorsUpdatedAt: 0,
  exams: [],
  examsUpdatedAt: 0,
  rooms: [],
  roomsUpdatedAt: 0,

  setInstructors: (instructors) =>
    set({ instructors: Array.isArray(instructors) ? instructors : [], instructorsUpdatedAt: Date.now() }),

  setExams: (exams) => set({ exams: Array.isArray(exams) ? exams : [], examsUpdatedAt: Date.now() }),

  setRooms: (rooms) => set({ rooms: Array.isArray(rooms) ? rooms : [], roomsUpdatedAt: Date.now() }),

  getFreshInstructors: () => {
    const state = get();
    return isFresh(state.instructorsUpdatedAt) ? state.instructors : null;
  },

  getFreshExams: () => {
    const state = get();
    return isFresh(state.examsUpdatedAt) ? state.exams : null;
  },

  getFreshRooms: () => {
    const state = get();
    return isFresh(state.roomsUpdatedAt) ? state.rooms : null;
  },
}));
