import { createSlice } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'returns',
  initialState: { byId: {}, allIds: [], status: 'idle', error: null, filters: {} },
  reducers: {},
});
export default slice.reducer;
