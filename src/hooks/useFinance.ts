import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useFinanceSummary(projectId: string) {
  return useQuery({
    queryKey: ["finance-summary", projectId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/projects/${projectId}/finance-summary`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useCashflow(projectId: string) {
  return useQuery({
    queryKey: ["cashflow", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/cashflow`);
      return res.data.data as Array<{
        month: string;
        invoiced: number;
        received: number;
        expenses: number;
      }>;
    },
    enabled: !!projectId,
  });
}

export function useInvoices(projectId: string, params?: {
  status?: string; invoice_type?: string;
}) {
  return useQuery({
    queryKey: ["invoices", projectId, params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.status) p.set("status", params.status);
      if (params?.invoice_type) p.set("invoice_type", params.invoice_type);
      const res = await apiClient.get(
        `/projects/${projectId}/invoices?${p}`
      );
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useExpenses(projectId: string, params?: {
  status?: string; category?: string;
}) {
  return useQuery({
    queryKey: ["expenses", projectId, params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.status) p.set("status", params.status);
      if (params?.category) p.set("category", params.category);
      const res = await apiClient.get(
        `/projects/${projectId}/expenses?${p}`
      );
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useChangeOrders(projectId: string) {
  return useQuery({
    queryKey: ["change-orders", projectId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/projects/${projectId}/change-orders`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function usePaymentCerts(projectId: string) {
  return useQuery({
    queryKey: ["payment-certs", projectId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/projects/${projectId}/payment-certificates`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateInvoice(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/projects/${projectId}/invoices`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", projectId] });
      qc.invalidateQueries({ queryKey: ["finance-summary", projectId] });
    },
  });
}

export function useApproveInvoice(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      apiClient.post(`/invoices/${invoiceId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", projectId] });
      qc.invalidateQueries({ queryKey: ["finance-summary", projectId] });
    },
  });
}

export function useRecordPayment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: any }) =>
      apiClient.post(`/invoices/${invoiceId}/payments`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", projectId] });
      qc.invalidateQueries({ queryKey: ["finance-summary", projectId] });
      qc.invalidateQueries({ queryKey: ["cashflow", projectId] });
    },
  });
}

export function useCreateExpense(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/projects/${projectId}/expenses`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", projectId] });
      qc.invalidateQueries({ queryKey: ["finance-summary", projectId] });
    },
  });
}

export function useApproveExpense(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) =>
      apiClient.post(`/expenses/${expenseId}/approve`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["expenses", projectId] }),
  });
}

export function useApproveChangeOrder(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (coId: string) =>
      apiClient.post(`/change-orders/${coId}/approve`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["change-orders", projectId] }),
  });
}

export function useCreateChangeOrder(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/projects/${projectId}/change-orders`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["change-orders", projectId] }),
  });
}