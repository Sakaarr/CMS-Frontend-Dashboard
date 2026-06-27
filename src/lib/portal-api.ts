import axios, { AxiosError } from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const portalApi = axios.create({
  baseURL: API_BASE,
});

let onPortalUnauthenticated: (() => void) | null = null;

export function setPortalUnauthenticatedHandler(fn: () => void) {
  onPortalUnauthenticated = fn;
}

portalApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("portal_access_token");
    const tenantSlug = localStorage.getItem("portal_tenant_slug") || localStorage.getItem("tenant_slug");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (tenantSlug) config.headers["X-Tenant-Slug"] = tenantSlug;
  }
  return config;
});

portalApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (originalRequest?.url?.includes("/portal/auth/")) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !(originalRequest as any)?._retry) {
      (originalRequest as any)._retry = true;
      const refresh = localStorage.getItem("portal_refresh_token");
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE}/portal/auth/refresh`, {
            refresh_token: refresh,
          });
          const { access_token, refresh_token } = res.data.data;
          localStorage.setItem("portal_access_token", access_token);
          localStorage.setItem("portal_refresh_token", refresh_token);
          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return portalApi(originalRequest);
          }
        } catch {
          localStorage.removeItem("portal_access_token");
          localStorage.removeItem("portal_refresh_token");
          localStorage.removeItem("portal_user");
          onPortalUnauthenticated?.();
        }
      } else {
        localStorage.removeItem("portal_access_token");
        localStorage.removeItem("portal_refresh_token");
        localStorage.removeItem("portal_user");
        onPortalUnauthenticated?.();
      }
    }
    return Promise.reject(error);
  }
);
