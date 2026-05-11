import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faSpinner,
  faTriangleExclamation,
  faCircleCheck,
  faUpload,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import {
  createApplication,
  fetchApplications,
  fetchDocumentTypes,
  uploadDocument,
  submitApplication,
  resetDraft,
  clearSubmitError,
  selectCurrentApp,
  selectCreateStatus,
  selectCreateError,
  selectDocumentTypes,
  selectDocTypesStatus,
  selectUploadStatuses,
  selectUploadErrors,
  selectSubmitStatus,
  selectSubmitError,
  selectListStatus,
  selectPendingApplication,
} from "../../features/applications/applicationsSlice";
import { applicationsApi } from "../../services/api";
import Layout from "../../components/Layout";

const INSTITUTION_TYPES = [
  "Commercial Bank",
  "Microfinance Institution",
  "Savings and Credit Cooperative (SACCO)",
  "Development Finance Institution",
  "Payment Service Provider",
  "Other",
];

const LICENSE_TYPES = [
  "Tier 1 Banking License",
  "Tier 2 Banking License",
  "Microfinance License",
  "SACCO License",
  "Payment Institution License",
  "Other",
];

const EMPTY_FORM = {
  institution_name: "",
  institution_type: "",
  license_type: "",
  registration_number: "",
  contact_email: "",
  contact_phone: "",
};

function StepIndicator({ step }) {
  const steps = ["Application Details", "Upload Documents"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${done ? "bg-bnr-gold text-white" : active ? "bg-bnr-brown text-white" : "bg-bnr-cream-dark text-bnr-brown-light"}`}
              >
                {done ? <FontAwesomeIcon icon={faCircleCheck} /> : num}
              </div>
              <span className={`text-xs font-medium uppercase tracking-wide ${active ? "text-bnr-brown" : "text-bnr-brown-light"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 mx-3 ${step > num ? "bg-bnr-gold" : "bg-bnr-cream-dark"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(email) {
  return EMAIL_RE.test(email.trim());
}

function isValidPhone(val) {
  return /^(\+250|250|0)?[7][2-9]\d{7}$/.test(val.replace(/[\s\-()]/g, ""));
}

function validateForm(form) {
  const errors = {};
  if (!form.institution_name.trim()) errors.institution_name = "Institution name is required";
  if (!form.institution_type) errors.institution_type = "Please select an institution type";
  if (!form.license_type) errors.license_type = "Please select a license type";
  if (form.contact_email.trim() && !isValidEmail(form.contact_email))
    errors.contact_email = "Enter a valid email address";
  if (form.contact_phone.trim() && !isValidPhone(form.contact_phone))
    errors.contact_phone = "Enter a valid Rwandan phone number (e.g. +250 7XX XXX XXX)";
  return errors;
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-bnr-brown uppercase tracking-wide mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 border border-bnr-cream-dark rounded text-sm text-bnr-brown focus:outline-none focus:ring-2 focus:ring-bnr-gold focus:border-transparent disabled:bg-bnr-cream/60";
const selectCls = inputCls + " bg-white";

function DocTypeRow({ docType, applicationId, uploadStatus, uploadError, uploadedDoc }) {
  const dispatch = useDispatch();
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    dispatch(uploadDocument({ applicationId, file, documentType: docType.name }));
    e.target.value = "";
  };

  const isUploading = uploadStatus === "loading";
  const isDone = uploadStatus === "success" || !!uploadedDoc;

  return (
    <div className={`flex items-start justify-between gap-4 px-5 py-4 rounded-lg border ${isDone ? "border-green-200 bg-green-50/40" : "border-bnr-cream-dark bg-white"}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <FontAwesomeIcon icon={faFileLines} className="text-bnr-brown-light text-sm" />
          <p className="text-sm font-medium text-bnr-brown">{docType.name}</p>
          {docType.mandatory && (
            <span className="text-[10px] uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
              Required
            </span>
          )}
        </div>
        {uploadStatus === "error" && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            {uploadError}
          </p>
        )}
        {isDone && uploadedDoc && (
          <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
            <FontAwesomeIcon icon={faCircleCheck} />
            {uploadedDoc.original_name}
          </p>
        )}
      </div>
      <div className="shrink-0">
        {isUploading ? (
          <span className="text-xs text-bnr-brown-light flex items-center gap-1">
            <FontAwesomeIcon icon={faSpinner} spin /> Uploading…
          </span>
        ) : isDone ? (
          <button onClick={() => fileRef.current?.click()} className="text-xs text-bnr-gold hover:underline flex items-center gap-1">
            <FontAwesomeIcon icon={faUpload} /> Replace
          </button>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-bnr-gold text-bnr-gold text-xs font-semibold rounded hover:bg-bnr-gold hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faUpload} /> Upload
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

export default function NewApplicationPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id: draftId } = useParams();

  const current = useSelector(selectCurrentApp);
  const isCreating = useSelector(selectCreateStatus);
  const createError = useSelector(selectCreateError);
  const docTypes = useSelector(selectDocumentTypes);
  const isLoadingDocTypes = useSelector(selectDocTypesStatus);
  const uploadStatuses = useSelector(selectUploadStatuses);
  const uploadErrors = useSelector(selectUploadErrors);
  const isSubmitting = useSelector(selectSubmitStatus);
  const submitError = useSelector(selectSubmitError);

  const isLoadingList = useSelector(selectListStatus);
  const pendingApp = useSelector(selectPendingApplication);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [loadingDraft, setLoadingDraft] = useState(!!draftId);

  const wasCreating = useRef(false);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (!draftId) dispatch(fetchApplications());
  }, [draftId, dispatch]);

  useEffect(() => {
    if (!draftId && !isLoadingList && pendingApp) {
      navigate("/dashboard", { replace: true });
    }
  }, [draftId, isLoadingList, pendingApp, navigate]);

  useEffect(() => {
    if (!draftId) return;
    applicationsApi
      .get(draftId)
      .then((app) => {
        setForm({
          institution_name: app.institution_name ?? "",
          institution_type: app.institution_type ?? "",
          license_type: app.license_type ?? "",
          registration_number: app.registration_number ?? "",
          contact_email: app.contact_email ?? "",
          contact_phone: app.contact_phone ?? "",
        });
        dispatch({ type: "apps/create/fulfilled", payload: app });
        setStep(2);
      })
      .catch(() => navigate("/dashboard", { replace: true }))
      .finally(() => setLoadingDraft(false));
  }, [draftId, dispatch, navigate]);

  // advance to step 2 once the create thunk finishes without error
  // wasCreating ref prevents this from firing on initial render
  useEffect(() => {
    if (wasCreating.current && !isCreating && !createError && current) {
      setStep(2);
    }
    wasCreating.current = isCreating;
  }, [isCreating, createError, current]);

  useEffect(() => {
    if (wasSubmitting.current && !isSubmitting && !submitError) {
      dispatch(resetDraft());
      navigate("/dashboard", { replace: true });
    }
    wasSubmitting.current = isSubmitting;
  }, [isSubmitting, submitError, dispatch, navigate]);

  useEffect(() => {
    dispatch(fetchDocumentTypes());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      dispatch(resetDraft());
    };
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const errors = validateForm(form);
    if (errors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: errors[name] }));
    }
  };

  const handleSaveDraft = (e) => {
    e.preventDefault();
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    dispatch(
      createApplication({
        institution_name: form.institution_name.trim(),
        institution_type: form.institution_type,
        license_type: form.license_type,
        registration_number: form.registration_number.trim() || undefined,
        contact_email: form.contact_email.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
      }),
    );
  };

  const handleSubmit = () => {
    if (!current?.id) return;
    dispatch(clearSubmitError());
    dispatch(submitApplication(current.id));
  };

  const uploadedByType = {};
  for (const doc of current?.documents ?? []) {
    uploadedByType[doc.document_type] = doc;
  }

  const uploadedCount = Object.keys(uploadedByType).length;
  const missingMandatory = docTypes.filter((dt) => dt.mandatory && !uploadedByType[dt.name]);
  const anyUploading = Object.values(uploadStatuses).some((s) => s === "loading");

  if (loadingDraft) {
    return (
      <Layout>
        <div className="py-16 text-center text-sm text-bnr-brown-light flex items-center justify-center gap-2">
          <FontAwesomeIcon icon={faSpinner} spin />
          Loading draft…
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => (step === 2 ? setStep(1) : navigate("/dashboard"))}
          className="flex items-center gap-1.5 text-xs text-bnr-brown-light hover:text-bnr-brown mb-6"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          {step === 2 ? "Back to details" : "Back to dashboard"}
        </button>

        <StepIndicator step={step} />

        {step === 1 && (
          <div className="bg-white border border-bnr-cream-dark rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-bold text-bnr-brown uppercase tracking-wide mb-5">
              Institution Details
            </h2>

            {createError && (
              <div role="alert" className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                {createError}
              </div>
            )}

            <form onSubmit={handleSaveDraft} className="space-y-4">
              <Field label="Institution Name" required error={formErrors.institution_name}>
                <input
                  name="institution_name"
                  value={form.institution_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isCreating}
                  className={`${inputCls} ${formErrors.institution_name ? "border-red-400 focus:ring-red-400" : ""}`}
                  placeholder="e.g. Rwanda Commercial Bank Ltd"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Institution Type" required error={formErrors.institution_type}>
                  <select
                    name="institution_type"
                    value={form.institution_type}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isCreating}
                    className={`${selectCls} ${formErrors.institution_type ? "border-red-400 focus:ring-red-400" : ""}`}
                  >
                    <option value="">Select type…</option>
                    {INSTITUTION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>

                <Field label="License Type" required error={formErrors.license_type}>
                  <select
                    name="license_type"
                    value={form.license_type}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isCreating}
                    className={`${selectCls} ${formErrors.license_type ? "border-red-400 focus:ring-red-400" : ""}`}
                  >
                    <option value="">Select license…</option>
                    {LICENSE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Registration Number">
                <input
                  name="registration_number"
                  value={form.registration_number}
                  onChange={handleChange}
                  disabled={isCreating}
                  className={inputCls}
                  placeholder="Company registration number (optional)"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact Email" error={formErrors.contact_email}>
                  <input
                    name="contact_email"
                    type="text"
                    value={form.contact_email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isCreating}
                    className={`${inputCls} ${formErrors.contact_email ? "border-red-400 focus:ring-red-400" : ""}`}
                    placeholder="contact@institution.rw"
                  />
                </Field>

                <Field label="Contact Phone" error={formErrors.contact_phone}>
                  <input
                    name="contact_phone"
                    type="text"
                    value={form.contact_phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isCreating}
                    className={`${inputCls} ${formErrors.contact_phone ? "border-red-400 focus:ring-red-400" : ""}`}
                    placeholder="+250 7XX XXX XXX"
                  />
                </Field>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isCreating || Object.keys(validateForm(form)).length > 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-bnr-gold text-white text-sm font-semibold rounded uppercase tracking-wide hover:bg-bnr-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating && <FontAwesomeIcon icon={faSpinner} spin />}
                  {isCreating ? "Saving…" : (
                    <><span>Save & Continue</span><FontAwesomeIcon icon={faArrowRight} /></>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 2 && current && (
          <div className="space-y-4">
            <div className="bg-white border border-bnr-cream-dark rounded-lg px-5 py-4">
              <p className="text-xs font-semibold text-bnr-brown uppercase tracking-wide mb-1">
                Application Draft
              </p>
              <p className="text-sm font-semibold text-bnr-brown">{current.institution_name}</p>
              <p className="text-xs text-bnr-brown-mid mt-0.5">
                {current.license_type} · {current.institution_type}
              </p>
            </div>

            <div className="bg-white border border-bnr-cream-dark rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-bnr-brown uppercase tracking-wide flex items-center gap-2">
                  <FontAwesomeIcon icon={faFileLines} className="text-bnr-gold" />
                  Supporting Documents
                </h2>
                <span className="text-xs text-bnr-brown-mid">{uploadedCount} uploaded</span>
              </div>

              {isLoadingDocTypes && (
                <p className="text-sm text-bnr-brown-light py-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Loading document types…
                </p>
              )}

              {!isLoadingDocTypes && docTypes.length > 0 && (
                <div className="space-y-2">
                  {docTypes.map((dt) => (
                    <DocTypeRow
                      key={dt.id}
                      docType={dt}
                      applicationId={current.id}
                      uploadStatus={uploadStatuses[dt.name]}
                      uploadError={uploadErrors[dt.name]}
                      uploadedDoc={uploadedByType[dt.name]}
                    />
                  ))}
                </div>
              )}

              {!isLoadingDocTypes && docTypes.length === 0 && (
                <p className="text-sm text-bnr-brown-light py-4">No document types configured.</p>
              )}
            </div>

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
                  Once submitted, you cannot edit the application unless additional information is requested.
                </p>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || uploadedCount === 0 || missingMandatory.length > 0 || anyUploading}
                  className="ml-4 shrink-0 px-6 py-2.5 bg-bnr-brown text-white text-sm font-semibold rounded uppercase tracking-wide hover:bg-bnr-brown-mid disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <FontAwesomeIcon icon={faSpinner} spin />}
                  {isSubmitting ? "Submitting…" : "Submit Application"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
