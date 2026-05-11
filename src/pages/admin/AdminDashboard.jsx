import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsRotate,
  faChevronRight,
  faFileLines,
  faTriangleExclamation,
  faClipboardList,
  faCircleCheck,
  faCircleXmark,
  faClock,
  faChartSimple,
  faClockRotateLeft,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { selectUser } from "../../features/auth/authSlice";
import {
  fetchAdminApplications,
  selectAdminList,
  selectAdminListStatus,
  selectAdminListError,
} from "../../features/admin/adminSlice";
import { ROLE_LABELS } from "../../utils/roles";
import Layout from "../../components/Layout";

// TODO: STATUS_STYLES, STATUS_LABELS and StatusBadge are copy-pasted in ApplicantDashboard
// and ApplicationDetailPage too. Should extract to src/components/StatusBadge.jsx at some point.
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

const ROLE_FILTERS = {
  REVIEWER: ["ALL", "SUBMITTED", "UNDER_REVIEW", "ADDITIONAL_INFO_REQUIRED"],
  APPROVER: ["ALL", "REVIEWED", "APPROVED", "REJECTED"],
  ADMIN: [
    "ALL",
    "SUBMITTED",
    "UNDER_REVIEW",
    "ADDITIONAL_INFO_REQUIRED",
    "REVIEWED",
    "APPROVED",
    "REJECTED",
  ],
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

function StatCard({ label, value, sub, accent, icon }) {
  const accentMap = {
    gold: "border-bnr-gold/40 bg-bnr-gold-pale",
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
    blue: "border-blue-200 bg-blue-50",
    orange: "border-orange-200 bg-orange-50",
    plain: "border-bnr-cream-dark bg-white",
  };
  const valMap = {
    gold: "text-bnr-gold",
    green: "text-green-700",
    red: "text-red-600",
    blue: "text-blue-700",
    orange: "text-orange-600",
    plain: "text-bnr-brown",
  };
  return (
    <div className={`rounded-lg border px-4 py-4 ${accentMap[accent] ?? accentMap.plain}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && (
          <FontAwesomeIcon
            icon={icon}
            className={`text-sm ${valMap[accent] ?? valMap.plain}`}
          />
        )}
        <p className="text-[10px] font-semibold text-bnr-brown-light uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p className={`text-2xl font-bold ${valMap[accent] ?? valMap.plain}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-bnr-brown-light mt-1">{sub}</p>}
    </div>
  );
}

function OverviewStats({ list }) {
  const now = new Date();
  const thisMonth = list.filter((a) => {
    const d = new Date(a.submitted_at || a.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const byStatus = (s) => list.filter((a) => a.status === s).length;
  const approved = byStatus("APPROVED");
  const rejected = byStatus("REJECTED");
  const decided = approved + rejected;
  const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : null;
  const inProgress = ["SUBMITTED", "UNDER_REVIEW", "ADDITIONAL_INFO_REQUIRED", "REVIEWED"].reduce(
    (n, s) => n + byStatus(s),
    0
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard label="Total" value={list.length} accent="plain" icon={faClipboardList} />
      <StatCard label="In Progress" value={inProgress} accent="gold" icon={faClock} />
      <StatCard label="Approved" value={approved} accent="green" icon={faCircleCheck} />
      <StatCard label="Rejected" value={rejected} accent="red" icon={faCircleXmark} />
      <StatCard label="This Month" value={thisMonth} sub="submitted / created" accent="blue" icon={faChartSimple} />
      <StatCard
        label="Approval Rate"
        value={approvalRate !== null ? `${approvalRate}%` : "—"}
        sub={decided > 0 ? `${decided} decided` : "no decisions yet"}
        accent={approvalRate !== null && approvalRate >= 50 ? "green" : approvalRate !== null ? "red" : "plain"}
      />
    </div>
  );
}

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const list = useSelector(selectAdminList);
  const isLoading = useSelector(selectAdminListStatus);
  const listError = useSelector(selectAdminListError);

  const [activeFilter, setActiveFilter] = useState("ALL");

  useEffect(() => {
    dispatch(fetchAdminApplications());
  }, [dispatch]);

  const filters = ROLE_FILTERS[user?.role] ?? ["ALL"];
  const filtered = activeFilter === "ALL" ? list : list.filter((a) => a.status === activeFilter);
  const hasLoaded = !isLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="border-b border-bnr-cream-dark pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-bnr-brown uppercase tracking-wide flex items-center gap-2">
              <FontAwesomeIcon icon={faClipboardList} className="text-bnr-gold" />
              {ROLE_LABELS[user?.role] ?? "Internal"} Dashboard
            </h1>
            <p className="text-sm text-bnr-brown-mid mt-1">
              Welcome, {user?.full_name || user?.email}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "ADMIN" && (
              <Link
                to="/admin/audit"
                className="text-xs text-bnr-gold font-medium hover:underline flex items-center gap-1"
              >
                <FontAwesomeIcon icon={faClockRotateLeft} />
                Audit Log
              </Link>
            )}
            <button
              onClick={() => dispatch(fetchAdminApplications())}
              disabled={isLoading}
              className="text-xs text-bnr-brown-light hover:text-bnr-brown disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <FontAwesomeIcon icon={isLoading ? faSpinner : faArrowsRotate} spin={isLoading} />
              Refresh
            </button>
          </div>
        </div>

        {user?.role === "ADMIN" && hasLoaded && !listError && (
          <OverviewStats list={list} />
        )}

        {filters.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {filters.map((f) => {
              const count = f === "ALL" ? list.length : list.filter((a) => a.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-colors
                    ${activeFilter === f
                      ? "bg-bnr-brown text-white"
                      : "bg-white border border-bnr-cream-dark text-bnr-brown-mid hover:border-bnr-gold/50 hover:text-bnr-brown"
                    }`}
                >
                  {f === "ALL" ? "All" : STATUS_LABELS[f]} ({count})
                </button>
              );
            })}
          </div>
        )}

        {isLoading && (
          <div className="py-12 text-center text-sm text-bnr-brown-light flex items-center justify-center gap-2">
            <FontAwesomeIcon icon={faSpinner} spin />
            Loading applications…
          </div>
        )}

        {!isLoading && listError && (
          <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            {listError}
            <button onClick={() => dispatch(fetchAdminApplications())} className="underline ml-1">
              Retry
            </button>
          </div>
        )}

        {hasLoaded && !listError && filtered.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-bnr-cream-dark rounded-lg">
            <FontAwesomeIcon icon={faFileLines} className="text-3xl text-bnr-brown-light mb-3" />
            <p className="text-sm text-bnr-brown-light">
              {activeFilter === "ALL"
                ? "No applications found."
                : `No applications with status "${STATUS_LABELS[activeFilter]}".`}
            </p>
          </div>
        )}

        {hasLoaded && !listError && filtered.length > 0 && (
          <div className="bg-white border border-bnr-cream-dark rounded-lg divide-y divide-bnr-cream">
            {filtered.map((app) => (
              <Link
                key={app.id}
                to={`/admin/applications/${app.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-bnr-cream/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
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
                  <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 text-bnr-brown-light" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
