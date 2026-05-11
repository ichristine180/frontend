import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faSpinner,
  faTriangleExclamation,
  faFileLines,
  faEye,
  faChevronDown,
  faChevronUp,
  faCircleCheck,
  faCircleXmark,
  faClockRotateLeft,
  faBuilding,
} from "@fortawesome/free-solid-svg-icons";
import { selectUser } from "../../features/auth/authSlice";
import {
  fetchAdminApplication,
  fetchAdminAudit,
  adminStartReview,
  adminRequestInfo,
  adminCompleteReview,
  adminApprove,
  adminReject,
  clearActionError,
  resetViewed,
  selectAdminViewed,
  selectAdminViewedStatus,
  selectAdminViewedError,
  selectAdminAudit,
  selectAdminAuditStatus,
  selectActionStatus,
  selectActionError,
} from "../../features/admin/adminSlice";
import { documentsApi } from "../../services/api";
import Layout from "../../components/Layout";

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
  ADDITIONAL_INFO_REQUIRED: "Additional Info Required",
  REVIEWED: "Reviewed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const ACTION_META = {
  APPLICATION_CREATED: { label: "Application Created", dot: "bg-gray-400" },
  APPLICATION_UPDATED: { label: "Application Updated", dot: "bg-gray-400" },
  DOCUMENT_UPLOADED: { label: "Document Uploaded", dot: "bg-bnr-gold" },
  APPLICATION_SUBMITTED: { label: "Application Submitted", dot: "bg-bnr-gold" },
  REVIEW_STARTED: { label: "Review Started", dot: "bg-yellow-500" },
  INFO_REQUESTED: { label: "Additional Info Requested", dot: "bg-orange-500" },
  APPLICATION_RESUBMITTED: { label: "Application Resubmitted", dot: "bg-bnr-gold" },
  REVIEW_COMPLETED: { label: "Review Completed", dot: "bg-blue-500" },
  APPLICATION_APPROVED: { label: "Application Approved", dot: "bg-green-500" },
  APPLICATION_REJECTED: { label: "Application Rejected", dot: "bg-red-500" },
};

const ROLE_BADGE = {
  APPLICANT: "bg-gray-100 text-gray-600",
  REVIEWER: "bg-yellow-50 text-yellow-700",
  APPROVER: "bg-blue-50 text-blue-700",
  ADMIN: "bg-purple-50 text-purple-700",
};

// TODO: fmt + fmtSize + groupDocsByType are also duplicated in ApplicationDetailPage
// should move to src/utils/fmt.js or similar
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

function groupDocsByType(docs) {
  const map = {};
  for (const doc of docs) {
    if (!map[doc.document_type]) map[doc.document_type] = { current: null, old: [] };
    if (doc.is_current) map[doc.document_type].current = doc;
    else map[doc.document_type].old.push(doc);
  }
  for (const key of Object.keys(map)) {
    map[key].old.sort((a, b) => b.version - a.version);
  }
  return map;
}

function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocRow({ doc, isCurrent }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const handleView = async () => {
    setLoading(true);
    setErr(null);
    try {
      await documentsApi.open(doc.id);
    } catch {
      setErr("Could not open file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-2.5 rounded ${isCurrent ? "bg-white" : "bg-bnr-cream/40"}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faFileLines} className="text-bnr-brown-light text-sm shrink-0" />
          <span className={`text-sm truncate ${isCurrent ? "font-medium text-bnr-brown" : "text-bnr-brown-mid"}`}>
            {doc.original_name}
          </span>
          <span className="text-[10px] text-bnr-brown-light shrink-0">v{doc.version}</span>
          {!isCurrent && (
            <span className="text-[10px] text-bnr-brown-light shrink-0">· older</span>
          )}
        </div>
        <p className="text-xs text-bnr-brown-light mt-0.5 ml-6">
          {fmtSize(doc.file_size)} · {fmt(doc.uploaded_at || doc.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {err && <span className="text-xs text-red-600">{err}</span>}
        <button
          onClick={handleView}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-bnr-gold font-medium hover:underline disabled:opacity-50"
        >
          {loading ? (
            <><FontAwesomeIcon icon={faSpinner} spin /> Opening…</>
          ) : (
            <><FontAwesomeIcon icon={faEye} /> View</>
          )}
        </button>
      </div>
    </div>
  );
}

function DocTypeCard({ typeName, group }) {
  const [showOld, setShowOld] = useState(false);
  const hasOld = group.old.length > 0;

  return (
    <div className="border border-bnr-cream-dark rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-bnr-cream/30 border-b border-bnr-cream-dark">
        <p className="text-xs font-semibold text-bnr-brown uppercase tracking-wide">{typeName}</p>
        {hasOld && (
          <button
            onClick={() => setShowOld((v) => !v)}
            className="text-xs text-bnr-brown-light hover:text-bnr-brown flex items-center gap-1"
          >
            {showOld ? "Hide older" : `${group.old.length} older version${group.old.length > 1 ? "s" : ""}`}
            <FontAwesomeIcon icon={showOld ? faChevronUp : faChevronDown} className="text-xs" />
          </button>
        )}
      </div>
      <div className="p-2 space-y-1">
        {group.current ? (
          <DocRow doc={group.current} isCurrent />
        ) : (
          <p className="text-xs text-bnr-brown-light px-4 py-2">No current version.</p>
        )}
        {showOld && hasOld && (
          <div className="mt-1 border-t border-bnr-cream-dark pt-1 space-y-1">
            {group.old.map((doc) => (
              <DocRow key={doc.id} doc={doc} isCurrent={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const PAGE_SIZE = 4;

function ActionHistory({ audit, auditLoading }) {
  const [showAll, setShowAll] = useState(false);

  if (auditLoading) {
    return (
      <div className="bg-white border border-bnr-cream-dark rounded-lg p-5">
        <p className="text-xs font-semibold text-bnr-brown uppercase tracking-wide mb-3">
          <FontAwesomeIcon icon={faClockRotateLeft} className="mr-2 text-bnr-gold" />
          Action History
        </p>
        <p className="text-sm text-bnr-brown-light flex items-center gap-2">
          <FontAwesomeIcon icon={faSpinner} spin />
          Loading…
        </p>
      </div>
    );
  }

  if (!audit || audit.length === 0) {
    return (
      <div className="bg-white border border-bnr-cream-dark rounded-lg p-5">
        <p className="text-xs font-semibold text-bnr-brown uppercase tracking-wide mb-3">
          <FontAwesomeIcon icon={faClockRotateLeft} className="mr-2 text-bnr-gold" />
          Action History
        </p>
        <p className="text-sm text-bnr-brown-light">No actions recorded yet.</p>
      </div>
    );
  }

  const reversed = [...audit].filter((e) => e.action !== "DOCUMENT_UPLOADED").reverse();
  const visible = showAll ? reversed : reversed.slice(0, PAGE_SIZE);
  const hidden = reversed.length - PAGE_SIZE;

  return (
    <div className="bg-white border border-bnr-cream-dark rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-bnr-brown uppercase tracking-wide flex items-center gap-2">
          <FontAwesomeIcon icon={faClockRotateLeft} className="text-bnr-gold" />
          Action History
        </p>
        <span className="text-[11px] text-bnr-brown-light">
          {audit.length} {audit.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <ol className="space-y-0">
        {visible.map((entry, i) => {
          const meta = ACTION_META[entry.action] ?? { label: entry.action, dot: "bg-gray-300" };
          const hasTransition = entry.previous_status && entry.previous_status !== entry.new_status;
          const isLast = i === visible.length - 1 && (showAll || hidden <= 0);

          return (
            <li key={entry.id ?? i} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${meta.dot}`} />
                {!isLast && <div className="w-px flex-1 bg-bnr-cream-dark mt-1 mb-1" />}
              </div>
              <div className={`min-w-0 ${isLast ? "" : "pb-4"}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-bnr-brown">{meta.label}</p>
                  {hasTransition && (
                    <span className="text-[10px] text-bnr-brown-light font-mono">
                      {entry.previous_status} → {entry.new_status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="text-[11px] text-bnr-brown-mid">
                    {entry.actor_name || entry.actor_email || `User ${entry.actor_id}`}
                  </p>
                  {entry.actor_role && (
                    <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${ROLE_BADGE[entry.actor_role] ?? "bg-gray-100 text-gray-600"}`}>
                      {entry.actor_role}
                    </span>
                  )}
                  <span className="text-[11px] text-bnr-brown-light">· {fmt(entry.created_at)}</span>
                </div>
                {entry.metadata?.reason && (
                  <p className="mt-1.5 text-xs text-bnr-brown-mid bg-bnr-cream/60 border border-bnr-cream-dark rounded px-2.5 py-1.5 italic">
                    "{entry.metadata.reason}"
                  </p>
                )}
                {entry.metadata?.document_type && (
                  <p className="mt-1 text-[11px] text-bnr-brown-light">
                    {entry.metadata.document_type}
                    {entry.metadata.original_name && ` · ${entry.metadata.original_name}`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {hidden > 0 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 flex items-center gap-1 text-xs text-bnr-gold font-medium hover:underline"
        >
          {showAll ? (
            <><FontAwesomeIcon icon={faChevronUp} /> Show less</>
          ) : (
            <><FontAwesomeIcon icon={faChevronDown} /> Show {hidden} more {hidden === 1 ? "entry" : "entries"}</>
          )}
        </button>
      )}
    </div>
  );
}

function Modal({ title, description, placeholder, minLength = 0, confirmLabel, confirmVariant = "primary", onConfirm, onCancel, loading }) {
  const [text, setText] = useState("");
  const isValid = minLength === 0 || text.trim().length >= minLength;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-xl border border-bnr-cream-dark w-full max-w-md p-6">
        <h3 className="text-sm font-bold text-bnr-brown uppercase tracking-wide mb-2">{title}</h3>
        {description && (
          <p className="text-xs text-bnr-brown-mid mb-4 leading-relaxed">{description}</p>
        )}
        {minLength > 0 && (
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 border border-bnr-cream-dark rounded text-sm text-bnr-brown focus:outline-none focus:ring-2 focus:ring-bnr-gold disabled:bg-bnr-cream/50 resize-none"
          />
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wide border border-bnr-cream-dark rounded text-bnr-brown-mid hover:border-bnr-brown/40 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(text.trim())}
            disabled={loading || !isValid}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2
              ${confirmVariant === "danger" ? "bg-red-600 hover:bg-red-700" : confirmVariant === "success" ? "bg-green-600 hover:bg-green-700" : "bg-bnr-brown hover:bg-bnr-brown-mid"}`}
          >
            {loading && <FontAwesomeIcon icon={faSpinner} spin />}
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold text-bnr-brown-light uppercase tracking-wide">{label}</p>
      <p className="text-sm text-bnr-brown mt-0.5">{value}</p>
    </div>
  );
}

export default function AdminApplicationDetail() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useSelector(selectUser);

  const app = useSelector(selectAdminViewed);
  const isLoadingApp = useSelector(selectAdminViewedStatus);
  const viewedError = useSelector(selectAdminViewedError);
  const audit = useSelector(selectAdminAudit);
  const auditLoading = useSelector(selectAdminAuditStatus);
  const isActing = useSelector(selectActionStatus);
  const actionError = useSelector(selectActionError);

  const [modal, setModal] = useState(null);
  const [allDocs, setAllDocs] = useState([]);
  const wasActing = useRef(false);

  useEffect(() => {
    dispatch(fetchAdminApplication(id));
    dispatch(fetchAdminAudit(id));
    documentsApi.listAll(id).then(setAllDocs).catch(() => {});
    return () => dispatch(resetViewed());
  }, [id, dispatch]);

  // close modal + refresh audit when a workflow action finishes without error
  // wasActing ref detects the transition from true→false without triggering on mount
  useEffect(() => {
    if (wasActing.current && !isActing && !actionError) {
      setModal(null);
      dispatch(fetchAdminAudit(id));
    }
    wasActing.current = isActing;
  }, [isActing, actionError, dispatch, id]);

  const actions = [];
  if (app && user) {
    const { role, id: userId } = user;
    if (role === "REVIEWER") {
      if (app.status === "SUBMITTED") {
        actions.push({ key: "start-review", label: "Start Review", variant: "primary" });
      }
      if (app.status === "UNDER_REVIEW" && app.reviewer_id === userId) {
        actions.push({ key: "request-info", label: "Request Additional Info", variant: "warning" });
        actions.push({ key: "complete-review", label: "Complete Review", variant: "primary" });
      }
    }
    if (role === "APPROVER" && app.status === "REVIEWED" && app.reviewer_id !== userId) {
      actions.push({ key: "approve", label: "Approve", variant: "success" });
      actions.push({ key: "reject", label: "Reject", variant: "danger" });
    }
  }

  const handleAction = (key) => {
    dispatch(clearActionError());
    if (key === "start-review") {
      dispatch(adminStartReview(id));
    } else {
      setModal(key);
    }
  };

  const handleModalConfirm = (text) => {
    if (modal === "request-info") dispatch(adminRequestInfo({ id, reason: text }));
    if (modal === "complete-review") dispatch(adminCompleteReview({ id, reviewNotes: text }));
    if (modal === "approve") dispatch(adminApprove(id));
    if (modal === "reject") dispatch(adminReject({ id, reason: text }));
  };

  if (isLoadingApp) {
    return (
      <Layout>
        <div className="py-16 text-center text-sm text-bnr-brown-light flex items-center justify-center gap-2">
          <FontAwesomeIcon icon={faSpinner} spin />
          Loading application…
        </div>
      </Layout>
    );
  }

  if (!isLoadingApp && viewedError) {
    return (
      <Layout>
        <div className="py-16 text-center">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 text-2xl mb-3" />
          <p className="text-sm text-red-600">{viewedError || "Failed to load application."}</p>
          <button
            onClick={() => navigate("/admin")}
            className="mt-4 text-xs text-bnr-gold underline flex items-center gap-1 mx-auto"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to dashboard
          </button>
        </div>
      </Layout>
    );
  }

  if (!app) return null;

  return (
    <Layout>
      {modal === "request-info" && (
        <Modal
          title="Request Additional Information"
          description="Explain what additional information the applicant must provide. This message will be visible to them."
          placeholder="Describe what is missing or needs clarification…"
          minLength={10}
          confirmLabel="Send Request"
          confirmVariant="primary"
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
          loading={isActing}
        />
      )}
      {modal === "complete-review" && (
        <Modal
          title="Complete Review"
          description="Provide your review notes. This application will move to REVIEWED status and await an approval decision."
          placeholder="Enter your review findings and recommendation…"
          minLength={10}
          confirmLabel="Submit Review"
          confirmVariant="primary"
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
          loading={isActing}
        />
      )}
      {modal === "approve" && (
        <Modal
          title="Approve Application"
          description="Are you sure you want to approve this application? This action cannot be undone."
          minLength={0}
          confirmLabel="Approve"
          confirmVariant="success"
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
          loading={isActing}
        />
      )}
      {modal === "reject" && (
        <Modal
          title="Reject Application"
          description="Provide a reason for rejection. This will be visible to the applicant."
          placeholder="Explain why this application is being rejected…"
          minLength={10}
          confirmLabel="Reject"
          confirmVariant="danger"
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
          loading={isActing}
        />
      )}

      <div className="max-w-3xl mx-auto space-y-5">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-1.5 text-xs text-bnr-brown-light hover:text-bnr-brown"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to dashboard
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-bnr-brown flex items-center gap-2">
              <FontAwesomeIcon icon={faBuilding} className="text-bnr-gold" />
              {app.institution_name}
            </h1>
            <p className="text-xs text-bnr-brown-mid mt-0.5">
              {app.license_type} · {app.institution_type}
            </p>
          </div>
          <span className={`shrink-0 inline-block text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[app.status] ?? "bg-gray-100 text-gray-600"}`}>
            {STATUS_LABELS[app.status] ?? app.status}
          </span>
        </div>

        {actionError && (
          <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            {actionError}
          </div>
        )}

        {actions.length > 0 && (
          <div className="bg-white border border-bnr-cream-dark rounded-lg p-4">
            <p className="text-xs font-semibold text-bnr-brown uppercase tracking-wide mb-3">
              Available Actions
            </p>
            <div className="flex flex-wrap gap-2">
              {actions.map(({ key, label, variant }) => (
                <button
                  key={key}
                  onClick={() => handleAction(key)}
                  disabled={isActing}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2
                    ${variant === "danger" ? "bg-red-600 text-white hover:bg-red-700"
                      : variant === "success" ? "bg-green-600 text-white hover:bg-green-700"
                      : variant === "warning" ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "bg-bnr-brown text-white hover:bg-bnr-brown-mid"}`}
                >
                  {isActing && <FontAwesomeIcon icon={faSpinner} spin />}
                  {isActing ? "Please wait…" : label}
                </button>
              ))}
            </div>
          </div>
        )}

        {user?.role === "APPROVER" && app.status === "REVIEWED" && app.reviewer_id === user.id && (
          <div className="px-4 py-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
            You reviewed this application and cannot approve or reject it. Another approver must decide.
          </div>
        )}

        <div className="bg-white border border-bnr-cream-dark rounded-lg p-5">
          <p className="text-xs font-semibold text-bnr-brown uppercase tracking-wide mb-4">
            Application Details
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow label="Institution Name" value={app.institution_name} />
            <InfoRow label="Institution Type" value={app.institution_type} />
            <InfoRow label="License Type" value={app.license_type} />
            <InfoRow label="Registration Number" value={app.registration_number} />
            <InfoRow label="Contact Email" value={app.contact_email} />
            <InfoRow label="Contact Phone" value={app.contact_phone} />
            <InfoRow label="Submitted At" value={app.submitted_at ? new Date(app.submitted_at).toLocaleString() : "—"} />
            <InfoRow label="Decided At" value={app.decided_at ? new Date(app.decided_at).toLocaleString() : "—"} />
          </div>
          {app.review_notes && (
            <div className="mt-4 pt-4 border-t border-bnr-cream">
              <p className="text-[10px] font-semibold text-bnr-brown-light uppercase tracking-wide mb-1">
                Review Notes
              </p>
              <p className="text-sm text-bnr-brown whitespace-pre-wrap">{app.review_notes}</p>
            </div>
          )}
          {app.decision_reason && (
            <div className="mt-4 pt-4 border-t border-bnr-cream">
              <p className="text-[10px] font-semibold text-bnr-brown-light uppercase tracking-wide mb-1">
                Decision Reason
              </p>
              <p className="text-sm text-bnr-brown whitespace-pre-wrap">{app.decision_reason}</p>
            </div>
          )}
        </div>

        {(() => {
          const grouped = groupDocsByType(allDocs);
          const typeNames = Object.keys(grouped);
          return (
            <div className="bg-white border border-bnr-cream-dark rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-bnr-brown uppercase tracking-wide flex items-center gap-2">
                  <FontAwesomeIcon icon={faFileLines} className="text-bnr-gold" />
                  Supporting Documents
                </p>
                <span className="text-xs text-bnr-brown-light">
                  {typeNames.length} type{typeNames.length !== 1 ? "s" : ""}
                </span>
              </div>
              {typeNames.length === 0 ? (
                <p className="text-sm text-bnr-brown-light">No documents uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {typeNames.map((typeName) => (
                    <DocTypeCard key={typeName} typeName={typeName} group={grouped[typeName]} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        <ActionHistory audit={audit} auditLoading={auditLoading} />
      </div>
    </Layout>
  );
}
