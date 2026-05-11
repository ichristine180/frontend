import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../../services/api'

// pulls persisted session from localStorage - key must match what api.js uses
const loadSession = () => {
  try {
    const raw = localStorage.getItem('auth_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const session = loadSession()

export const registerUser = createAsyncThunk(
  'auth/signup',
  async (formData, { rejectWithValue }) => {
    try {
      return await authApi.register(formData)
    } catch (e) {
      return rejectWithValue(e.response?.data?.error || 'Could not register')
    }
  }
)

export const login = createAsyncThunk(
  'auth/doLogin',
  async (creds, { rejectWithValue }) => {
    try {
      return await authApi.login(creds)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Login failed'
      return rejectWithValue(msg)
    }
  }
)

// logout never throws - we clear state regardless of whether the server call succeeds
export const logout = createAsyncThunk('auth/doLogout', async (_, { getState }) => {
  const { refresh } = getState().auth
  try {
    if (refresh) await authApi.logout(refresh)
  } catch {
    // fail silently - token may already be expired
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:      session?.user         || null,
    token:     session?.accessToken  || null,
    refresh:   session?.refreshToken || null,
    loading:   false,
    authError: null,

    regLoading:   false,
    regSucceeded: false,  // tracked separately so components can show success state
    regError:     null,
  },

  reducers: {
    resetErrors(state) {
      state.authError      = null
      state.regError       = null
      state.regSucceeded   = false
    },
    updateTokens(state, { payload }) {
      state.token   = payload.accessToken
      state.refresh = payload.refreshToken
    },
    purgeAuth(state) {
      state.user    = null
      state.token   = null
      state.refresh = null
      state.loading = false
      localStorage.removeItem('auth_session')
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading   = true
        state.authError = null
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.loading = false
        state.user    = payload.user
        state.token   = payload.accessToken
        state.refresh = payload.refreshToken
        localStorage.setItem('auth_session', JSON.stringify(payload))
      })
      .addCase(login.rejected, (state, { payload }) => {
        state.loading   = false
        state.authError = payload
      })

    // clear everything on logout regardless of fulfilled/rejected
    const wipeState = (state) => {
      state.user    = null
      state.token   = null
      state.refresh = null
      state.loading = false
      localStorage.removeItem('auth_session')
    }
    builder.addCase(logout.fulfilled, wipeState)
    builder.addCase(logout.rejected,  wipeState)

    builder
      .addCase(registerUser.pending, (state) => {
        state.regLoading   = true
        state.regSucceeded = false
        state.regError     = null
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.regLoading   = false
        state.regSucceeded = true
      })
      .addCase(registerUser.rejected, (state, { payload }) => {
        state.regLoading = false
        state.regError   = payload
      })
  },
})

export const { resetErrors, updateTokens, purgeAuth } = authSlice.actions
export default authSlice.reducer

export const selectCurrentUser  = (s) => s.auth.user
export const selectIsLoggedIn   = (s) => !!s.auth.token
export const selectAuthLoading  = (s) => s.auth.loading
export const selectLoginError   = (s) => s.auth.authError

export const selectRegStatus = (s) => {
  if (s.auth.regLoading)   return 'loading'
  if (s.auth.regSucceeded) return 'succeeded'
  return 'idle'
}

// aliases
export const selectUser           = selectCurrentUser
export const selectIsAuthenticated = selectIsLoggedIn
export const selectAuthStatus     = (s) => s.auth.loading ? 'loading' : 'idle'
export const selectAuthError      = selectLoginError
export const selectRegisterStatus = selectRegStatus
export const selectRegisterError  = (s) => s.auth.regError
export const register             = registerUser
export const clearError           = resetErrors
export const clearRegisterStatus  = resetErrors
