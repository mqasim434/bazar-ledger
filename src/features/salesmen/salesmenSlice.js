import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { normalizeList } from '../../utils/firestore';
import * as service from './salesmenService';

export const fetchSalesmen = createAsyncThunk('salesmen/fetch', async (opts) => {
  return service.getSalesmen(opts);
});

export const createSalesman = createAsyncThunk('salesmen/create', async (data) => {
  return service.addSalesman(data);
});

export const saveSalesman = createAsyncThunk('salesmen/save', async ({ id, data }) => {
  await service.updateSalesman(id, data);
  return service.getSalesmanById(id);
});

export const setSalesmanActive = createAsyncThunk(
  'salesmen/setActive',
  async ({ id, active }) => {
    await service.deactivateSalesman(id, active);
    return { id, active };
  },
);

const salesmenSlice = createSlice({
  name: 'salesmen',
  initialState: {
    byId: {},
    allIds: [],
    status: 'idle',
    error: null,
    filters: { search: '', area: '', activeOnly: true },
  },
  reducers: {
    setSalesmenFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    upsertSalesman(state, action) {
      const item = action.payload;
      if (!state.byId[item.id]) state.allIds.push(item.id);
      state.byId[item.id] = { ...state.byId[item.id], ...item };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalesmen.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSalesmen.fulfilled, (state, action) => {
        const { byId, allIds } = normalizeList(action.payload);
        state.byId = byId;
        state.allIds = allIds;
        state.status = 'succeeded';
      })
      .addCase(fetchSalesmen.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createSalesman.fulfilled, (state, action) => {
        const item = action.payload;
        state.byId[item.id] = item;
        if (!state.allIds.includes(item.id)) state.allIds.push(item.id);
      })
      .addCase(saveSalesman.fulfilled, (state, action) => {
        const item = action.payload;
        if (item) state.byId[item.id] = item;
      })
      .addCase(setSalesmanActive.fulfilled, (state, action) => {
        const { id, active } = action.payload;
        if (state.byId[id]) state.byId[id].active = active;
      });
  },
});

export const { setSalesmenFilters, upsertSalesman } = salesmenSlice.actions;
export default salesmenSlice.reducer;
