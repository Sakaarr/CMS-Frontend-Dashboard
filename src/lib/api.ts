import axios, { AxiosError } from "axios";

const STATUS_MESSAGES: Record<number, string> = {
  400: "The request was invalid. Please check your input.",
  401: "Your session has expired. Please log in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "This action conflicts with existing data. It may already exist or be in use.",
  422: "The submitted data is invalid. Please check your input.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "An unexpected server error occurred. Please try again later.",
  502: "The server is temporarily unavailable. Please try again.",
  503: "Service is temporarily unavailable. Please try again later.",
};

function getFastApiDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e: any) => {
        if (typeof e === "string") return e;
        if (e?.msg) return e.msg;
        return "";
      })
      .filter(Boolean)
      .join(". ");
  }
  return "";
}

export function extractApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const detail = err.response?.data?.detail;
    const friendly = getFastApiDetail(detail);
    if (friendly) return friendly;
    if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
    if (err.message === "Network Error") {
      return "Unable to connect to the server. Please check your internet connection.";
    }
    return "Something went wrong. Please try again.";
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE,
});

// Attach token + tenant slug on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    const tenantSlug = localStorage.getItem("tenant_slug");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (tenantSlug) config.headers["X-Tenant-Slug"] = tenantSlug;
  }
  return config;
});

// Auto-refresh token on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Skip auth endpoints
    if (originalRequest?.url?.includes("/auth/")) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, {
            refresh_token: refresh,
          });
          const { access_token, refresh_token } = res.data.data;
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", refresh_token);
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${access_token}`;
            return axios(error.config);
          }
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("tenant_slug");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      } else {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("tenant_slug");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);