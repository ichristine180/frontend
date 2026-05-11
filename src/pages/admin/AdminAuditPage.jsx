import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowsRotate,
  faSpinner,
  faTriangleExclamation,
  faMagnifyingGlass,
  faFilter,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import {
  fetchSystemAudit,
  selectSystemAudit,
  selectSystemAuditStatus,
  selectSystemAuditError,
} from "../../features/admin/adminSlice";
import Layout from "../../components/Layout";

// TODO: ACTION_META (and ROLE_BADGE below) are also defined in AdminApplicationDetail.jsx
// duplicated because each file tweaks the labels slightly - extract when stable
const ACTION_META = {
  APPLICATION_CREATED: { label: "Application Created", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600" },
  APPLICATION_UPDATED: { label: "Application Updated", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600" },
  DOCUMENT_UPLOADED: { label: "Document Uploaded", dot: "bg-bnr-gold", badge: "bg-bnr-gold-pale text-bnr-gold" },
  APPLICATION_SUBMITTED: { label: "Submitted", dot: "bg-bnr-gold", badge: "bg-bnr-gold-pale text-bnr-gold" },
  REVIEW_STARTED: { label: "Review Started", dot: "bg-yellow-500", badge: "bg-yellow-50 text-yellow-700" },
  INFO_REQUESTED: { label: "Info Requested", dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700" },
  APPLICATION_RESUBMITTED: { label: "Resubmitted", dot: "bg-bnr-gold", badge: "bg-bnr-gold-pale text-bnr-gold" },
  REVIEW_COMPLETED: { label: "Review Completed", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700" },
  APPLICATION_APPROVED: { label: "Approved", dot: "bg-green-500", badge: "bg-green-50 text-green-700" },
  APPLICATION_REJECTED: { label: "Rejected", dot: "bg-red-500", badge: "bg-red-50 text-red-700" },
};

const ROLE_BADGE = {
  APPLICANT: "bg-gray-100 text-gray-600",
  REVIEWER: "bg-yellow-50 text-yellow-700",
  APPROVER: "bg-blue-50 text-blue-700",
  ADMIN: "bg-purple-50 text-purple-700",
};

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ALL_ACTIONS = Object.keys(ACTION_META);

export default function AdminAuditPage() {
  const dispatch = useDispatch();
  const audit = useSelector(selectSystemAudit);
  const isLoading = useSelector(selectSystemAuditStatus);
  const error = useSelector(selectSystemAuditError);

  const [filterAction, setFilterAction] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchSystemAudit());
  }, [dispatch]);

  const filtered = audit.filter((e) => {
    if (filterAction !== "ALL" && e.action !== filterAction) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (e.institution_name ?? "").toLowerCase().includes(q) ||
        (e.actor_name ?? "").toLowerCase().includes(q) ||
        (e.actor_email ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hasLoaded = !isLoading;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="border-b border-bnr-cream-dark pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-bnr-brown uppercase tracking-wide flex items-center gap-2">
              <FontAwesomeIcon icon={faClockRotateLeft} className="text-bnr-gold" />
              System Audit Log
            </h1>
            <p className="text-sm text-bnr-brown-mid mt-1">
              All actions taken across every application.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="text-xs text-bnr-brown-light hover:text-bnr-brown flex items-center gap-1"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Dashboard
            </Link>
            <button
              onClick={() => dispatch(fetchSystemAudit())}
              disabled={isLoading}
              className="text-xs text-bnr-brown-light hover:text-bnr-brown disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <FontAwesomeIcon icon={isLoading ? faSpinner : faArrowsRotate} spin={isLoading} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-bnr-brown-light text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search institution or actor…"
              className="w-full pl-9 pr-3 py-2 border border-bnr-cream-dark rounded text-sm text-bnr-brown placeholder-bnr-brown-light/50 focus:outline-none focus:ring-2 focus:ring-bnr-gold"
            />
          </div>
          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 -translate-y-1/2 text-bnr-brown-light text-sm pointer-events-none" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="pl-9 pr-3 py-2 border border-bnr-cream-dark rounded text-sm text-bnr-brown bg-white focus:outline-none focus:ring-2 focus:ring-bnr-gold"
            >
              <option value="ALL">All actions</option>
              {ALL_ACTIONS.map((a) => (
                <option key={a} value={a}>{ACTION_META[a].label}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="py-12 text-center text-sm text-bnr-brown-light flex items-center justify-center gap-2">
            <FontAwesomeIcon icon={faSpinner} spin />
            Loading audit log…
          </div>
        )}

        {!isLoading && error && (
          <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            {error || "Failed to load audit log."}
            <button onClick={() => dispatch(fetchSystemAudit())} className="underline ml-1">
              Retry
            </button>
          </div>
        )}

        {hasLoaded && !error && filtered.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-bnr-cream-dark rounded-lg">
            <p className="text-sm text-bnr-brown-light">No entries match your filters.</p>
          </div>
        )}

        {hasLoaded && !error && filtered.length > 0 && (
          <div className="bg-white border border-bnr-cream-dark rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bnr-cream-dark bg-bnr-cream/30">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-bnr-brown uppercase tracking-wide">Time</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-bnr-brown uppercase tracking-wide">Action</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-bnr-brown uppercase tracking-wide">Application</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-bnr-brown uppercase tracking-wide">Actor</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-bnr-brown uppercase tracking-wide">Status Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bnr-cream">
                  {filtered.map((entry, i) => {
                    const meta = ACTION_META[entry.action] ?? {
                      label: entry.action,
                      dot: "bg-gray-300",
                      badge: "bg-gray-100 text-gray-600",
                    };
                    const hasTransition = entry.previous_status && entry.previous_status !== entry.new_status;
                    return (
                      <tr key={entry.id ?? i} className="hover:bg-bnr-cream/20 transition-colors">
                        <td className="px-4 py-3 text-xs text-bnr-brown-light whitespace-nowrap align-top">
                          {fmt(entry.created_at)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${meta.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                            {meta.label}
                          </span>
                          {entry.metadata?.reason && (
                            <p className="mt-1 text-[11px] text-bnr-brown-mid italic max-w-xs truncate" title={entry.metadata.reason}>
                              "{entry.metadata.reason}"
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {entry.application_id ? (
                            <Link
                              to={`/admin/applications/${entry.application_id}`}
                              className="text-xs text-bnr-gold font-medium hover:underline"
                            >
                              {entry.institution_name || entry.application_id.slice(0, 8) + "…"}
                            </Link>
                          ) : (
                            <span className="text-xs text-bnr-brown-light">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-xs text-bnr-brown">
                            {entry.actor_name || entry.actor_email || `User ${entry.actor_id?.slice(0, 8)}…`}
                          </p>
                          {entry.actor_role && (
                            <span className={`mt-0.5 inline-block text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${ROLE_BADGE[entry.actor_role] ?? "bg-gray-100 text-gray-600"}`}>
                              {entry.actor_role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {hasTransition ? (
                            <span className="text-[11px] text-bnr-brown-light font-mono">
                              {entry.previous_status} → {entry.new_status}
                            </span>
                          ) : (
                            <span className="text-xs text-bnr-brown-light">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-bnr-cream-dark bg-bnr-cream/20">
              <p className="text-xs text-bnr-brown-light">
                {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
                {filtered.length !== audit.length && ` (filtered from ${audit.length})`}
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
