import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
    },
  },
});

export const { setUser, setLoading, setToken, logout } = authSlice.actions;
export default authSlice.reducer;
