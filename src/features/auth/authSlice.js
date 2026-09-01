import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { assertStaffProfile, getUserProfile, signIn, signOutUser } from './authService';

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { user, profile } = await signIn(email, password);
      assertStaffProfile(profile, user.uid);
      return {
        user: { uid: user.uid, email: user.email },
        profile,
      };
    } catch (err) {
      try {
        await signOutUser();
      } catch {
        /* already signed out or auth not ready */
      }
      return rejectWithValue(err.message || 'Login failed');
    }
  },
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await signOutUser();
});

export const restoreSession = createAsyncThunk(
  'auth/restore',
  async (firebaseUser, { rejectWithValue }) => {
    if (!firebaseUser) return { user: null, profile: null };
    try {
      const profile = await getUserProfile(firebaseUser.uid);
      assertStaffProfile(profile, firebaseUser.uid);
      return {
        user: { uid: firebaseUser.uid, email: firebaseUser.email },
        profile,
      };
    } catch (err) {
      try {
        await signOutUser();
      } catch {
        /* ignore */
      }
      return rejectWithValue(err.message);
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    profile: null,
    status: 'idle',
    error: null,
  },
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.profile = action.payload.profile;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Login failed';
        state.user = null;
        state.profile = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.profile = null;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(restoreSession.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.error = null;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        state.status = 'succeeded';
        state.user = null;
        state.profile = null;
        state.error = action.payload || null;
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
