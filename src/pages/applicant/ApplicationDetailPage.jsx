import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faSpinner,
  faTriangleExclamation,
  faFileLines,
  faEye,
  faUpload,
  faChevronDown,
  faChevronUp,
  faCircleCheck,
  faCircleXmark,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import {
  fetchApplication,
  fetchDocumentTypes,
  uploadDocument,
  submitApplication,
  resubmitApplication,
  resetViewed,
  clearSubmitError,
  clearResubmitError,
  selectViewedApp,
  selectViewedStatus,
  selectViewedError,
  selectDocumentTypes,
  selectUploadStatuses,
  selectUploadErrors,
  selectSubmitStatus,
  selectSubmitError,
  selectResubmitStatus,
  selectResubmitError,
} from "../../features/applications/applicationsSlice";
import { documentsApi, applicationsApi } from "../../services/api";
import Layout from "../../components/Layout";

const STATUS_STYLES = {
  DRAFT: "bg-gray-100 text-gray-700",
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
const EDITABLE_STATUSES = ["DRAFT", "ADDITIONAL_INFO_REQUIRED"];

function StatusBadge({ status, large }) {
  return (
    <span className={`inline-block font-medium rounded-full ${large ? "text-sm px-3 py-1" : "text-xs px-2.5 py-0.5"} ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <dt className="text-xs font-semibold text-bnr-brown uppercase tracking-wide w-44 shrink-0">{label}</dt>
      <dd className="text-sm text-bnr-brown-mid mt-0.5 sm:mt-0">{value}</dd>
    </div>
  );
}

// TODO: fmt, fmtSize and groupDocsByType also live in AdminApplicationDetail.jsx
// should pull them into src/utils/fmt.js at some point
function fmt(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function ViewButton({ docId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOpen = async () => {
    setLoading(true);
    setError(null);
    try {
      await documentsApi.open(docId);
    } catch {
      setError("Could not open file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleOpen}
        disabled={loading}
        className="flex items-center gap-1 text-xs text-bnr-gold font-medium hover:underline disabled:opacity-50"
      >
        {loading ? (
          <><FontAwesomeIcon icon={faSpinner} spin /> Opening…</>
        ) : (
          <><FontAwesomeIcon icon={faEye} /> View</>
        )}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

function DocRow({ doc, isCurrent }) {
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
          {fmtSize(doc.file_size)} · {fmt(doc.created_at || doc.uploaded_at)}
        </p>
      </div>
      <ViewButton docId={doc.id} />
    </div>
  );
}

function UploadRow({ docType, applicationId, uploadStatus, uploadError }) {
  const dispatch = useDispatch();
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    dispatch(uploadDocument({ applicationId, file, documentType: docType.name }));
    e.target.value = "";
  };

  const isUploading = uploadStatus === "loading";

  return (
    <div className="flex items-center justify-between gap-4 mt-1">
      <div className="flex-1">
        {uploadStatus === "error" && (
          <p className="text-xs text-red-600">{uploadError}</p>
        )}
        {uploadStatus === "success" && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <FontAwesomeIcon icon={faCircleCheck} /> Uploaded
          </p>
        )}
      </div>
      <div className="shrink-0">
        {isUploading ? (
          <span className="text-xs text-bnr-brown-light flex items-center gap-1">
            <FontAwesomeIcon icon={faSpinner} spin /> Uploading…
          </span>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-bnr-gold text-bnr-gold text-xs font-semibold rounded hover:bg-bnr-gold hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faUpload} />
            {uploadStatus === "success" ? "Replace" : "Upload"}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>
    </div>
  );
}

function DocTypeCard({ typeName, group, docType, isEditable, applicationId, uploadStatus, uploadError }) {
  const [showOld, setShowOld] = useState(false);
  const hasOld = group.old.length > 0;

  return (
    <div className="border border-bnr-cream-dark rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-bnr-cream/30 border-b border-bnr-cream-dark">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-bnr-brown uppercase tracking-wide">{typeName}</p>
          {docType?.mandatory && (
            <span className="text-[10px] uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
              Required
            </span>
          )}
        </div>
        {hasOld && (
          <button
            onClick={() => setShowOld((v) => !v)}
            className="text-xs text-bnr-brown-light hover:text-bnr-brown flex items-center gap-1"
          >
            {showOld ? "Hide" : `${group.old.length} older version${group.old.length > 1 ? "s" : ""}`}
            <FontAwesomeIcon icon={showOld ? faChevronUp : faChevronDown} className="text-xs" />
          </button>
        )}
      </div>
      <div className="p-2 space-y-1">
        {group.current ? (
          <DocRow doc={group.current} isCurrent />
        ) : (
          <p className="text-xs text-bnr-brown-light px-4 py-2">No document uploaded yet.</p>
        )}
        {isEditable && (
          <UploadRow
            docType={docType}
            applicationId={applicationId}
            uploadStatus={uploadStatus}
            uploadError={uploadError}
          />
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

const PUBLIC_EVENTS = {
  APPLICATION_CREATED: "Application created",
  APPLICATION_SUBMITTED: "Application submitted",
  INFO_REQUESTED: "Additional information requested",
  APPLICATION_RESUBMITTED: "Additional information provided",
  REVIEW_COMPLETED: "Review completed",
  APPLICATION_APPROVED: "Application approved",
  APPLICATION_REJECTED: "Application rejected",
};

const STATUS_STEP = {
  DRAFT: 1,
  SUBMITTED: 2,
  UNDER_REVIEW: 3,
  ADDITIONAL_INFO_REQUIRED: 3,
  REVIEWED: 4,
  APPROVED: 4,
  REJECTED: 4,
};

const STEPS = ["Created", "Submitted", "Under Review", "Decision"];

function StatusTimeline({ app, auditEntries }) {
  const activeStep = STATUS_STEP[app.status] ?? 1;
  const isRejected = app.status === "REJECTED";
  const isApproved = app.status === "APPROVED";
  const publicEntries = auditEntries.filter((e) => PUBLIC_EVENTS[e.action]);

  return (
    <div className="bg-white border border-bnr-cream-dark rounded-lg p-5">
      <h2 className="text-xs font-bold text-bnr-brown uppercase tracking-wide mb-5 flex items-center gap-2">
        <FontAwesomeIcon icon={faClockRotateLeft} className="text-bnr-gold" />
        Application Progress
      </h2>
      <div className="flex items-start">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const done = activeStep > stepNum;
          const active = activeStep === stepNum;
          const isFinal = stepNum === STEPS.length;

          let dotCls = "bg-bnr-cream-dark text-bnr-brown-light";
          if (done) dotCls = "bg-bnr-gold text-white";
          if (active && isFinal && isApproved) dotCls = "bg-green-600 text-white";
          if (active && isFinal && isRejected) dotCls = "bg-red-500 text-white";
          if (active && !isFinal) dotCls = "bg-bnr-brown text-white";

          const lineCls = done ? "bg-bnr-gold" : "bg-bnr-cream-dark";

          return (
            <div key={label} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <div className={`absolute top-3.5 right-1/2 left-0 h-0.5 ${lineCls}`} />
              )}
              <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dotCls}`}>
                {done ? <FontAwesomeIcon icon={faCircleCheck} /> : stepNum}
              </div>
              <span className={`mt-1.5 text-[10px] text-center font-medium uppercase tracking-wide leading-tight
                ${active ? "text-bnr-brown" : done ? "text-bnr-gold" : "text-bnr-brown-light"}`}>
                {active && isFinal && isApproved ? "Approved"
                  : active && isFinal && isRejected ? "Rejected"
                  : active && stepNum === 3 && app.status === "ADDITIONAL_INFO_REQUIRED" ? "Info Required"
                  : label}
              </span>
            </div>
          );
        })}
      </div>

      {publicEntries.length > 0 && (
        <div className="mt-6 border-t border-bnr-cream pt-4">
          <p className="text-[10px] font-semibold text-bnr-brown-light uppercase tracking-wide mb-3">History</p>
          <ol className="space-y-3">
            {publicEntries.map((entry, i) => (
              <li key={entry.id ?? i} className="flex gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-2 h-2 rounded-full mt-1 ${
                    entry.action === "APPLICATION_APPROVED" ? "bg-green-500"
                      : entry.action === "APPLICATION_REJECTED" ? "bg-red-400"
                      : entry.action === "INFO_REQUESTED" ? "bg-orange-400"
                      : "bg-bnr-gold"
                  }`} />
                  {i < publicEntries.length - 1 && (
                    <div className="w-px flex-1 bg-bnr-cream-dark mt-1" />
                  )}
                </div>
                <div className="pb-3 min-w-0">
                  <p className="text-xs font-medium text-bnr-brown">{PUBLIC_EVENTS[entry.action]}</p>
                  <p className="text-[11px] text-bnr-brown-light mt-0.5">{fmt(entry.created_at)}</p>
                  {entry.metadata?.reason && (
                    <p className="text-xs text-orange-700 mt-1 italic">"{entry.metadata.reason}"</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const app = useSelector(selectViewedApp);
  const isLoadingApp = useSelector(selectViewedStatus);
  const viewedError = useSelector(selectViewedError);
  const docTypes = useSelector(selectDocumentTypes);
  const uploadStatuses = useSelector(selectUploadStatuses);
  const uploadErrors = useSelector(selectUploadErrors);
  const isSubmitting = useSelector(selectSubmitStatus);
  const submitError = useSelector(selectSubmitError);
  const isResubmitting = useSelector(selectResubmitStatus);
  const resubmitError = useSelector(selectResubmitError);

  const [allDocs, setAllDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [auditEntries, setAuditEntries] = useState([]);

  const wasSubmitting = useRef(false);
  const wasResubmitting = useRef(false);

  const loadDocs = useCallback(async () => {
    if (!id) return;
    setDocsLoading(true);
    try {
      const docs = await documentsApi.listAll(id);
      setAllDocs(docs);
    } catch {
    } finally {
      setDocsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    dispatch(fetchApplication(id));
    dispatch(fetchDocumentTypes());
    loadDocs();
    applicationsApi.getAudit(id).then(setAuditEntries).catch(() => {});
    return () => dispatch(resetViewed());
  }, [id, dispatch, loadDocs]);

  useEffect(() => {
    const anyDone = Object.values(uploadStatuses).some((s) => s === "success");
    if (anyDone) loadDocs();
  }, [uploadStatuses, loadDocs]);

  // redirect after submit/resubmit completes - refs track the in-flight → done transition
  useEffect(() => {
    if (wasSubmitting.current && !isSubmitting && !submitError) {
      navigate("/dashboard", { replace: true });
    }
    if (wasResubmitting.current && !isResubmitting && !resubmitError) {
      navigate("/dashboard", { replace: true });
    }
    wasSubmitting.current = isSubmitting;
    wasResubmitting.current = isResubmitting;
  }, [isSubmitting, isResubmitting, submitError, resubmitError, navigate]);

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
        <div className="max-w-2xl mx-auto space-y-4">
          <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            {viewedError || "Failed to load application."}
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-bnr-gold hover:underline flex items-center gap-1"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to dashboard
          </button>
        </div>
      </Layout>
    );
  }

  if (!app) return null;

  const isEditable = EDITABLE_STATUSES.includes(app.status);
  const docTypeMap = Object.fromEntries(docTypes.map((dt) => [dt.name, dt]));
  const groupedDocs = groupDocsByType(allDocs);

  const allTypeNames = [
    ...docTypes.map((dt) => dt.name),
    ...Object.keys(groupedDocs).filter((k) => !docTypes.find((dt) => dt.name === k)),
  ];

  const uploadedCount = Object.values(groupedDocs).filter((g) => g.current).length;
  const missingMandatory = docTypes.filter((dt) => dt.mandatory && !groupedDocs[dt.name]?.current);
  const anyUploading = Object.values(uploadStatuses).some((s) => s === "loading");

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-xs text-bnr-brown-light hover:text-bnr-brown"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to dashboard
        </button>

        <div className="bg-white border border-bnr-cream-dark rounded-lg px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-bnr-brown-light uppercase tracking-wide mb-1">
                {app.license_type}
              </p>
              <h1 className="text-lg font-bold text-bnr-brown">{app.institution_name}</h1>
              <p className="text-sm text-bnr-brown-mid mt-0.5">{app.institution_type}</p>
            </div>
            <StatusBadge status={app.status} large />
          </div>
        </div>

        {app.status === "ADDITIONAL_INFO_REQUIRED" && (
          <div className="px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 flex items-center gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <span><strong>Additional information required.</strong> Upload the requested documents and resubmit.</span>
          </div>
        )}
        {app.status === "APPROVED" && (
          <div className="px-4 py-3 bg-green-50 border border-green-300 rounded-lg text-sm text-green-700 flex items-center gap-2">
            <FontAwesomeIcon icon={faCircleCheck} />
            <span><strong>Application approved.</strong> A licensing decision has been made in your favour.</span>
          </div>
        )}
        {app.status === "REJECTED" && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <FontAwesomeIcon icon={faCircleXmark} />
            <span><strong>Application rejected.</strong>{app.decision_reason && <span> Reason: {app.decision_reason}</span>}</span>
          </div>
        )}
        {app.status === "REVIEWED" && app.review_notes && (
          <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <strong>Review notes:</strong> {app.review_notes}
          </div>
        )}

        <StatusTimeline app={app} auditEntries={auditEntries} />

        <div className="bg-white border border-bnr-cream-dark rounded-lg p-6">
          <h2 className="text-xs font-bold text-bnr-brown uppercase tracking-wide mb-4">Application Details</h2>
          <dl className="space-y-3">
            <DetailRow label="Institution Name" value={app.institution_name} />
            <DetailRow label="Institution Type" value={app.institution_type} />
            <DetailRow label="License Type" value={app.license_type} />
            <DetailRow label="Reg. Number" value={app.registration_number} />
            <DetailRow label="Contact Email" value={app.contact_email} />
            <DetailRow label="Contact Phone" value={app.contact_phone} />
            <DetailRow label="Submitted" value={fmt(app.submitted_at)} />
            <DetailRow label="Created" value={fmt(app.created_at)} />
            {app.decided_at && <DetailRow label="Decision Date" value={fmt(app.decided_at)} />}
          </dl>
        </div>

        <div className="bg-white border border-bnr-cream-dark rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-bnr-brown uppercase tracking-wide flex items-center gap-2">
              <FontAwesomeIcon icon={faFileLines} className="text-bnr-gold" />
              Supporting Documents
            </h2>
            <span className="text-xs text-bnr-brown-mid">
              {docsLoading ? (
                <span className="flex items-center gap-1"><FontAwesomeIcon icon={faSpinner} spin /> Loading…</span>
              ) : `${uploadedCount} uploaded`}
            </span>
          </div>

          {allTypeNames.length === 0 && !docsLoading && (
            <p className="text-sm text-bnr-brown-light">No documents uploaded yet.</p>
          )}

          <div className="space-y-3">
            {allTypeNames.map((typeName) => (
              <DocTypeCard
                key={typeName}
                typeName={typeName}
                group={groupedDocs[typeName] ?? { current: null, old: [] }}
                docType={docTypeMap[typeName]}
                isEditable={isEditable}
                applicationId={app.id}
                uploadStatus={uploadStatuses[typeName]}
                uploadError={uploadErrors[typeName]}
              />
            ))}
          </div>
        </div>

        {app.status === "DRAFT" && (
          <div className="bg-white border border-bnr-cream-dark rounded-lg p-5">
            {missingMandatory.length > 0 && (
              <div className="mb-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                Required documents missing: <strong>{missingMandatory.map((d) => d.name).join(", ")}</strong>
              </div>
            )}
            {uploadedCount === 0 && missingMandatory.length === 0 && (
              <div className="mb-3 px-4 py-3 bg-bnr-gold-pale border border-bnr-cream-dark rounded text-xs text-bnr-brown">
                Upload at least one document before submitting.
              </div>
            )}
            {submitError && (
              <div role="alert" className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                {submitError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-bnr-brown-light">
                Once submitted you cannot edit unless additional info is requested.
              </p>
              <button
                onClick={() => {
                  dispatch(clearSubmitError());
                  dispatch(submitApplication(app.id));
                }}
                disabled={isSubmitting || uploadedCount === 0 || missingMandatory.length > 0 || anyUploading}
                className="ml-4 shrink-0 px-6 py-2.5 bg-bnr-brown text-white text-sm font-semibold rounded uppercase tracking-wide hover:bg-bnr-brown-mid disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting && <FontAwesomeIcon icon={faSpinner} spin />}
                {isSubmitting ? "Submitting…" : "Submit Application"}
              </button>
            </div>
          </div>
        )}

        {app.status === "ADDITIONAL_INFO_REQUIRED" && (
          <div className="bg-white border border-bnr-cream-dark rounded-lg p-5">
            {resubmitError && (
              <div role="alert" className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                {resubmitError}
              </div>
            )}
            {uploadedCount === 0 && (
              <div className="mb-3 px-4 py-3 bg-bnr-gold-pale border border-bnr-cream-dark rounded text-xs text-bnr-brown">
                Upload the requested documents before resubmitting.
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-bnr-brown-light">
                Upload the requested documents then resubmit for review.
              </p>
              <button
                onClick={() => {
                  dispatch(clearResubmitError());
                  dispatch(resubmitApplication(app.id));
                }}
                disabled={isResubmitting || uploadedCount === 0 || anyUploading}
                className="ml-4 shrink-0 px-6 py-2.5 bg-bnr-brown text-white text-sm font-semibold rounded uppercase tracking-wide hover:bg-bnr-brown-mid disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isResubmitting && <FontAwesomeIcon icon={faSpinner} spin />}
                {isResubmitting ? "Resubmitting…" : "Resubmit Application"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
