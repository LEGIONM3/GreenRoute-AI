export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
}

export interface Permission {
  id?: string;
  code: string;
  name: string;
  category: string;
  description?: string;
}

export interface UserSession {
  id: string;
  device_name: string;
  ip_address: string;
  expires_at: string;
  created_at: string;
  is_current?: boolean;
}

export interface Municipality {
  id: string;
  name: string;
  code: string;
  state: string;
  center_lat: number;
  center_lon: number;
  is_active: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  status: "active" | "suspended" | "pending_verification";
  email_verified: boolean;
  phone_verified: boolean;
  environmental_score: number;
  municipality_id?: string;
  municipality?: Municipality;
  role: Role;
  roles?: Role[];
  permissions?: string[];
  created_at: string;
  last_login?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LocationCategory {
  id: string;
  name: string;
  code: string;
  icon?: string;
  color?: string;
  description?: string;
}

export interface LocationItem {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  category?: LocationCategory;
  municipality_id?: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  postal_code?: string;
  accepted_waste_types: string[];
  operating_hours: Record<string, string>;
  contact_phone?: string;
  is_verified: boolean;
  is_active: boolean;
  distance_km?: number | null;
  directions_url?: string;
  created_at: string;
}

export interface IssueReport {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  municipality_id?: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  image_url?: string;
  status: "Open" | "In Progress" | "Resolved";
  admin_notes?: string;
  resolved_by_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Policy {
  id: string;
  title: string;
  authority: string;
  category: string;
  document_number?: string;
  effective_date?: string;
  summary: string;
  full_text: string;
  file_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  tags: string[];
  read_time: string;
  infographic_url?: string;
  views_count: number;
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  category: string;
  tags: string[];
  chunk_count: number;
  uploaded_by_id?: string;
  created_at: string;
}

export interface WasteItem {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  segregation_bin: string;
  disposal_method: string;
  recycling_guidance: string;
  safety_precautions: string;
  target_facility_code: string;
  created_at: string;
}

export interface WasteSearchResponse {
  query: string;
  matched_item?: WasteItem | null;
  all_matching_items: WasteItem[];
  nearest_facilities: LocationItem[];
}

export interface CitationItem {
  title: string;
  source_type: string;
  reference: string;
  chunk_excerpt: string;
  relevance_score: number;
}

export interface ChatQueryResponse {
  answer: string;
  citations: CitationItem[];
  session_id: string;
  suggested_followups: string[];
  confidence_score: number;
  model_used?: string;
  related_locations: Array<{
    id: string;
    name: string;
    address: string;
    category?: string;
    distance_km?: number;
    directions_url?: string;
  }>;
  related_policies: Array<{
    id: string;
    title: string;
    document_number?: string;
    authority?: string;
    summary?: string;
  }>;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  citations: CitationItem[];
  confidence_score?: number;
  model_used?: string;
  related_locations?: ChatQueryResponse["related_locations"];
  related_policies?: ChatQueryResponse["related_policies"];
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AdminMetrics {
  total_users: number;
  total_locations: number;
  total_reports: number;
  open_reports: number;
  in_progress_reports: number;
  resolved_reports: number;
  total_policies: number;
  total_articles: number;
  resolution_rate_pct: number;
  reports_by_category: Record<string, number>;
  locations_by_category: Record<string, number>;
  recent_reports: IssueReport[];
  audit_logs_count?: number;
  knowledge_documents_count?: number;
}

export interface RoleMatrixItem {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface SystemSettings {
  ai_provider: string;
  primary_model: string;
  fallback_models: string[];
  max_output_tokens: number;
  temperature: number;
  audit_retention_days: number;
  enforce_mfa: boolean;
  default_municipality: string;
}

export interface AIAnalyticsData {
  total_rag_queries: number;
  avg_response_latency_ms: number;
  avg_confidence_score: number;
  active_provider: string;
  fallback_events_count: number;
  top_queried_categories: Array<{ category: string; count: number }>;
}

export interface TenantItem {
  id: string;
  name: string;
  slug: string;
  tier: string;
  region_count: number;
  is_active: boolean;
}

export interface RegionItem {
  id: string;
  name: string;
  code: string;
  zone_count: number;
}

export interface WardItem {
  id: string;
  name: string;
  ward_number: number;
  officer_name?: string;
  officer_contact?: string;
  center_lat?: number;
  center_lon?: number;
  active_bins: number;
  overflow_bins: number;
  open_reports: number;
  efficiency_pct: number;
}

export interface SmartBinItem {
  id: string;
  bin_code: string;
  ward_name: string;
  capacity_litres: number;
  fill_level_pct: number;
  battery_pct: number;
  temperature_celsius: number;
  tilt_angle: number;
  is_overflowing: boolean;
  last_telemetry_at?: string;
}

export interface HeatmapData {
  points: Array<{
    lat: number;
    lon: number;
    weight: number;
    category: string;
    status: string;
  }>;
  total_points: number;
  generated_at: string;
}

export interface SavedLocationItem {
  id: string;
  location_id: string;
  name: string;
  address: string;
  category: string;
  saved_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "alert";
  created_at: string;
  is_read: boolean;
  action_url?: string;
}
