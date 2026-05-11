import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { applicationsApi, documentTypesApi } from '../../services/api'

// tired of writing e?.response?.data?.error everywhere
const extractErr = (e) =>
  e?.response?.data?.error || e?.response?.data?.message || 'Something went wrong'

// generic thunk factory - avoids repeating try/catch 7 times
const thunk = (type, fn) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg)
    } catch (e) {
      return rejectWithValue(extractErr(e))
    }
  })

export const fetchApplications   = thunk('apps/list',     ()   => applicationsApi.list())
export const fetchApplication    = thunk('apps/getOne',   (id) => applicationsApi.get(id))
export const fetchDocumentTypes  = thunk('apps/docTypes', ()   => documentTypesApi.list())
export const createApplication   = thunk('apps/create',   (b)  => applicationsApi.create(b))
export const submitApplication   = thunk('apps/submit',   (id) => applicationsApi.submit(id))
export const resubmitApplication = thunk('apps/resubmit', (id) => applicationsApi.resubmit(id))

// upload needs the documentType in the reject payload so it can't use the wrapper above
export const uploadDocument = createAsyncThunk(
  'apps/uploadDoc',
  async ({ applicationId, file, documentType }, { rejectWithValue }) => {
    try {
      const doc = await applicationsApi.uploadDocument(applicationId, file, documentType)
      return { doc, documentType }
    } catch (err) {
      return rejectWithValue({ error: extractErr(err), documentType })
    }
  }
)

// cuts the boilerplate per-thunk from ~9 lines to 3
// TODO: move to a shared utils if more slices need it
function asyncCases(builder, t, loadKey, errKey, onDone) {
  builder
    .addCase(t.pending, (state) => {
      state[loadKey] = true
      if (errKey) state[errKey] = null
    })
    .addCase(t.fulfilled, (state, { payload }) => {
      state[loadKey] = false
      onDone?.(state, payload)
    })
    .addCase(t.rejected, (state, { payload }) => {
      state[loadKey] = false
      if (errKey) state[errKey] = payload
    })
}

const applicationsSlice = createSlice({
  name: 'applications',
  initialState: {
    list: [],
    loading: false,
    listError: null,

    docTypes: [],
    loadingDocTypes: false,

    // draft flow
    draft: null,
    creating: false,
    createError: null,

    uploadingMap: {},  // { [docType]: 'loading' | 'success' | 'error' }
    uploadErrors: {},

    submitting: false,
    submitError: null,

    // detail view
    viewed: null,
    viewedLoading: false,
    viewedError: null,

    resubmitting: false,
    resubmitError: null,
  },

  reducers: {
    resetDraftState(state) {
      state.draft        = null
      state.creating     = false
      state.uploadingMap = {}
      state.uploadErrors = {}
      state.submitting   = false
      state.submitError  = null
      state.createError  = null
    },
    resetViewedApp(state) {
      state.viewed        = null
      state.viewedLoading = false
      state.viewedError   = null
      state.resubmitting  = false
      state.resubmitError = null
      state.uploadingMap  = {}
      state.uploadErrors  = {}
    },
    clearSubmitErr(state)   { state.submitError   = null },
    clearResubmitErr(state) { state.resubmitError = null },
  },

  extraReducers: (builder) => {
    asyncCases(builder, fetchApplications, 'loading', 'listError', (state, list) => {
      state.list = list
    })

    asyncCases(builder, fetchApplication, 'viewedLoading', 'viewedError', (state, app) => {
      state.viewed = app
    })

    asyncCases(builder, fetchDocumentTypes, 'loadingDocTypes', null, (state, types) => {
      state.docTypes = types
    })

    asyncCases(builder, createApplication, 'creating', 'createError', (state, app) => {
      state.draft = app
    })

    asyncCases(builder, submitApplication, 'submitting', 'submitError', (state, app) => {
      state.draft  = app
      state.viewed = app
      const idx = state.list.findIndex(a => a.id === app.id)
      if (idx !== -1) state.list[idx] = app
    })

    asyncCases(builder, resubmitApplication, 'resubmitting', 'resubmitError', (state, app) => {
      state.viewed = app
      const idx = state.list.findIndex(a => a.id === app.id)
      if (idx !== -1) state.list[idx] = app
    })

    // upload is a snowflake - reject payload has shape { error, documentType }
    builder
      .addCase(uploadDocument.pending, (state, { meta }) => {
        const dt = meta.arg.documentType
        state.uploadingMap[dt] = 'loading'
        delete state.uploadErrors[dt]
      })
      .addCase(uploadDocument.fulfilled, (state, { payload }) => {
        const { doc, documentType: dt } = payload
        state.uploadingMap[dt] = 'success'
        // update the doc in whichever of draft/viewed is currently loaded
        for (const target of [state.draft, state.viewed]) {
          if (!target) continue
          if (!target.documents) target.documents = []
          const i = target.documents.findIndex(d => d.document_type === dt)
          if (i !== -1) target.documents[i] = doc
          else          target.documents.push(doc)
        }
      })
      .addCase(uploadDocument.rejected, (state, { payload }) => {
        state.uploadingMap[payload.documentType] = 'error'
        state.uploadErrors[payload.documentType] = payload.error
      })
  },
})

export const { resetDraftState, resetViewedApp, clearSubmitErr, clearResubmitErr } = applicationsSlice.actions
export default applicationsSlice.reducer

export const selectApplicationList   = (s) => s.applications.list
export const selectListLoading       = (s) => s.applications.loading
export const selectDocumentTypes     = (s) => s.applications.docTypes
export const selectCurrentDraft      = (s) => s.applications.draft
export const selectCreateLoading     = (s) => s.applications.creating
export const selectUploadStatus      = (s) => s.applications.uploadingMap
export const selectUploadErrors      = (s) => s.applications.uploadErrors
export const selectSubmitLoading     = (s) => s.applications.submitting
export const selectViewedApplication = (s) => s.applications.viewed
export const selectResubmitLoading   = (s) => s.applications.resubmitting

export const selectActiveApplication = (s) => {
  const done = ['APPROVED', 'REJECTED']
  return s.applications.list.find(a => !done.includes(a.status)) ?? null
}

export const resetViewed          = resetViewedApp
export const clearSubmitError     = clearSubmitErr
export const clearResubmitError   = clearResubmitErr
export const selectViewedApp      = selectViewedApplication
export const selectViewedStatus   = (s) => s.applications.viewedLoading
export const selectViewedError    = (s) => s.applications.viewedError
export const selectDocTypesStatus = (s) => s.applications.loadingDocTypes
export const selectUploadStatuses = selectUploadStatus
export const selectSubmitStatus   = selectSubmitLoading
export const selectSubmitError    = (s) => s.applications.submitError
export const selectResubmitStatus = selectResubmitLoading
export const selectResubmitError  = (s) => s.applications.resubmitError
export const selectListStatus     = selectListLoading
export const selectListError      = (s) => s.applications.listError
export const selectPendingApplication = selectActiveApplication
export const selectCurrentApp     = selectCurrentDraft
export const selectCreateStatus   = selectCreateLoading
export const selectCreateError    = (s) => s.applications.createError
export const resetDraft           = resetDraftState
