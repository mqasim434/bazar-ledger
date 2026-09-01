import { createSlice } from '@reduxjs/toolkit';

const empty = { byId: {}, allIds: [], status: 'idle', error: null, filters: {} };

function makeListSlice(name) {
  return createSlice({
    name,
    initialState: empty,
    reducers: {
      setList(state, action) {
        const items = action.payload || [];
        state.byId = {};
        state.allIds = [];
        items.forEach((item) => {
          state.byId[item.id] = item;
          state.allIds.push(item.id);
        });
        state.status = 'succeeded';
      },
      setStatus(state, action) {
        state.status = action.payload;
      },
      setFilters(state, action) {
        state.filters = { ...state.filters, ...action.payload };
      },
    },
  });
}

export const transactionsSlice = makeListSlice('transactions');
export default transactionsSlice.reducer;
export const {
  setList: setTransactions,
  setStatus: setTransactionsStatus,
  setFilters: setTransactionsFilters,
} = transactionsSlice.actions;
