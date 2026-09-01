import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { normalizeList } from '../../utils/firestore';
import * as service from './inventoryService';

export const fetchInventory = createAsyncThunk('inventory/fetch', () => service.getInventory());

export const createItem = createAsyncThunk('inventory/create', (data) => service.addItem(data));

export const saveItem = createAsyncThunk('inventory/save', async ({ id, data }) => {
  await service.updateItem(id, data);
  return service.getItemById(id);
});

export const adjustItemStock = createAsyncThunk(
  'inventory/adjust',
  async ({ itemId, deltaYards, reason, adjustedBy }) => {
    await service.adjustStock(itemId, deltaYards, reason, adjustedBy);
    return service.getItemById(itemId);
  },
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: {
    byId: {},
    allIds: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    upsertItem(state, action) {
      const item = action.payload;
      if (!state.byId[item.id]) state.allIds.push(item.id);
      state.byId[item.id] = { ...state.byId[item.id], ...item };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        const { byId, allIds } = normalizeList(action.payload);
        state.byId = byId;
        state.allIds = allIds;
        state.status = 'succeeded';
      })
      .addCase(createItem.fulfilled, (state, action) => {
        const item = action.payload;
        state.byId[item.id] = item;
        if (!state.allIds.includes(item.id)) state.allIds.push(item.id);
      })
      .addCase(saveItem.fulfilled, (state, action) => {
        if (action.payload) state.byId[action.payload.id] = action.payload;
      })
      .addCase(adjustItemStock.fulfilled, (state, action) => {
        if (action.payload) state.byId[action.payload.id] = action.payload;
      });
  },
});

export const { upsertItem } = inventorySlice.actions;
export default inventorySlice.reducer;
