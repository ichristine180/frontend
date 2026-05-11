import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import applicationsReducer from '../features/applications/applicationsSlice'
import adminReducer from '../features/admin/adminSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    applications: applicationsReducer,
    admin: adminReducer,
  },
})
