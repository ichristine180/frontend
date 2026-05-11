import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faUser,
  faRightFromBracket,
  faLandmark,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { logout, selectUser } from "../features/auth/authSlice";
import { ROLE_LABELS } from "../utils/roles";

export default function Layout({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-bnr-cream flex flex-col">
      <header className="bg-white border-b border-bnr-cream-dark shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-bnr-brown flex items-center justify-center shrink-0 group-hover:bg-bnr-brown-light transition-colors">
              <FontAwesomeIcon
                icon={faHome}
                className="text-bnr-gold w-4 h-4"
              />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-bold text-bnr-brown tracking-wide uppercase flex items-center gap-1">
                National Bank of Rwanda
              </p>
              <p className="text-[10px] text-bnr-gold font-medium tracking-wider uppercase">
                Banki Nkuru y'u Rwanda
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-bnr-brown flex items-center justify-end gap-1.5">
                <FontAwesomeIcon
                  icon={faUser}
                  className="text-bnr-gold text-[10px]"
                />
                {user?.full_name || user?.email}
              </p>
              <p className="text-[10px] text-bnr-gold font-medium uppercase tracking-wider">
                {ROLE_LABELS[user?.role] ?? user?.role}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-medium text-bnr-brown border border-bnr-brown px-3 py-1.5 rounded hover:bg-bnr-brown hover:text-white transition-colors"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {children}
      </main>

      <footer className="border-t border-bnr-cream-dark py-4">
        <p className="text-center text-xs text-bnr-brown-light flex items-center justify-center gap-1.5">
          <FontAwesomeIcon icon={faCircleInfo} className="text-bnr-gold" />
          Bank Licensing &amp; Compliance Portal
        </p>
      </footer>
    </div>
  );
}
