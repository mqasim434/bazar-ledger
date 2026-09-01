import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    toasts: [],
  },
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = action.payload;
    },
    pushToast(state, action) {
      state.toasts.push({
        id: Date.now() + Math.random(),
        tone: action.payload.tone || 'default',
        message: action.payload.message,
      });
    },
    dismissToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { toggleSidebar, setSidebarCollapsed, pushToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;
