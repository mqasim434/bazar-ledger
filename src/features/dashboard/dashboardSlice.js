import { createSlice } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'dashboard',
  initialState: { summary: null, status: 'idle', error: null },
  reducers: {},
});
export default slice.reducer;
