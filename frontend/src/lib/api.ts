import {
  AuthTokens,
  User,
  UserSession,
  LocationCategory,
  LocationItem,
  IssueReport,
  Policy,
  KnowledgeArticle,
  KnowledgeDocument,
  WasteItem,
  WasteSearchResponse,
  ChatQueryResponse,
  ChatSession,
  AdminMetrics,
  RoleMatrixItem,
  AuditLog,
  SystemSettings,
  AIAnalyticsData,
  Municipality,
  TenantItem,
  RegionItem,
  WardItem,
  SmartBinItem,
  HeatmapData,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = "An unexpected error occurred.";
    try {
      const data = await res.json();
      errorDetail = data.detail || errorDetail;
    } catch {
      errorDetail = res.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthTokens> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthTokens>(res);
  },

  async register(data: { email: string; password: string; full_name: string; phone?: string; role_name?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<User>(res);
  },

  // Locations
  async getCategories(): Promise<LocationCategory[]> {
    const res = await fetch(`${API_BASE}/locations/categories`);
    return handleResponse<LocationCategory[]>(res);
  },

  async getLocations(params?: {
    category_code?: string;
    search?: string;
    lat?: number;
    lon?: number;
    radius_km?: number;
  }): Promise<LocationItem[]> {
    const query = new URLSearchParams();
    if (params?.category_code) query.set("category_code", params.category_code);
    if (params?.search) query.set("search", params.search);
    if (params?.lat !== undefined) query.set("lat", params.lat.toString());
    if (params?.lon !== undefined) query.set("lon", params.lon.toString());
    if (params?.radius_km !== undefined) query.set("radius_km", params.radius_km.toString());

    const url = `${API_BASE}/locations${query.toString() ? `?${query.toString()}` : ""}`;
    const res = await fetch(url);
    return handleResponse<LocationItem[]>(res);
  },

  async getLocationById(id: string, coords?: { lat: number; lon: number }): Promise<LocationItem> {
    const query = coords ? `?lat=${coords.lat}&lon=${coords.lon}` : "";
    const res = await fetch(`${API_BASE}/locations/${id}${query}`);
    return handleResponse<LocationItem>(res);
  },

  async createLocation(data: Partial<LocationItem>): Promise<LocationItem> {
    const res = await fetch(`${API_BASE}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<LocationItem>(res);
  },

  async updateLocation(id: string, data: Partial<LocationItem>): Promise<LocationItem> {
    const res = await fetch(`${API_BASE}/locations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<LocationItem>(res);
  },

  async deleteLocation(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/locations/${id}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<void>(res);
  },

  // Waste Item Guidance Search
  async searchWaste(query: string, coords?: { lat: number; lon: number }): Promise<WasteSearchResponse> {
    const searchParams = new URLSearchParams({ q: query });
    if (coords) {
      searchParams.set("lat", coords.lat.toString());
      searchParams.set("lon", coords.lon.toString());
    }
    const res = await fetch(`${API_BASE}/search/waste?${searchParams.toString()}`);
    return handleResponse<WasteSearchResponse>(res);
  },

  async listWasteItems(params?: { category?: string; bin_type?: string }): Promise<WasteItem[]> {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.bin_type) query.set("bin_type", params.bin_type);
    const res = await fetch(`${API_BASE}/search/items?${query.toString()}`);
    return handleResponse<WasteItem[]>(res);
  },

  // Reports
  async submitReport(formData: FormData): Promise<IssueReport> {
    const res = await fetch(`${API_BASE}/reports/with-image`, {
      method: "POST",
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse<IssueReport>(res);
  },

  async getReports(params?: { status?: string; category?: string; only_mine?: boolean }): Promise<IssueReport[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.category) query.set("category", params.category);
    if (params?.only_mine) query.set("only_mine", "true");
    const res = await fetch(`${API_BASE}/reports?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IssueReport[]>(res);
  },

  async updateReportStatus(id: string, status: string, admin_notes?: string): Promise<IssueReport> {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ status, admin_notes }),
    });
    return handleResponse<IssueReport>(res);
  },

  // Policies
  async getPolicies(category?: string, search?: string): Promise<Policy[]> {
    const query = new URLSearchParams();
    if (category) query.set("category", category);
    if (search) query.set("search", search);
    const res = await fetch(`${API_BASE}/policies?${query.toString()}`);
    return handleResponse<Policy[]>(res);
  },

  async getPolicyById(id: string): Promise<Policy> {
    const res = await fetch(`${API_BASE}/policies/${id}`);
    return handleResponse<Policy>(res);
  },

  // Articles
  async getArticles(category?: string, search?: string): Promise<KnowledgeArticle[]> {
    const query = new URLSearchParams();
    if (category) query.set("category", category);
    if (search) query.set("search", search);
    const res = await fetch(`${API_BASE}/articles?${query.toString()}`);
    return handleResponse<KnowledgeArticle[]>(res);
  },

  async getArticleBySlug(slug: string): Promise<KnowledgeArticle> {
    const res = await fetch(`${API_BASE}/articles/${slug}`);
    return handleResponse<KnowledgeArticle>(res);
  },

  // AI Assistant (RAG)
  async queryChat(
    query: string,
    sessionId?: string,
    coords?: { lat: number; lon: number },
    responseMode: "auto" | "short" | "normal" | "detailed" = "auto"
  ): Promise<ChatQueryResponse> {
    const res = await fetch(`${API_BASE}/chat/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({
        query,
        session_id: sessionId,
        latitude: coords?.lat,
        longitude: coords?.lon,
        response_mode: responseMode,
      }),
    });
    return handleResponse<ChatQueryResponse>(res);
  },

  async getChatSessions(): Promise<ChatSession[]> {
    const res = await fetch(`${API_BASE}/chat/sessions`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ChatSession[]>(res);
  },

  async getChatSession(sessionId: string): Promise<ChatSession> {
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ChatSession>(res);
  },

  // Admin Dashboard
  async getAdminMetrics(): Promise<AdminMetrics> {
    const res = await fetch(`${API_BASE}/admin/metrics`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<AdminMetrics>(res);
  },

  async getAdminUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<User[]>(res);
  },

  async updateAdminUserRole(userId: string, roleName: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/role?role_name=${roleName}`, {
      method: "PATCH",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },

  async toggleAdminUserStatus(userId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/toggle-active`, {
      method: "PATCH",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },

  // User Profile & Enterprise Security
  async updateProfile(data: { full_name?: string; phone?: string; avatar_url?: string; municipality_id?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },

  async changePassword(data: { current_password: string; new_password: string }): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(res);
  },

  async getSessions(): Promise<UserSession[]> {
    const res = await fetch(`${API_BASE}/auth/sessions`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<UserSession[]>(res);
  },

  async revokeSession(sessionId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/sessions/${sessionId}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },

  async logoutAll(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/logout-all`, {
      method: "POST",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },

  // Bulk Locations Import
  async bulkImportLocations(formData: FormData): Promise<{ imported_count: number; skipped_count: number; errors: string[] }> {
    const res = await fetch(`${API_BASE}/locations/bulk-import`, {
      method: "POST",
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse<{ imported_count: number; skipped_count: number; errors: string[] }>(res);
  },

  // Knowledge Documents Studio
  async uploadKnowledgeDocument(formData: FormData): Promise<KnowledgeDocument> {
    const res = await fetch(`${API_BASE}/knowledge/upload`, {
      method: "POST",
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse<KnowledgeDocument>(res);
  },

  async getKnowledgeDocuments(category?: string): Promise<KnowledgeDocument[]> {
    const query = category ? `?category=${category}` : "";
    const res = await fetch(`${API_BASE}/knowledge/documents${query}`, {
      headers: { ...getAuthHeader() },
    });
    const data = await handleResponse<any>(res);
    return Array.isArray(data) ? data : (data.items || []);
  },

  async deleteKnowledgeDocument(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/knowledge/documents/${id}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },

  // RBAC Roles & Permissions Matrix
  async getRolesMatrix(): Promise<RoleMatrixItem[]> {
    const res = await fetch(`${API_BASE}/admin/roles`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<RoleMatrixItem[]>(res);
  },

  async updateRolePermissions(roleName: string, permissions: string[]): Promise<RoleMatrixItem> {
    const res = await fetch(`${API_BASE}/admin/roles/${roleName}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ permissions }),
    });
    return handleResponse<RoleMatrixItem>(res);
  },

  // Audit Logs
  async getAuditLogs(params?: { action?: string; target_type?: string; limit?: number }): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params?.action) query.set("action", params.action);
    if (params?.target_type) query.set("target_type", params.target_type);
    if (params?.limit) query.set("limit", params.limit.toString());
    const res = await fetch(`${API_BASE}/admin/audit-logs?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<AuditLog[]>(res);
  },

  // AI Telemetry & Settings
  async getAIAnalytics(): Promise<AIAnalyticsData> {
    const res = await fetch(`${API_BASE}/admin/ai-analytics`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<AIAnalyticsData>(res);
  },

  async getSystemSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<SystemSettings>(res);
  },

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(settings),
    });
    return handleResponse<SystemSettings>(res);
  },

  // Municipalities
  async getMunicipalities(): Promise<Municipality[]> {
    const res = await fetch(`${API_BASE}/admin/municipalities`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<Municipality[]>(res);
  },

  async createMunicipality(data: Partial<Municipality>): Promise<Municipality> {
    const res = await fetch(`${API_BASE}/admin/municipalities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<Municipality>(res);
  },

  // Enterprise Multi-Tenant & Smart Ward APIs
  async getTenants(): Promise<TenantItem[]> {
    const res = await fetch(`${API_BASE}/admin/tenants`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<TenantItem[]>(res);
  },

  async getRegions(tenantId?: string): Promise<RegionItem[]> {
    const query = tenantId ? `?tenant_id=${tenantId}` : "";
    const res = await fetch(`${API_BASE}/admin/regions${query}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<RegionItem[]>(res);
  },

  async getWards(regionId?: string): Promise<WardItem[]> {
    const query = regionId ? `?region_id=${regionId}` : "";
    const res = await fetch(`${API_BASE}/admin/wards${query}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<WardItem[]>(res);
  },

  async getSmartBins(wardId?: string, overflowOnly = false): Promise<SmartBinItem[]> {
    const params = new URLSearchParams();
    if (wardId) params.append("ward_id", wardId);
    if (overflowOnly) params.append("overflow_only", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/admin/smart-bins${query}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<SmartBinItem[]>(res);
  },

  async getHeatmaps(category?: string): Promise<HeatmapData> {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const res = await fetch(`${API_BASE}/admin/heatmaps${query}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<HeatmapData>(res);
  },

  async polygonSearch(polygon: number[][], category_code?: string): Promise<{ count: number; locations: LocationItem[] }> {
    const res = await fetch(`${API_BASE}/locations/polygon-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ polygon, category_code }),
    });
    return handleResponse(res);
  },

  async optimizeCollectionRoute(
    depot: { name?: string; lat: number; lon: number },
    stops: Array<{ name?: string; lat: number; lon: number }>
  ): Promise<{ total_distance_km: number; waypoints: any[]; stops_count: number }> {
    const res = await fetch(`${API_BASE}/locations/optimize-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ depot, stops }),
    });
    return handleResponse(res);
  },

  async batchSyncReports(
    updates: any[],
    workerDeviceId = "web-client"
  ): Promise<{ status: string; processed: number; resolved: number; created: number }> {
    const res = await fetch(`${API_BASE}/reports/batch-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({
        sync_timestamp: new Date().toISOString(),
        worker_device_id: workerDeviceId,
        updates,
      }),
    });
    return handleResponse(res);
  },
};

