import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { normalizeList } from '../../utils/firestore';
import * as service from './clientsService';

export const fetchClients = createAsyncThunk('clients/fetch', () => service.getClients());

export const createClient = createAsyncThunk('clients/create', async (data, { rejectWithValue }) => {
  try {
    return await service.addClient(data);
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const saveClient = createAsyncThunk('clients/save', async ({ id, data }) => {
  await service.updateClient(id, data);
  return service.getClientById(id);
});

const clientsSlice = createSlice({
  name: 'clients',
  initialState: {
    byId: {},
    allIds: [],
    status: 'idle',
    error: null,
    filters: { search: '', salesmanId: '', city: '', activeOnly: true },
  },
  reducers: {
    setClientsFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    upsertClient(state, action) {
      const item = action.payload;
      if (!state.byId[item.id]) state.allIds.push(item.id);
      state.byId[item.id] = { ...state.byId[item.id], ...item };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        const { byId, allIds } = normalizeList(action.payload);
        state.byId = byId;
        state.allIds = allIds;
        state.status = 'succeeded';
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createClient.fulfilled, (state, action) => {
        const item = action.payload;
        state.byId[item.id] = item;
        if (!state.allIds.includes(item.id)) state.allIds.push(item.id);
      })
      .addCase(saveClient.fulfilled, (state, action) => {
        if (action.payload) state.byId[action.payload.id] = action.payload;
      });
  },
});

export const { setClientsFilters, upsertClient } = clientsSlice.actions;
export default clientsSlice.reducer;
