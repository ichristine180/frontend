import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLandmark,
  faShield,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import {
  login,
  clearError,
  selectAuthLoading,
  selectAuthError,
  selectUser,
} from "../features/auth/authSlice";
import { getRoleHomePath } from "../utils/roles";

// shared input style - same as RegisterPage, TODO: extract to a constants file
const inputCls =
  "w-full px-3 py-2.5 border border-bnr-cream-dark rounded text-sm text-bnr-brown placeholder-bnr-brown-light/50 focus:outline-none focus:ring-2 focus:ring-bnr-gold focus:border-transparent disabled:bg-bnr-cream/50";

export default function LoginPage() {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const user = useSelector(selectUser);

  const [form, setForm] = useState({ email: "", password: "" });

  if (user) return <Navigate to={getRoleHomePath(user.role)} replace />;

  const handleChange = (e) => {
    dispatch(clearError());
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    dispatch(login(form));
  };

  return (
    <div className="min-h-screen bg-bnr-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-bnr-brown rounded-full mb-4 shadow">
            <FontAwesomeIcon icon={faShield} className="text-bnr-gold text-xl" />
          </div>
          <h1 className="text-lg font-bold text-bnr-brown tracking-wide uppercase flex items-center justify-center gap-2">
            <FontAwesomeIcon icon={faLandmark} className="text-bnr-gold" />
            National Bank of Rwanda
          </h1>
          <p className="text-xs text-bnr-gold font-medium tracking-widest uppercase mt-0.5">
            Banki Nkuru y'u Rwanda
          </p>
          <p className="text-sm text-bnr-brown-mid mt-3">
            Bank Licensing Compliance Portal
          </p>
        </div>
        <div className="bg-white border border-bnr-cream-dark rounded-lg p-8 shadow-sm">
          <h2 className="text-sm font-semibold text-bnr-brown mb-6 uppercase tracking-wide">
            Sign in to your account
          </h2>

          {error && (
            <div
              role="alert"
              className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-bnr-brown uppercase tracking-wide mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                disabled={isLoading}
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-bnr-brown uppercase tracking-wide mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
                disabled={isLoading}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !form.email || !form.password}
              className="w-full py-2.5 px-4 bg-bnr-gold text-white text-sm font-semibold rounded hover:bg-bnr-gold-light focus:outline-none focus:ring-2 focus:ring-bnr-gold focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wide flex items-center justify-center gap-2"
            >
              {isLoading && <FontAwesomeIcon icon={faSpinner} spin />}
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-bnr-brown-light">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-bnr-gold font-medium hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
