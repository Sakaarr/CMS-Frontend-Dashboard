import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { portalApi } from "@/lib/portal-api";
import { apiClient } from "@/lib/api";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import { useRouter } from "next/navigation";
import type { APIResponse, PaginatedResponse } from "@/types";

export interface PortalDashboard {
  active_contracts: number;
  total_contract_value: number;
  total_certified_value: number;
  total_paid_amount: number;
  pending_progress_entries: number;
  approved_progress_entries: number;
  open_ncrs: number;
  open_punch_items: number;
  expiring_documents: number;
}

export interface PortalContract {
  id: string;
  project_id: string;
  project_name: string | null;
  contract_number: string;
  title: string;
  description: string | null;
  status: string;
  contract_value: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  scope_of_work: string | null;
  boq_item_count: number;
}

export interface PortalBOQItem {
  id: string;
  boq_item_id: string;
  item_number: string;
  description: string;
  unit: string;
  boq_quantity: number;
  boq_unit_rate: number;
  assigned_quantity: number;
  unit_rate: number;
  contract_amount: number;
  status: string;
  cumulative_progress: number;
  remaining_quantity: number;
}

export interface PortalProgressEntry {
  id: string;
  contract_id: string;
  boq_item_id: string;
  item_number: string;
  item_description: string;
  report_date: string;
  work_date: string;
  quantity_completed: number;
  cumulative_quantity: number;
  remarks: string | null;
  attachments: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalCertificate {
  id: string;
  contract_id: string;
  contract_title: string | null;
  certificate_number: string;
  period_start: string;
  period_end: string;
  status: string;
  previous_certified_value: number;
  current_completed_value: number;
  total_certified_value: number;
  retention_percentage: number;
  retention_amount: number;
  deductions: number;
  gross_payable: number;
  net_payable: number;
  previous_paid_amount: number;
  amount_due: number;
  revision_number: number;
  remarks: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface PortalCertificateItem {
  boq_item_id: string;
  description: string;
  unit: string;
  assigned_quantity: number;
  unit_rate: number;
  previous_certified_qty: number;
  previous_certified_amount: number;
  current_qty: number;
  current_amount: number;
  total_certified_qty: number;
  total_certified_amount: number;
  remaining_qty: number;
}

export interface PortalCertificateDetail extends PortalCertificate {
  items: PortalCertificateItem[];
}

export interface PortalNCR {
  id: string;
  project_id: string;
  ncr_number: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  location: string | null;
  due_date: string | null;
  closed_date: string | null;
  root_cause: string | null;
  corrective_action: string | null;
  created_at: string;
}

export interface PortalPunchItem {
  id: string;
  project_id: string;
  item_number: string;
  description: string;
  location: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_date: string | null;
  remarks: string | null;
}

export interface PortalSafetyObservation {
  id: string;
  observation_number: string;
  title: string;
  description: string;
  observation_type: string;
  status: string;
  observation_date: string;
  location: string | null;
  is_positive: boolean;
  action_taken: string | null;
  notes: string | null;
}

export interface PortalComplianceDoc {
  id: string;
  document_number: string;
  title: string;
  category: string;
  status: string;
  issuing_authority: string | null;
  reference_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  renewable: boolean;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
  notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface PortalPayment {
  id: string;
  invoice_number: string;
  certificate_number: string | null;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  paid_amount: number;
  payment_date: string | null;
  payment_method: string | null;
  status: string;
  created_at: string;
}

export interface PortalNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ── Auth ────────────────────────────────────────────────────────────

export function usePortalLogin() {
  const { setPortalAuth } = usePortalAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await portalApi.post("/portal/auth/login", data);
      return res.data.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("portal_access_token", data.access_token);
      localStorage.setItem("portal_refresh_token", data.refresh_token);
      localStorage.removeItem("portal_user");
      setPortalAuth(data.user);
      queryClient.invalidateQueries();
      router.push("/portal/dashboard");
    },
  });
}

export function usePortalLogout() {
  const { logout } = usePortalAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return () => {
    logout();
    queryClient.clear();
    router.push("/portal/login");
  };
}

// ── Dashboard ───────────────────────────────────────────────────────

export function usePortalDashboard() {
  return useQuery({
    queryKey: ["portal-dashboard"],
    queryFn: async () => {
      const res = await portalApi.get<APIResponse<PortalDashboard>>(
        "/portal/dashboard"
      );
      return res.data.data;
    },
  });
}

// ── Contracts ───────────────────────────────────────────────────────

export function usePortalContracts(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["portal-contracts", page, pageSize],
    queryFn: async () => {
      const res = await portalApi.get<PaginatedResponse<PortalContract>>(
        "/portal/contracts",
        { params: { page, page_size: pageSize } }
      );
      return res.data;
    },
  });
}

export function usePortalContractBOQItems(contractId: string, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ["portal-boq-items", contractId, page, pageSize],
    queryFn: async () => {
      const res = await portalApi.get<PaginatedResponse<PortalBOQItem>>(
        `/portal/contracts/${contractId}/boq-items`,
        { params: { page, page_size: pageSize } }
      );
      return res.data;
    },
    enabled: !!contractId,
  });
}

// ── Progress ────────────────────────────────────────────────────────

export function usePortalProgressList(
  status?: string,
  page = 1,
  pageSize = 20
) {
  return useQuery({
    queryKey: ["portal-progress", status, page, pageSize],
    queryFn: async () => {
      const res = await portalApi.get<PaginatedResponse<PortalProgressEntry>>(
        "/portal/progress",
        { params: { status, page, page_size: pageSize } }
      );
      return res.data;
    },
  });
}

export function usePortalCreateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      contract_id: string;
      boq_item_id: string;
      report_date: string;
      work_date: string;
      quantity_completed: number;
      remarks?: string;
    }) => {
      const res = await portalApi.post("/portal/progress", data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-progress"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
    },
  });
}

export function usePortalSubmitProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const res = await portalApi.post(`/portal/progress/${entryId}/submit`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-progress"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
    },
  });
}

// ── Certificates ────────────────────────────────────────────────────

export function usePortalCertificates(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["portal-certificates", page, pageSize],
    queryFn: async () => {
      const res = await portalApi.get<PaginatedResponse<PortalCertificate>>(
        "/portal/certificates",
        { params: { page, page_size: pageSize } }
      );
      return res.data;
    },
  });
}

export function usePortalCertificate(id: string) {
  return useQuery({
    queryKey: ["portal-certificate", id],
    queryFn: async () => {
      const res = await portalApi.get<APIResponse<PortalCertificateDetail>>(
        `/portal/certificates/${id}`
      );
      return res.data.data;
    },
    enabled: !!id,
  });
}

// ── Quality ─────────────────────────────────────────────────────────

export function usePortalNCRs(status?: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["portal-ncrs", status, page, pageSize],
    queryFn: async () => {
      const res = await portalApi.get<PaginatedResponse<PortalNCR>>(
        "/portal/quality/ncrs",
        { params: { status, page, page_size: pageSize } }
      );
      return res.data;
    },
  });
}

export function usePortalRespondNCR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ncrId,
      ...data
    }: {
      ncrId: string;
      root_cause: string;
      corrective_action: string;
      preventive_action?: string;
    }) => {
      const res = await portalApi.post(
        `/portal/quality/ncrs/${ncrId}/respond`,
        data
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-ncrs"] });
    },
  });
}

export function usePortalPunchItems(status?: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["portal-punch-items", status, page, pageSize],
    queryFn: async () => {
      const res = await portalApi.get<PaginatedResponse<PortalPunchItem>>(
        "/portal/quality/punch-items",
        { params: { status, page, page_size: pageSize } }
      );
      return res.data;
    },
  });
}

export function usePortalRespondPunchItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      ...data
    }: {
      itemId: string;
      remarks: string;
      status: string;
    }) => {
      const res = await portalApi.post(
        `/portal/quality/punch-items/${itemId}/respond`,
        data
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-punch-items"] });
    },
  });
}

export function usePortalSafetyObservations(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["portal-safety-observations", page, pageSize],
    queryFn: async () => {
      const res = await portalApi.get<
        PaginatedResponse<PortalSafetyObservation>
      >("/portal/quality/safety-observations", {
        params: { page, page_size: pageSize },
      });
      return res.data;
    },
  });
}

// ── Compliance ──────────────────────────────────────────────────────

export function usePortalComplianceDocs(
  category?: string,
  page = 1,
  pageSize = 20
) {
  return useQuery({
    queryKey: ["portal-compliance-docs", category, page, pageSize],
    queryFn: async () => {
      const res = await portalApi.get<PaginatedResponse<PortalComplianceDoc>>(
        "/portal/compliance-docs",
        { params: { category, page, page_size: pageSize } }
      );
      return res.data;
    },
  });
}

// ── Payments ────────────────────────────────────────────────────────

export function usePortalPayments(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["portal-payments", page, pageSize],
    queryFn: async () => {
      const res = await portalApi.get<PaginatedResponse<PortalPayment>>(
        "/portal/payments",
        { params: { page, page_size: pageSize } }
      );
      return res.data;
    },
  });
}

// ── Notifications ───────────────────────────────────────────────────

export function usePortalNotifications(
  unreadOnly = false,
  page = 1,
  pageSize = 50
) {
  return useQuery({
    queryKey: ["portal-notifications", unreadOnly, page, pageSize],
    queryFn: async () => {
      const res = await portalApi.get<PaginatedResponse<PortalNotification>>(
        "/portal/notifications",
        { params: { unread_only: unreadOnly, page, page_size: pageSize } }
      );
      return res.data;
    },
  });
}

export function usePortalMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notifId: string) => {
      const res = await portalApi.post(`/portal/notifications/${notifId}/read`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-notifications"] });
    },
  });
}

export function usePortalMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await portalApi.post("/portal/notifications/read-all");
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-notifications"] });
    },
  });
}

// ── Profile ─────────────────────────────────────────────────────────

export function usePortalChangePassword() {
  const { setPortalAuth } = usePortalAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: {
      current_password: string;
      new_password: string;
    }) => {
      const res = await portalApi.post("/portal/auth/change-password", data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setTimeout(() => {
        router.push("/portal/dashboard");
      }, 100);
    },
  });
}

export function usePortalUnreadCount(disabled?: boolean) {
  return useQuery({
    queryKey: ["portal-notifications", "unread-count"],
    queryFn: async () => {
      const res = await portalApi.get<PaginatedResponse<PortalNotification>>(
        "/portal/notifications",
        { params: { unread_only: true, page: 1, page_size: 1 } }
      );
      return res.data.total;
    },
    enabled: !disabled,
    refetchInterval: disabled ? false : 30000,
  });
}

// ── Admin: Create Portal User (uses main-identity auth) ────────────

export function useAdminCreatePortalUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      subcontractor_id: string;
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      role: string;
    }) => {
      const { subcontractor_id, ...body } = data;
      const res = await apiClient.post<APIResponse<any>>(
        "/portal/admin/users",
        body,
        { params: { subcontractor_id } }
      );
      return res.data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["subcontractor", vars.subcontractor_id],
      });
    },
  });
}
