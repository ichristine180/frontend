import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const http = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let _store = null;
export function injectStore(store) {
  _store = store;
}

http.interceptors.request.use((config) => {
  const raw = localStorage.getItem("auth_session");
  if (raw) {
    try {
      const { accessToken } = JSON.parse(raw);
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    } catch {}
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, accessToken = null) {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(accessToken);
    }
  });
  failedQueue = [];
}

function clearAuthAndRedirect() {
  localStorage.removeItem("auth_session");
  if (_store) {
    _store.dispatch({ type: "auth/clearAuth" });
  }
  window.location.replace("/login");
}
http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    const isLoginRequest = original?.url?.includes("/auth/login");
    const isRefreshRequest = original?.url?.includes("/auth/refresh");
    if (
      err.response?.status !== 401 ||
      isLoginRequest ||
      isRefreshRequest ||
      original._retried
    ) {
      return Promise.reject(err);
    }
    let refreshToken = null;
    try {
      const raw = localStorage.getItem("auth_session");
      if (raw) refreshToken = JSON.parse(raw).refreshToken;
    } catch {}

    if (!refreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(err);
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((accessToken) => {
          original._retried = true;
          original.headers.Authorization = `Bearer ${accessToken}`;
          return http(original);
        })
        .catch((queueErr) => Promise.reject(queueErr));
    }

    original._retried = true;
    isRefreshing = true;

    try {
      const res = await http.post("/auth/refresh", { refreshToken });
      const { accessToken: newAccess, refreshToken: newRefresh } = res.data;

      // Persist the new tokens
      localStorage.setItem(
        "auth_session",
        JSON.stringify({
          ...JSON.parse(localStorage.getItem("auth_session") || "{}"),
          accessToken: newAccess,
          refreshToken: newRefresh,
        }),
      );

      // Sync Redux store
      if (_store) {
        _store.dispatch({
          type: "auth/setTokens",
          payload: { accessToken: newAccess, refreshToken: newRefresh },
        });
      }

      processQueue(null, newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return http(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      clearAuthAndRedirect();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

export const authApi = {
  register: async ({ email, password, full_name, organization }) => {
    const res = await http.post("/auth/register", {
      email,
      password,
      full_name,
      role: "APPLICANT",
      organization,
    });
    return res.data.user;
  },
  login: async ({ email, password }) => {
    const res = await http.post("/auth/login", { email, password });
    return res.data;
  },
  logout: async (refreshToken) => {
    await http.post("/auth/logout", { refreshToken });
  },
  refresh: async (refreshToken) => {
    const res = await http.post("/auth/refresh", { refreshToken });
    return res.data;
  },
};

export const applicationsApi = {
  list: async () => {
    const res = await http.get("/applications");
    return res.data.applications;
  },
  get: async (id) => {
    const res = await http.get(`/applications/${id}`);
    return res.data.application;
  },
  create: async (body) => {
    const res = await http.post("/applications", body);
    return res.data.application;
  },
  update: async (id, body) => {
    const res = await http.put(`/applications/${id}`, body);
    return res.data.application;
  },
  uploadDocument: async (applicationId, file, documentType) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("document_type", documentType);
    const res = await http.post(
      `/applications/${applicationId}/documents`,
      fd,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data.document;
  },
  listDocuments: async (applicationId) => {
    const res = await http.get(`/applications/${applicationId}/documents`);
    return res.data.documents;
  },
  submit: async (id) => {
    const res = await http.post(`/applications/${id}/submit`);
    return res.data.application;
  },
  resubmit: async (id) => {
    const res = await http.post(`/applications/${id}/resubmit`);
    return res.data.application;
  },
  getAudit: async (id) => {
    const res = await http.get(`/applications/${id}/audit`);
    return res.data.auditLog;
  },
  startReview: async (id) => {
    const res = await http.post(`/applications/${id}/start-review`);
    return res.data.application;
  },
  requestInfo: async (id, reason) => {
    const res = await http.post(`/applications/${id}/request-info`, { reason });
    return res.data.application;
  },
  completeReview: async (id, reviewNotes) => {
    const res = await http.post(`/applications/${id}/complete-review`, {
      review_notes: reviewNotes,
    });
    return res.data.application;
  },
  approve: async (id) => {
    const res = await http.post(`/applications/${id}/approve`);
    return res.data.application;
  },
  reject: async (id, reason) => {
    const res = await http.post(`/applications/${id}/reject`, { reason });
    return res.data.application;
  },
};

export const auditApi = {
  getSystemAudit: async () => {
    const res = await http.get("/audit");
    return res.data.auditLog;
  },
};

export const documentsApi = {
  listAll: async (applicationId) => {
    const res = await http.get(`/applications/${applicationId}/documents`);
    return res.data.documents;
  },
  open: async (docId) => {
    const res = await http.get(`/documents/${docId}/download`, {
      responseType: "blob",
    });
    const mime = res.headers["content-type"] || "application/octet-stream";
    const blob = new Blob([res.data], { type: mime });
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => window.URL.revokeObjectURL(url), 30000);
  },
};

export const documentTypesApi = {
  list: async () => {
    const res = await http.get("/document-types");
    return res.data.documentTypes;
  },
};

export default http;
