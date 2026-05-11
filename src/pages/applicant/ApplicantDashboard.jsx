import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faChevronRight,
  faFileLines,
  faTriangleExclamation,
  faSpinner,
  faArrowsRotate,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons";
import { selectUser } from "../../features/auth/authSlice";
import {
  fetchApplications,
  selectApplicationList,
  selectListStatus,
  selectListError,
  selectPendingApplication,
} from "../../features/applications/applicationsSlice";
import Layout from "../../components/Layout";

// TODO: same STATUS_STYLES + StatusBadge as AdminDashboard and ApplicationDetailPage
// just copy-pasted for now, extract to a shared component when time allows
const STATUS_STYLES = {
  DRAFT: "bg-gray-100 text-gray-600",
  SUBMITTED: "bg-bnr-gold-pale text-bnr-gold",
  UNDER_REVIEW: "bg-yellow-50 text-yellow-700",
  ADDITIONAL_INFO_REQUIRED: "bg-orange-50 text-orange-700",
  REVIEWED: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
};

const STATUS_LABELS = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  ADDITIONAL_INFO_REQUIRED: "Info Required",
  REVIEWED: "Reviewed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 border-2 border-dashed border-bnr-cream-dark rounded-lg">
      <div className="w-14 h-14 bg-bnr-brown rounded-full flex items-center justify-center mx-auto mb-4">
        <FontAwesomeIcon icon={faFileLines} className="text-bnr-gold text-xl" />
      </div>
      <p className="text-sm font-medium text-bnr-brown">No applications yet</p>
      <p className="text-xs text-bnr-brown-light mt-1">
        Start a new application to begin the licensing process.
      </p>
      <Link
        to="/dashboard/new"
        className="inline-flex items-center gap-2 mt-5 px-5 py-2 bg-bnr-gold text-white text-sm font-semibold rounded uppercase tracking-wide hover:bg-bnr-gold-light transition-colors"
      >
        <FontAwesomeIcon icon={faPlus} />
        New Application
      </Link>
    </div>
  );
}

export default function ApplicantDashboard() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const applications = useSelector(selectApplicationList);
  const isLoading = useSelector(selectListStatus);
  const listError = useSelector(selectListError);
  const pendingApp = useSelector(selectPendingApplication);

  useEffect(() => {
    dispatch(fetchApplications());
  }, [dispatch]);

  const hasLoaded = !isLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="border-b border-bnr-cream-dark pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-bnr-brown uppercase tracking-wide flex items-center gap-2">
              <FontAwesomeIcon icon={faClipboardList} className="text-bnr-gold" />
              My Applications
            </h1>
            <p className="text-sm text-bnr-brown-mid mt-1">
              Welcome, {user?.full_name || user?.email}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => dispatch(fetchApplications())}
              disabled={isLoading}
              className="text-xs text-bnr-brown-light hover:text-bnr-brown disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <FontAwesomeIcon icon={isLoading ? faSpinner : faArrowsRotate} spin={isLoading} />
              Refresh
            </button>
            {hasLoaded && !listError && applications.length > 0 && (
              pendingApp ? (
                <span
                  title="Resolve your current application before starting a new one"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-bnr-cream-dark text-bnr-brown-light text-sm font-semibold rounded uppercase tracking-wide cursor-not-allowed opacity-60"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  New Application
                </span>
              ) : (
                <Link
                  to="/dashboard/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-bnr-gold text-white text-sm font-semibold rounded uppercase tracking-wide hover:bg-bnr-gold-light transition-colors"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  New Application
                </Link>
              )
            )}
          </div>
        </div>

        {pendingApp && (
          <p className="text-xs text-bnr-brown-light">
            You have an active application in progress.
          </p>
        )}

        {isLoading && (
          <div className="py-12 text-center text-sm text-bnr-brown-light flex items-center justify-center gap-2">
            <FontAwesomeIcon icon={faSpinner} spin />
            Loading applications…
          </div>
        )}

        {!isLoading && listError && (
          <div
            role="alert"
            className="px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faTriangleExclamation} />
            {listError}
            <button
              onClick={() => dispatch(fetchApplications())}
              className="underline hover:no-underline ml-1"
            >
              Retry
            </button>
          </div>
        )}

        {hasLoaded && !listError && applications.length === 0 && <EmptyState />}

        {hasLoaded && !listError && applications.length > 0 && (
          <div className="bg-white border border-bnr-cream-dark rounded-lg divide-y divide-bnr-cream">
            {applications.map((app) => (
              <Link
                key={app.id}
                to={`/dashboard/applications/${app.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-bnr-cream/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-bnr-brown truncate">
                    {app.institution_name}
                  </p>
                  <p className="text-xs text-bnr-brown-light mt-0.5">
                    {app.license_type} · {app.institution_type}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <StatusBadge status={app.status} />
                  <span className="text-xs text-bnr-brown-light hidden sm:block">
                    {new Date(app.created_at).toLocaleDateString()}
                  </span>
                  <FontAwesomeIcon icon={faChevronRight} className="text-bnr-brown-light text-sm" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
