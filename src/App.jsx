import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated, selectUser } from "./features/auth/authSlice";
import { getRoleHomePath } from "./utils/roles";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ApplicantDashboard from "./pages/applicant/ApplicantDashboard";
import NewApplicationPage from "./pages/applicant/NewApplicationPage";
import ApplicationDetailPage from "./pages/applicant/ApplicationDetailPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminApplicationDetail from "./pages/admin/AdminApplicationDetail";
import AdminAuditPage from "./pages/admin/AdminAuditPage";

function RootRedirect() {
  const isAuth = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  if (!isAuth) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleHomePath(user?.role)} replace />;
}

function ApplicantOnly({ children }) {
  return <ProtectedRoute requireAdmin={false}>{children}</ProtectedRoute>;
}

function AdminOnly({ children }) {
  return <ProtectedRoute requireAdmin={true}>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/dashboard"
          element={
            <ApplicantOnly>
              <ApplicantDashboard />
            </ApplicantOnly>
          }
        />
        <Route
          path="/dashboard/new"
          element={
            <ApplicantOnly>
              <NewApplicationPage />
            </ApplicantOnly>
          }
        />
        <Route
          path="/dashboard/applications/:id"
          element={
            <ApplicantOnly>
              <ApplicationDetailPage />
            </ApplicantOnly>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminOnly>
              <AdminDashboard />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/applications/:id"
          element={
            <AdminOnly>
              <AdminApplicationDetail />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <AdminOnly>
              <AdminAuditPage />
            </AdminOnly>
          }
        />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
