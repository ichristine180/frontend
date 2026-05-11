import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { applicationsApi, auditApi } from '../../services/api'

// same pattern as applicationsSlice - probably should extract to a shared util at some point
const extractErr = (e) =>
  e?.response?.data?.error || e?.response?.data?.message || 'Request failed'

const thunk = (type, fn) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg)
    } catch (e) {
      return rejectWithValue(extractErr(e))
    }
  })

export const fetchAdminApplications = thunk('admin/listAll', () => applicationsApi.list())
export const fetchAdminApplication  = thunk('admin/getById', (id) => applicationsApi.get(id))
export const fetchAdminAudit        = thunk('admin/fetchAudit', (id) => applicationsApi.getAudit(id))
export const fetchSystemAudit       = thunk('admin/fetchSystemAudit', () => auditApi.getSystemAudit())

// workflow actions - all need a reason/body so can't use the one-liner thunk above
export const adminStartReview = createAsyncThunk(
  'admin/startReview',
  async (id, { rejectWithValue }) => {
    try {
      return await applicationsApi.startReview(id)
    } catch (e) {
      return rejectWithValue(extractErr(e))
    }
  }
)

export const adminRequestInfo = createAsyncThunk(
  'admin/requestInfo',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      return await applicationsApi.requestInfo(id, reason)
    } catch (e) {
      return rejectWithValue(extractErr(e))
    }
  }
)

export const adminCompleteReview = createAsyncThunk(
  'admin/completeReview',
  async ({ id, reviewNotes }, { rejectWithValue }) => {
    try {
      return await applicationsApi.completeReview(id, reviewNotes)
    } catch (e) {
      return rejectWithValue(extractErr(e))
    }
  }
)

export const adminApprove = createAsyncThunk(
  'admin/approve',
  async (id, { rejectWithValue }) => {
    try {
      return await applicationsApi.approve(id)
    } catch (e) {
      return rejectWithValue(extractErr(e))
    }
  }
)

export const adminReject = createAsyncThunk(
  'admin/reject',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      return await applicationsApi.reject(id, reason)
    } catch (e) {
      return rejectWithValue(extractErr(e))
    }
  }
)

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    items: [],
    loading: false,
    error: null,

    current: null,
    currentLoading: false,
    currentError: null,

    appAudit: [],
    auditLoading: false,

    // shared loading/error for all the workflow buttons
    actionLoading: false,
    actionError: null,

    systemAudit: [],
    systemAuditLoading: false,
    systemAuditError: null,
  },

  reducers: {
    clearErrors(state) {
      state.actionError = null
      state.error       = null
    },
    resetAdminState(state) {
      state.current       = null
      state.appAudit      = []
      state.actionError   = null
      state.actionLoading = false
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminApplications.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(fetchAdminApplications.fulfilled, (state, { payload }) => {
        state.loading = false
        state.items   = payload
      })
      .addCase(fetchAdminApplications.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })

    builder
      .addCase(fetchAdminApplication.pending, (state) => {
        state.currentLoading = true
        state.currentError   = null
      })
      .addCase(fetchAdminApplication.fulfilled, (state, { payload }) => {
        state.currentLoading = false
        state.current        = payload
      })
      .addCase(fetchAdminApplication.rejected, (state, { payload }) => {
        state.currentLoading = false
        state.currentError   = payload
      })

    // audit logs don't need a loading flag in state right now - just update on success
    // TODO: add loading indicator if we want a skeleton in the UI
    builder.addCase(fetchAdminAudit.fulfilled, (state, { payload }) => {
      state.appAudit     = payload
      state.auditLoading = false
    })

    builder
      .addCase(fetchSystemAudit.pending, (state) => {
        state.systemAuditLoading = true
        state.systemAuditError   = null
      })
      .addCase(fetchSystemAudit.fulfilled, (state, { payload }) => {
        state.systemAuditLoading = false
        state.systemAudit        = payload
      })
      .addCase(fetchSystemAudit.rejected, (state, { payload }) => {
        state.systemAuditLoading = false
        state.systemAuditError   = payload
      })

    // all workflow actions share the same loading state and fulfilled handler
    const workflowActions = [
      adminStartReview,
      adminRequestInfo,
      adminCompleteReview,
      adminApprove,
      adminReject,
    ]

    workflowActions.forEach(action => {
      builder.addCase(action.pending, (state) => {
        state.actionLoading = true
        state.actionError   = null
      })
      builder.addCase(action.fulfilled, (state, { payload }) => {
        state.actionLoading = false
        // preserve documents since workflow endpoints don't return them
        state.current = { ...payload, documents: state.current?.documents || [] }
        const idx = state.items.findIndex(i => i.id === payload.id)
        if (idx !== -1) state.items[idx] = payload
      })
      builder.addCase(action.rejected, (state, { payload }) => {
        state.actionLoading = false
        state.actionError   = payload
      })
    })
  },
})

export const { clearErrors, resetAdminState } = adminSlice.actions
export default adminSlice.reducer

export const selectAdminList     = (s) => s.admin.items
export const selectAdminCurrent  = (s) => s.admin.current
export const selectAdminAudit    = (s) => s.admin.appAudit
export const selectActionLoading = (s) => s.admin.actionLoading
export const selectSystemAudit   = (s) => s.admin.systemAudit

// aliases
export const clearActionError        = clearErrors
export const resetViewed             = resetAdminState
export const selectAdminViewed       = selectAdminCurrent
export const selectAdminViewedStatus  = (s) => s.admin.currentLoading
export const selectAdminViewedError   = (s) => s.admin.currentError
export const selectAdminAuditStatus   = (s) => s.admin.auditLoading
export const selectActionStatus       = selectActionLoading
export const selectActionError        = (s) => s.admin.actionError
export const selectSystemAuditStatus  = (s) => s.admin.systemAuditLoading
export const selectSystemAuditError   = (s) => s.admin.systemAuditError
export const selectAdminListStatus    = (s) => s.admin.loading
export const selectAdminListError     = (s) => s.admin.error
