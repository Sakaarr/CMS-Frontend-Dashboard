// ── Auth ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  is_superadmin: boolean;
  status: string;
  avatar_url: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// ── Tenant ────────────────────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  email: string;
  country: string;
  currency: string;
  timezone: string;
  pan_number: string | null;
  vat_number: string | null;
  logo_url: string | null;
  max_projects: number;
  max_users: number;
}

// ── Project ───────────────────────────────────────────────────────
export type ProjectStatus =
  | "draft"
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export type ProjectType =
  | "residential"
  | "commercial"
  | "infrastructure"
  | "industrial"
  | "renovation"
  | "other";

export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  client_name: string | null;
  city: string | null;
  district: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  estimated_budget: number | null;
  approved_budget: number | null;
  currency: string;
  progress_percentage: number;
  project_manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  total: number;
  by_status: Record<ProjectStatus, number>;
  active_budget_total: number;
}

export interface Site {
  id: string;
  project_id: string;
  name: string;
  code: string;
  status: string;
  city: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  status: string;
  planned_date: string | null;
  actual_date: string | null;
  completion_percentage: number;
  is_critical: boolean;
  sequence: number;
}

// ── BOQ ───────────────────────────────────────────────────────────
export interface BudgetVersion {
  id: string;
  project_id: string;
  version_number: number;
  name: string;
  status: "draft" | "submitted" | "approved" | "superseded";
  total_material_cost: number;
  total_labour_cost: number;
  total_equipment_cost: number;
  total_amount: number;
  contingency_percentage: number;
  contingency_amount: number;
  grand_total: number;
  currency: string;
}

export interface BOQItem {
  id: string;
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  amount: number;
  material_rate: number;
  labour_rate: number;
  equipment_rate: number;
  actual_quantity: number;
  actual_amount: number;
  is_section_header: boolean;
  status: string;
  parent_id: string | null;
  sort_order: number;
}

export interface CostCode {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  standard_rate: number | null;
}

export interface BOQSummary {
  version_id: string;
  grand_total: number;
  total_amount: number;
  contingency_amount: number;
  total_material_cost: number;
  total_labour_cost: number;
  total_equipment_cost: number;
  items_count: number;
  planned_total: number;
  actual_total: number;
  variance: number;
}

// ── Shared ────────────────────────────────────────────────────────
export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}