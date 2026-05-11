import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { selectIsAuthenticated, selectUser } from '../features/auth/authSlice'
import { isAdminRole, getRoleHomePath } from '../utils/roles'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const isAuth = useSelector(selectIsAuthenticated)
  const user = useSelector(selectUser)
  const location = useLocation()

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const userIsAdmin = isAdminRole(user?.role)


  if (requireAdmin && !userIsAdmin) {
    return <Navigate to="/dashboard" replace />
  }


  if (!requireAdmin && userIsAdmin) {
    return <Navigate to="/admin" replace />
  }

  return children
}
