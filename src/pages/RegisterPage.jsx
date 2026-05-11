import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShield,
  faLandmark,
  faSpinner,
  faCircleCheck,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import {
  register,
  clearRegisterStatus,
  selectUser,
  selectRegisterStatus,
  selectRegisterError,
} from "../features/auth/authSlice";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const inputCls =
  "w-full px-3 py-2.5 border border-bnr-cream-dark rounded text-sm text-bnr-brown placeholder-bnr-brown-light/50 focus:outline-none focus:ring-2 focus:ring-bnr-gold focus:border-transparent disabled:bg-bnr-cream/50";

function Field({ id, label, error, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-bnr-brown uppercase tracking-wide mb-1.5"
      >
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const EMPTY = {
  full_name: "",
  email: "",
  organization: "",
  password: "",
  confirm_password: "",
};

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const status = useSelector(selectRegisterStatus);
  const serverError = useSelector(selectRegisterError);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [succeeded, setSucceeded] = useState(false);

  const wasLoading = useRef(false);

  useEffect(() => {
    if (wasLoading.current && status !== "loading" && !serverError) {
      setSucceeded(true);
    }
    wasLoading.current = status === "loading";
  }, [status, serverError]);

  useEffect(() => {
    if (!succeeded) return;
    const t = setTimeout(() => {
      dispatch(clearRegisterStatus());
      navigate("/login", { replace: true });
    }, 2500);
    return () => clearTimeout(t);
  }, [succeeded, dispatch, navigate]);

  if (user) return <Navigate to="/" replace />;

  const validate = (f = form) => {
    const e = {};
    if (!f.full_name.trim()) e.full_name = "Full name is required";
    if (!f.email.trim()) {
      e.email = "Email address is required";
    } else if (!EMAIL_RE.test(f.email.trim())) {
      e.email = "Enter a valid email address";
    }
    if (!f.password) {
      e.password = "Password is required";
    } else if (f.password.length < 8) {
      e.password = "Password must be at least 8 characters";
    }
    if (!f.confirm_password) {
      e.confirm_password = "Please confirm your password";
    } else if (f.password !== f.confirm_password) {
      e.confirm_password = "Passwords do not match";
    }
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name])
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const fieldError = validate()[name];
    if (fieldError) setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    dispatch(
      register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        organization: form.organization.trim() || undefined,
      }),
    );
  };

  const isLoading = status === "loading";
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="min-h-screen bg-bnr-cream flex items-center justify-center px-4 py-10">
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
            Create an applicant account
          </h2>

          {succeeded && (
            <div
              role="status"
              className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faCircleCheck} />
              Account created successfully! Redirecting to sign in…
            </div>
          )}

          {serverError && !succeeded && (
            <div
              role="alert"
              className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faTriangleExclamation} />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field id="full_name" label="Full name" error={errors.full_name}>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                value={form.full_name}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading || succeeded}
                className={`${inputCls} ${errors.full_name ? "border-red-400 focus:ring-red-400" : ""}`}
                placeholder="Jean-Pierre Habimana"
              />
            </Field>

            <Field id="email" label="Email address" error={errors.email}>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading || succeeded}
                className={`${inputCls} ${errors.email ? "border-red-400 focus:ring-red-400" : ""}`}
                placeholder="you@institution.rw"
              />
            </Field>

            <Field id="organization" label="Organization (optional)">
              <input
                id="organization"
                name="organization"
                type="text"
                autoComplete="organization"
                value={form.organization}
                onChange={handleChange}
                disabled={isLoading || succeeded}
                className={inputCls}
                placeholder="Institution or company name"
              />
            </Field>

            <Field id="password" label="Password" error={errors.password}>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading || succeeded}
                className={`${inputCls} ${errors.password ? "border-red-400 focus:ring-red-400" : ""}`}
                placeholder="Minimum 8 characters"
              />
            </Field>

            <Field
              id="confirm_password"
              label="Confirm password"
              error={errors.confirm_password}
            >
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading || succeeded}
                className={`${inputCls} ${errors.confirm_password ? "border-red-400 focus:ring-red-400" : ""}`}
                placeholder="••••••••"
              />
            </Field>

            <button
              type="submit"
              disabled={isLoading || hasErrors || succeeded}
              className="w-full py-2.5 px-4 bg-bnr-gold text-white text-sm font-semibold rounded hover:bg-bnr-gold-light focus:outline-none focus:ring-2 focus:ring-bnr-gold focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wide flex items-center justify-center gap-2"
            >
              {isLoading && <FontAwesomeIcon icon={faSpinner} spin />}
              {isLoading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-bnr-brown-light">
            Already have an account?{" "}
            <Link to="/login" className="text-bnr-gold font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
