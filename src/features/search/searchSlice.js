import { createSlice } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'search',
  initialState: { query: '', results: { clients: [], salesmen: [] }, status: 'idle' },
  reducers: {
    setQuery(state, action) {
      state.query = action.payload;
    },
  },
});
export const { setQuery } = slice.actions;
export default slice.reducer;
