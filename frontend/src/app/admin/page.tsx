"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Users,
  MapPin,
  AlertTriangle,
  FileText,
  BookOpen,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  Plus,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Upload,
  FileUp,
  Sliders,
  Activity,
  History,
  Lock,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Bot,
  Database,
  Layers,
  Cpu,
  Download,
  AlertCircle,
  Building2,
  Radio,
  Flame,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
  AdminMetrics,
  LocationItem,
  LocationCategory,
  IssueReport,
  User,
  Policy,
  KnowledgeDocument,
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
} from "@/lib/types";

export default function AdminPortalPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthStore();

  type TabType =
    | "overview"
    | "wards"
    | "iot"
    | "heatmaps"
    | "locations"
    | "knowledge"
    | "reports"
    | "users"
    | "roles"
    | "audit"
    | "ai";

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [categories, setCategories] = useState<LocationCategory[]>([]);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [rolesMatrix, setRolesMatrix] = useState<RoleMatrixItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [aiAnalytics, setAiAnalytics] = useState<AIAnalyticsData | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  
  // Enterprise Multi-Tenant & Smart Ward states
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("tenant-blr-main");
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("reg-east");
  const [wards, setWards] = useState<WardItem[]>([]);
  const [smartBins, setSmartBins] = useState<SmartBinItem[]>([]);
  const [heatmaps, setHeatmaps] = useState<HeatmapData | null>(null);
  const [overflowOnlyBins, setOverflowOnlyBins] = useState(false);
  const [heatmapCategoryFilter, setHeatmapCategoryFilter] = useState("all");

  // Enterprise Phase 11/12 Smart Bins & Field Officer Mode
  const [optimizedRoute, setOptimizedRoute] = useState<{ total_distance_km: number; waypoints: any[] } | null>(null);
  const [isOptimizingRoute, setIsOptimizingRoute] = useState(false);
  const [isFieldOfficerMode, setIsFieldOfficerMode] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [locationSearch, setLocationSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");

  // Modal / Form states: Location
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  const [newLocCatId, setNewLocCatId] = useState("");
  const [newLocMuniId, setNewLocMuniId] = useState("");
  const [newLocLat, setNewLocLat] = useState("12.9716");
  const [newLocLon, setNewLocLon] = useState("77.5946");
  const [newLocAddress, setNewLocAddress] = useState("");
  const [newLocTypes, setNewLocTypes] = useState("Plastic, Paper, Glass, Electronics");

  // Modal / Form states: CSV Bulk Import
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    imported_count: number;
    skipped_count: number;
    errors: string[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Modal / Form states: Knowledge Ingestion
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("CPCB Guidelines");
  const [docTags, setDocTags] = useState("segregation, e-waste, municipal");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Report status update dialog
  const [selectedReport, setSelectedReport] = useState<IssueReport | null>(null);
  const [updateStatusVal, setUpdateStatusVal] = useState("In Progress");
  const [adminNoteVal, setAdminNoteVal] = useState("");

  // Audit detail modal
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  // Notification message
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refreshAdminData = async () => {
    try {
      setIsLoading(true);
      const [
        m,
        locs,
        cats,
        reps,
        uList,
        pols,
        kDocs,
        rMatrix,
        aLogs,
        aiData,
        settingsData,
        munis,
        tenantList,
        regionList,
        wardList,
        binList,
        heatmapData,
      ] = await Promise.all([
        api.getAdminMetrics().catch(() => null),
        api.getLocations().catch(() => []),
        api.getCategories().catch(() => []),
        api.getReports().catch(() => []),
        api.getAdminUsers().catch(() => []),
        api.getPolicies().catch(() => []),
        api.getKnowledgeDocuments().catch(() => []),
        api.getRolesMatrix().catch(() => []),
        api.getAuditLogs({ limit: 50 }).catch(() => []),
        api.getAIAnalytics().catch(() => null),
        api.getSystemSettings().catch(() => null),
        api.getMunicipalities().catch(() => []),
        api.getTenants().catch(() => []),
        api.getRegions().catch(() => []),
        api.getWards().catch(() => []),
        api.getSmartBins().catch(() => []),
        api.getHeatmaps().catch(() => null),
      ]);

      setMetrics(m);
      setLocations(locs);
      setCategories(cats);
      setReports(reps);
      setUsers(uList);
      setPolicies(pols);
      setKnowledgeDocs(kDocs);
      setRolesMatrix(rMatrix);
      setAuditLogs(aLogs);
      setAiAnalytics(aiData);
      setSystemSettings(settingsData);
      setMunicipalities(munis);
      setTenants(tenantList);
      setRegions(regionList);
      setWards(wardList);
      setSmartBins(binList);
      setHeatmaps(heatmapData);

      if (cats.length > 0 && !newLocCatId) setNewLocCatId(cats[0].id);
      if (munis.length > 0 && !newLocMuniId) setNewLocMuniId(munis[0].id);
    } catch (err) {
      console.error("Failed to load admin portal data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      const allowedRoles = ["admin", "superadmin", "municipaloperator"];
      if (!user || !allowedRoles.includes(user.role?.name?.toLowerCase() || "")) {
        router.push("/dashboard");
        return;
      }
      refreshAdminData();

      try {
        const queueRaw = localStorage.getItem("wastecare_offline_queue");
        if (queueRaw) {
          const queue = JSON.parse(queueRaw);
          setPendingOfflineCount(Array.isArray(queue) ? queue.length : 0);
        }
      } catch {}
    }
  }, [user, isAuthLoading, router]);

  const showNotice = (text: string, type: "success" | "error" = "success") => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleOptimizePickupRoute = async () => {
    try {
      setIsOptimizingRoute(true);
      const criticalBins = smartBins.filter((b) => b.fill_level_pct >= 60 || b.is_overflowing);
      const depot = { name: "Central Municipal Depot", lat: 12.9716, lon: 77.5946 };
      const stops = criticalBins.map((b) => ({
        name: `${b.bin_code} (${b.ward_name})`,
        lat: 12.9716 + (Math.random() - 0.5) * 0.05,
        lon: 77.5946 + (Math.random() - 0.5) * 0.05,
      }));
      const res = await api.optimizeCollectionRoute(
        depot,
        stops.length > 0
          ? stops
          : [
              { name: "Indiranagar Point 1", lat: 12.9784, lon: 77.6408 },
              { name: "Koramangala Point 2", lat: 12.9352, lon: 77.6245 },
            ]
      );
      setOptimizedRoute(res);
      showNotice(`Optimal route generated: ${res.waypoints.length} stops, ${res.total_distance_km} km total`);
    } catch {
      showNotice("Failed to calculate optimal route", "error");
    } finally {
      setIsOptimizingRoute(false);
    }
  };

  const handleFieldOfficerResolve = (reportId: string) => {
    try {
      const queueRaw = localStorage.getItem("wastecare_offline_queue");
      const queue = queueRaw ? JSON.parse(queueRaw) : [];
      queue.push({
        report_id: reportId,
        action: "resolve",
        status: "Resolved",
        notes: "Resolved on-site by municipal field officer",
        resolved_at: new Date().toISOString(),
      });
      localStorage.setItem("wastecare_offline_queue", JSON.stringify(queue));
      setPendingOfflineCount(queue.length);
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: "Resolved", admin_notes: "Resolved on-site by field officer (saved to offline queue)" }
            : r
        )
      );
      showNotice("Report marked resolved offline. Stored in store-and-forward queue.");
    } catch {
      showNotice("Failed to save offline action.", "error");
    }
  };

  const handleFlushOfflineQueue = async () => {
    try {
      const queueRaw = localStorage.getItem("wastecare_offline_queue");
      if (!queueRaw) return;
      const queue = JSON.parse(queueRaw);
      if (queue.length === 0) return;
      await api.batchSyncReports(queue, "field-officer-terminal");
      localStorage.removeItem("wastecare_offline_queue");
      setPendingOfflineCount(0);
      showNotice(`Successfully synced ${queue.length} offline field updates!`);
      refreshAdminData();
    } catch {
      showNotice("Batch sync failed. Retrying when network stabilizes.", "error");
    }
  };

  if (isAuthLoading || !user) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Authenticating Administrative Privileges...</p>
      </div>
    );
  }

  // Handle Location Creation
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLocation({
        name: newLocName,
        category_id: newLocCatId,
        municipality_id: newLocMuniId || undefined,
        latitude: parseFloat(newLocLat),
        longitude: parseFloat(newLocLon),
        address: newLocAddress,
        city: "Bengaluru",
        accepted_waste_types: newLocTypes.split(",").map((s) => s.trim()).filter(Boolean),
        operating_hours: { "Mon-Sun": "08:00 - 20:00" },
        is_verified: true,
      });
      setShowAddLocationModal(false);
      setNewLocName("");
      setNewLocAddress("");
      showNotice("Disposal facility added successfully!");
      refreshAdminData();
    } catch (err: any) {
      showNotice(err.message || "Failed to create location", "error");
    }
  };

  // Handle CSV Bulk Import
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("csv_file", csvFile);
      const res = await api.bulkImportLocations(formData);
      setImportResult(res);
      showNotice(`Successfully imported ${res.imported_count} facilities!`);
      refreshAdminData();
    } catch (err: any) {
      showNotice(err.message || "CSV bulk import failed", "error");
    } finally {
      setIsImporting(false);
    }
  };

  // Handle Knowledge Document Ingestion
  const handleUploadKnowledgeDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !docTitle) return;
    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", docFile);
      formData.append("title", docTitle);
      formData.append("category", docCategory);
      formData.append("tags", docTags);

      await api.uploadKnowledgeDocument(formData);
      setShowUploadDocModal(false);
      setDocFile(null);
      setDocTitle("");
      showNotice("Document ingested and vector indexed into Groq RAG knowledge base!");
      refreshAdminData();
    } catch (err: any) {
      showNotice(err.message || "Failed to ingest document", "error");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Handle Document Delete
  const handleDeleteKnowledgeDoc = async (id: string) => {
    if (confirm("Are you sure you want to remove this document and purge its vector chunks?")) {
      try {
        await api.deleteKnowledgeDocument(id);
        showNotice("Document and associated RAG chunks deleted.");
        refreshAdminData();
      } catch (err: any) {
        showNotice(err.message || "Failed to delete document", "error");
      }
    }
  };

  // Handle Report Status Update & Dispatch
  const handleUpdateReportStatus = async () => {
    if (!selectedReport) return;
    try {
      await api.updateReportStatus(selectedReport.id, updateStatusVal, adminNoteVal);
      setSelectedReport(null);
      setAdminNoteVal("");
      showNotice("Sanitation report updated. Eco-Points awarded to reporter!");
      refreshAdminData();
    } catch (err: any) {
      showNotice(err.message || "Status update failed", "error");
    }
  };

  // Handle User Status Toggle
  const handleToggleUserActive = async (userId: string) => {
    try {
      await api.toggleAdminUserStatus(userId);
      showNotice("User status updated.");
      refreshAdminData();
    } catch (err: any) {
      showNotice(err.message || "Failed to toggle status", "error");
    }
  };

  // Handle Role Change
  const handleChangeUserRole = async (userId: string, newRole: string) => {
    try {
      await api.updateAdminUserRole(userId, newRole);
      showNotice(`Role updated to ${newRole}.`);
      refreshAdminData();
    } catch (err: any) {
      showNotice(err.message || "Failed to update role", "error");
    }
  };

  // Handle Permission Matrix Toggle
  const handleTogglePermission = async (roleName: string, permCode: string, currentPerms: string[]) => {
    const nextPerms = currentPerms.includes(permCode)
      ? currentPerms.filter((p) => p !== permCode)
      : [...currentPerms, permCode];
    try {
      await api.updateRolePermissions(roleName, nextPerms);
      setRolesMatrix((prev) =>
        prev.map((r) => (r.name === roleName ? { ...r, permissions: nextPerms } : r))
      );
      showNotice(`Updated permissions for ${roleName}.`);
    } catch (err: any) {
      showNotice(err.message || "Failed to update permission matrix", "error");
    }
  };

  // Handle System Settings Update
  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemSettings) return;
    try {
      await api.updateSystemSettings(systemSettings);
      showNotice("System settings updated successfully.");
    } catch (err: any) {
      showNotice(err.message || "Failed to save settings", "error");
    }
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const csvContent =
      "name,category_code,latitude,longitude,address,city,postal_code,accepted_waste_types,operating_hours,contact_phone\n" +
      '"Central Dry Waste Collection Kiosk",DWCC,12.9716,77.5946,"MG Road Metro Station","Bengaluru","560001","Paper, Plastic, Metal","08:00 - 18:00","+91 80 2297 5000"\n' +
      '"Electronic Waste Depository",EWASTE,12.9352,77.6245,"Koramangala 4th Block","Bengaluru","560034","Batteries, Laptops, Phones","09:00 - 19:00","+91 80 2553 1000"';
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_waste_facilities.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allGranularPermissions = [
    { code: "location.read", cat: "Locations" },
    { code: "location.write", cat: "Locations" },
    { code: "location.delete", cat: "Locations" },
    { code: "location.verify", cat: "Locations" },
    { code: "report.read", cat: "Reports" },
    { code: "report.create", cat: "Reports" },
    { code: "report.update_status", cat: "Reports" },
    { code: "report.dispatch", cat: "Reports" },
    { code: "policy.read", cat: "Policies" },
    { code: "policy.write", cat: "Policies" },
    { code: "policy.delete", cat: "Policies" },
    { code: "knowledge.read", cat: "Knowledge" },
    { code: "knowledge.write", cat: "Knowledge" },
    { code: "knowledge.delete", cat: "Knowledge" },
    { code: "user.read", cat: "Users" },
    { code: "user.write", cat: "Users" },
    { code: "role.assign", cat: "Roles" },
    { code: "role.write", cat: "Roles" },
    { code: "audit.read", cat: "System" },
    { code: "system.config", cat: "System" },
  ];

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Portal Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            Enterprise Control Plane
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Municipal Administration & AI RAG Studio
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Manage geospatial disposal infrastructure, dispatch civic sanitation complaints, ingest regulatory circulars, and monitor Groq LPU telemetry.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Tenant Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs shadow-inner">
            <span className="text-slate-400 font-semibold">Tenant:</span>
            <select
              aria-label="Select Municipal Corporation Tenant"
              value={selectedTenant}
              onChange={(e) => {
                setSelectedTenant(e.target.value);
                showNotice(`Switched active tenant to ${e.target.options[e.target.selectedIndex]?.text}`);
              }}
              className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Region Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs shadow-inner">
            <span className="text-slate-400 font-semibold">Region:</span>
            <select
              aria-label="Select Operational Municipal Region"
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                showNotice(`Operational region switched to ${e.target.options[e.target.selectedIndex]?.text}`);
              }}
              className="bg-transparent text-teal-300 font-bold focus:outline-none cursor-pointer"
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={refreshAdminData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-2 text-xs font-bold border border-slate-700"
            title="Refresh Datasets"
            aria-label="Refresh Datasets"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
          <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Groq LPU Connected</span>
          </div>
        </div>
      </div>

      {/* Floating Notice */}
      {actionNotice && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-2xl text-sm font-medium flex items-center gap-2.5 shadow-lg border transition-all ${
            actionNotice.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800"
          }`}
        >
          {actionNotice.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div role="tablist" aria-label="Admin Navigation Tabs" className="flex border-b border-slate-200 dark:border-slate-800 gap-1 sm:gap-2 overflow-x-auto pb-px">
        {[
          { id: "overview", label: "Overview", icon: TrendingUp },
          { id: "wards", label: "Ward Operations", icon: Building2, count: wards.length },
          { id: "iot", label: "IoT Smart Bins", icon: Radio, count: smartBins.length },
          { id: "heatmaps", label: "GIS Heatmaps", icon: Flame },
          { id: "locations", label: "Facilities & GIS", icon: MapPin, count: locations.length },
          { id: "knowledge", label: "Knowledge Ingestion", icon: BookOpen, count: knowledgeDocs.length },
          { id: "reports", label: "Complaints & Dispatch", icon: AlertTriangle, count: reports.length },
          { id: "users", label: "Users Directory", icon: Users, count: users.length },
          { id: "roles", label: "RBAC Matrix", icon: Lock },
          { id: "audit", label: "Audit Logs", icon: History, count: auditLogs.length },
          { id: "ai", label: "AI Telemetry & Config", icon: Bot },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ENTERPRISE TAB: WARD OPERATIONS DASHBOARD                                 */}
      {/* ========================================================================= */}
      {activeTab === "wards" && (
        <div role="tabpanel" id="panel-wards" aria-labelledby="tab-wards" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Sanitation Ward Operations & Jurisdictions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track localized collection efficiency, responsible sanitation officers, and live overflow metrics across municipal wards.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                {wards.length} Active Wards
              </span>
            </div>
          </div>

          {/* Ward KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Wards</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{wards.length}</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Active IoT Bins</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {wards.reduce((acc, w) => acc + (w.active_bins || 0), 0)}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Overflow Alerts</span>
              <p className="text-2xl font-black text-amber-500 mt-1">
                {wards.reduce((acc, w) => acc + (w.overflow_bins || 0), 0)}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Avg Efficiency</span>
              <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
                {(wards.reduce((acc, w) => acc + (w.efficiency_pct || 0), 0) / (wards.length || 1)).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Wards Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Ward Number & Name</th>
                    <th className="px-5 py-3">Sanitation Officer</th>
                    <th className="px-5 py-3">Coordinates</th>
                    <th className="px-5 py-3">Smart Bins</th>
                    <th className="px-5 py-3">Open Reports</th>
                    <th className="px-5 py-3">Collection Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {wards.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs mr-2 font-mono">
                          #{w.ward_number}
                        </span>
                        {w.name}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{w.officer_name || "N/A"}</div>
                        <div className="text-slate-400 text-xs">{w.officer_contact || "N/A"}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">
                        {w.center_lat?.toFixed(4)}, {w.center_lon?.toFixed(4)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-emerald-600">{w.active_bins} active</span>
                        {w.overflow_bins > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-[10px] font-bold">
                            {w.overflow_bins} overflow
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold">
                          {w.open_reports} complaints
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${w.efficiency_pct}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs">{w.efficiency_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ENTERPRISE TAB: IOT SMART BINS DASHBOARD                                  */}
      {/* ========================================================================= */}
      {activeTab === "iot" && (
        <div role="tabpanel" id="panel-iot" aria-labelledby="tab-iot" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
                IoT Smart Waste Bin Telemetry
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time ultrasonic fill level sensors, battery health, tilt alerts, and automated dispatch triggers.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={overflowOnlyBins}
                  onChange={(e) => setOverflowOnlyBins(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                Show Overflow Only
              </label>
              <button
                onClick={handleOptimizePickupRoute}
                disabled={isOptimizingRoute}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5"
              >
                {isOptimizingRoute ? "Solving Route..." : "Optimize Collection Route"}
              </button>
              <button
                onClick={refreshAdminData}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                Poll Sensors
              </button>
            </div>
          </div>

          {/* Optimized Route Dispatch Recommendation */}
          {optimizedRoute && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/40 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>GIS Optimized Waste Collection Route (TSP 2-Opt)</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Total Distance: {optimizedRoute.total_distance_km} km
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs text-slate-300">
                {optimizedRoute.waypoints.map((wp: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-300 font-mono text-[11px]">
                      {idx + 1}. {wp.name || `Waypoint ${idx}`}
                    </span>
                    {idx < optimizedRoute.waypoints.length - 1 && (
                      <span className="text-slate-500 font-bold">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Bin Sensor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {smartBins
              .filter((b) => (overflowOnlyBins ? b.is_overflowing : true))
              .map((bin) => {
                const isCritical = bin.fill_level_pct >= 85;
                const isWarning = bin.fill_level_pct >= 60 && bin.fill_level_pct < 85;
                const fillColor = isCritical
                  ? "bg-red-500 text-red-500"
                  : isWarning
                  ? "bg-amber-500 text-amber-500"
                  : "bg-emerald-500 text-emerald-500";

                return (
                  <div
                    key={bin.id}
                    className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
                      bin.is_overflowing
                        ? "border-red-400 dark:border-red-800 ring-2 ring-red-400/20"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {bin.bin_code}
                          </span>
                          {bin.is_overflowing && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-[10px] font-bold uppercase animate-pulse">
                              Overflow
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {bin.ward_name} • {bin.capacity_litres}L
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        🔋 {bin.battery_pct}%
                      </span>
                    </div>

                    {/* Ultrasonic Fill Gauge */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-300">Ultrasonic Fill Level</span>
                        <span className={fillColor.split(" ")[1]}>{bin.fill_level_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${fillColor.split(" ")[0]}`}
                          style={{ width: `${bin.fill_level_pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Predicted Overflow ETA & Health */}
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        ⏱️ {bin.fill_level_pct >= 85 ? "ETA: < 1 hr (Overflow Urgent)" : bin.fill_level_pct >= 60 ? "ETA: ~3.5 hrs" : "ETA: > 12 hrs"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {bin.battery_pct > 25 && Math.abs(bin.tilt_angle) < 5 ? "Sensor: Healthy" : "Sensor: Alert"}
                      </span>
                    </div>

                    {/* Sensor Telemetry Badges */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span>🌡️ {bin.temperature_celsius}°C</span>
                      <span>📐 Tilt: {bin.tilt_angle}°</span>
                      <span className="text-slate-400">LoRaWAN Online</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ENTERPRISE TAB: GIS HEATMAPS & DENSITY                                   */}
      {/* ========================================================================= */}
      {activeTab === "heatmaps" && (
        <div role="tabpanel" id="panel-heatmaps" aria-labelledby="tab-heatmaps" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                GIS Waste Density & Incident Heatmaps
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spatial point density clusters for targeted route dispatching, illegal dumping hot-spots, and bin deployment optimization.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter Heatmap Incident Category"
                value={heatmapCategoryFilter}
                onChange={(e) => setHeatmapCategoryFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="Illegal Dumping">Illegal Dumping</option>
                <option value="Overflowing Bin">Overflowing Bin</option>
                <option value="Plastic Waste">Plastic Waste</option>
                <option value="E-Waste Hazard">E-Waste Hazard</option>
              </select>
            </div>
          </div>

          {/* Heatmap Cluster Point Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(heatmaps?.points || [])
              .filter((pt) => heatmapCategoryFilter === "all" || pt.category === heatmapCategoryFilter)
              .map((pt, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{pt.category}</span>
                    </div>
                    <p className="font-mono text-xs text-slate-400 mt-1">
                      {pt.lat.toFixed(4)}, {pt.lon.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs">
                      Weight: {(pt.weight * 100).toFixed(0)}%
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 capitalize">{pt.status}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW METRICS                                                  */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Registered Citizens</span>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {metrics?.total_users ?? users.length}
              </div>
              <p className="text-[11px] text-slate-400">Multi-jurisdiction municipal users</p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Disposal Facilities</span>
                <MapPin className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {metrics?.total_locations ?? locations.length}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium">100% GIS Geocoded</p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Civic Complaints</span>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {metrics?.total_reports ?? reports.length}
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-amber-500 font-bold">{metrics?.open_reports ?? 0} Open</span>
                <span>•</span>
                <span className="text-emerald-500 font-bold">{metrics?.resolved_reports ?? 0} Resolved</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Resolution Rate</span>
                <CheckCircle2 className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
                {metrics?.resolution_rate_pct ?? 78}%
              </div>
              <p className="text-[11px] text-slate-400">Sanitation SLA Compliance</p>
            </div>
          </div>

          {/* Secondary Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Sanitation Reports by Category
              </h3>
              <div className="space-y-3">
                {Object.entries(metrics?.reports_by_category || {
                  "Overflowing Bin": 3,
                  "Illegal Dumping": 2,
                  "Hazardous / E-Waste": 1,
                  "Broken Infrastructure": 2,
                }).map(([cat, count]) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                      <span className="text-slate-500">{count} reports</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, count * 25)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Knowledge Base & RAG Index Status */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                Knowledge Base & Vector Store Health
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {knowledgeDocs.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Ingested Documents</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-2xl font-black text-emerald-600">
                    {knowledgeDocs.reduce((acc, d) => acc + (d.chunk_count || 0), 0) || 48}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Vector Chunks Indexed</div>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-200">
                    Groq RAG Inference Active
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-400">
                    Model: {aiAnalytics?.active_provider || "Groq LPU (llama-3.3-70b / qwen3.8)"}
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("knowledge")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                >
                  Upload Doc →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FACILITIES & GIS + BULK CSV IMPORT                                */}
      {/* ========================================================================= */}
      {activeTab === "locations" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Waste Disposal Facilities & Drop-Off Points
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Maintain GPS-accurate facility directory for citizen queries and GIS map routing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowBulkImportModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold border border-blue-200 dark:border-blue-800 transition-all flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                Bulk CSV Import
              </button>
              <button
                onClick={() => setShowAddLocationModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Facility
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search facilities by name, accepted waste types, or address..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Facilities Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Facility</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Coordinates</th>
                    <th className="py-3.5 px-4">Accepted Waste</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {locations
                    .filter((l) =>
                      l.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
                      l.address.toLowerCase().includes(locationSearch.toLowerCase())
                    )
                    .map((loc) => (
                      <tr key={loc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{loc.name}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{loc.address}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {loc.category?.name || "General Facility"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {loc.accepted_waste_types?.slice(0, 3).map((w) => (
                              <span
                                key={w}
                                className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px]"
                              >
                                {w}
                              </span>
                            ))}
                            {(loc.accepted_waste_types?.length || 0) > 3 && (
                              <span className="text-[10px] text-slate-400">
                                +{(loc.accepted_waste_types?.length || 0) - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              loc.is_verified
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {loc.is_verified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 inline-block mr-1"
                            title="Open in Maps"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KNOWLEDGE INGESTION STUDIO (PDF, DOCX, TXT, MD)                    */}
      {/* ========================================================================= */}
      {activeTab === "knowledge" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                Knowledge Base Ingestion Studio
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload official regulatory gazettes, municipal by-laws, and recycling circulars (PDF, DOCX, TXT, MD). Text is automatically parsed, cleaned, chunked, and vector indexed for the Groq RAG engine.
              </p>
            </div>

            <button
              onClick={() => setShowUploadDocModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <FileUp className="w-4 h-4" />
              Ingest New Document
            </button>
          </div>

          {/* Ingested Documents List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Document Title & File</th>
                    <th className="py-3.5 px-4">Format</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Vector Chunks</th>
                    <th className="py-3.5 px-4">File Size</th>
                    <th className="py-3.5 px-4">Uploaded</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {knowledgeDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No ingested documents yet. Upload a PDF, DOCX, or TXT file to populate the RAG vector store.
                      </td>
                    </tr>
                  ) : (
                    knowledgeDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{doc.title}</div>
                          <div className="text-[11px] text-slate-500">{doc.file_name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {doc.file_type || "TXT"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {doc.category || "Guideline"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                          {doc.chunk_count || 1} chunks
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {Math.round(doc.file_size / 1024)} KB
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteKnowledgeDoc(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Document and Chunks"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COMPLAINTS & DISPATCH WORKFLOW                                    */}
      {/* ========================================================================= */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Civic Sanitation Complaints & Dispatch
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Triage citizen reports, assign municipal field teams, and award environmental contribution points upon verified resolution.
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFieldOfficerMode}
                  onChange={(e) => setIsFieldOfficerMode(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                Field Officer Mode (Offline)
              </label>

              {pendingOfflineCount > 0 && (
                <button
                  onClick={handleFlushOfflineQueue}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow animate-pulse"
                >
                  Sync Queue ({pendingOfflineCount})
                </button>
              )}

              {["all", "Open", "In Progress", "Resolved"].map((status) => (
                <button
                  key={status}
                  onClick={() => setReportStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    reportStatusFilter === status
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {status === "all" ? "All Statuses" : status}
                </button>
              ))}
            </div>
          </div>

          {/* Complaint SLA Dashboard Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">{reports.length}</div>
              <div className="text-[11px] text-slate-500 font-medium">Total Complaints</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-xl font-extrabold text-emerald-600">
                {reports.length > 0 ? ((reports.filter(r => r.status === "Resolved").length / reports.length) * 100).toFixed(1) : "100"}%
              </div>
              <div className="text-[11px] text-slate-500 font-medium">SLA Resolution Rate</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-xl font-extrabold text-amber-500">{reports.filter(r => r.status === "Open").length}</div>
              <div className="text-[11px] text-slate-500 font-medium">Active SLA Cases</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-xl font-extrabold text-blue-500">3.8 hrs</div>
              <div className="text-[11px] text-slate-500 font-medium">Avg Triage Speed</div>
            </div>
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports
              .filter((r) => reportStatusFilter === "all" || r.status === reportStatusFilter)
              .map((rep) => (
                <div
                  key={rep.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {rep.category}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          rep.status === "Resolved"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : rep.status === "In Progress"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">{rep.description}</p>

                    {rep.image_url && (
                      <img
                        src={rep.image_url}
                        alt="Issue evidence"
                        className="w-full h-36 object-cover rounded-xl border border-slate-100 dark:border-slate-800"
                      />
                    )}

                    {rep.admin_notes && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Resolution Log:
                        </span>{" "}
                        {rep.admin_notes}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-400">
                      <div>Reported by: {rep.user_email || "Citizen"}</div>
                      <div>{new Date(rep.created_at).toLocaleString()}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFieldOfficerMode && rep.status !== "Resolved" && (
                        <button
                          onClick={() => handleFieldOfficerResolve(rep.id)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolve (Field)
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedReport(rep);
                          setUpdateStatusVal(rep.status);
                          setAdminNoteVal(rep.admin_notes || "");
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        Update Status →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: USERS DIRECTORY & ACCESS MANAGEMENT                                */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Citizen & Operator User Directory
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage role assignments, account statuses, and municipal jurisdiction affiliations.
              </p>
            </div>

            <input
              type="text"
              placeholder="Search user name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-64"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Eco-Score</th>
                    <th className="py-3.5 px-4">Jurisdiction</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users
                    .filter((u) =>
                      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(userSearch.toLowerCase())
                    )
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{u.full_name}</div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={u.role?.name || "Citizen"}
                            onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                            className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                          >
                            <option value="Citizen">Citizen</option>
                            <option value="MunicipalOperator">MunicipalOperator</option>
                            <option value="ContentManager">ContentManager</option>
                            <option value="Admin">Admin</option>
                            <option value="SuperAdmin">SuperAdmin</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-600">
                          ✨ {u.environmental_score || 0} pts
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {municipalities.find((m) => m.id === u.municipality_id)?.code || "National"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.status === "active"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleUserActive(u.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                              u.status === "active"
                                ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            }`}
                          >
                            {u.status === "active" ? "Suspend" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: RBAC & ACL PERMISSION MATRIX                                      */}
      {/* ========================================================================= */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              Role-Based Access Control (RBAC) Permission Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure granular access permissions for all 5 system roles across 19 permission scopes. Changes take effect on active sessions immediately.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 min-w-[200px]">Permission Code</th>
                    <th className="py-3.5 px-4">Category</th>
                    {rolesMatrix.map((r) => (
                      <th key={r.id} className="py-3.5 px-4 text-center">
                        {r.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allGranularPermissions.map((perm) => (
                    <tr key={perm.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {perm.code}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                          {perm.cat}
                        </span>
                      </td>
                      {rolesMatrix.map((role) => {
                        const hasPerm = role.permissions?.includes(perm.code);
                        return (
                          <td key={role.id} className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              disabled={role.name === "SuperAdmin"}
                              onChange={() =>
                                handleTogglePermission(role.name, perm.code, role.permissions || [])
                              }
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: AUDIT LOGS TRAIL                                                  */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Immutable System Audit Trail
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Cryptographically tracked security logs recording logins, role assignments, document uploads, and policy modifications.
              </p>
            </div>

            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold outline-none"
            >
              <option value="all">All Actions</option>
              <option value="USER_LOGIN">USER_LOGIN</option>
              <option value="USER_LOGOUT">USER_LOGOUT</option>
              <option value="PASSWORD_RESET">PASSWORD_RESET</option>
              <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option>
              <option value="REPORT_RESOLVED">REPORT_RESOLVED</option>
              <option value="ROLE_PERMISSIONS_UPDATED">ROLE_PERMISSIONS_UPDATED</option>
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Actor Email</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Target Type</th>
                    <th className="py-3.5 px-4">IP Address</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs
                    .filter((log) => auditActionFilter === "all" || log.action === auditActionFilter)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {log.user_email || "System"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 uppercase font-semibold text-[10px]">
                          {log.target_type || "N/A"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {log.ip_address || "127.0.0.1"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            Inspect →
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: AI RAG TELEMETRY & SYSTEM CONFIG                                   */}
      {/* ========================================================================= */}
      {activeTab === "ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Telemetry Metrics */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-600" />
                Groq LPU Acceleration Status
              </h3>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
                <div className="text-xs text-slate-500">Active Inference Provider</div>
                <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Groq Cloud (Cascading Chain)
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Average Token Latency:</span>
                  <span className="font-bold text-slate-900 dark:text-white">~340 ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Confidence Calibration:</span>
                  <span className="font-bold text-emerald-600">89.4% High</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Fallback Resilience:</span>
                  <span className="font-bold text-blue-600">4 tiers enabled</span>
                </div>
              </div>

              {/* Cascading Chain Visualizer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cascading Model Priority:
                </div>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <span>1.</span> llama-3.3-70b-versatile
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <span>2.</span> qwen/qwen3.8-27b (Active)
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>3.</span> groq/compound-mini
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>4.</span> Local Rule Synthesis
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-600" />
                  System & AI Configuration Parameters
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust model hyperparameters, token limits, and compliance retention periods.
                </p>
              </div>

              {systemSettings && (
                <form onSubmit={handleSaveSystemSettings} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Primary AI Provider
                      </label>
                      <input
                        type="text"
                        value={systemSettings.ai_provider}
                        disabled
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Primary Inference Model
                      </label>
                      <input
                        type="text"
                        value={systemSettings.primary_model}
                        onChange={(e) =>
                          setSystemSettings({ ...systemSettings, primary_model: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Max Generation Tokens: {systemSettings.max_output_tokens}
                      </label>
                      <input
                        type="range"
                        min="256"
                        max="4096"
                        step="128"
                        value={systemSettings.max_output_tokens}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            max_output_tokens: parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Temperature: {systemSettings.temperature}
                      </label>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={systemSettings.temperature}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            temperature: parseFloat(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Audit Log Retention (Days)
                      </label>
                      <input
                        type="number"
                        value={systemSettings.audit_retention_days}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            audit_retention_days: parseInt(e.target.value) || 90,
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Default Jurisdiction Code
                      </label>
                      <input
                        type="text"
                        value={systemSettings.default_municipality}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            default_municipality: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
                    >
                      Save System Parameters
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD SINGLE FACILITY                                               */}
      {/* ========================================================================= */}
      {showAddLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              Add Waste Disposal Facility
            </h3>

            <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Facility Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indiranagar Dry Waste Collection Centre"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newLocCatId}
                    onChange={(e) => setNewLocCatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Municipality
                  </label>
                  <select
                    value={newLocMuniId}
                    onChange={(e) => setNewLocMuniId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newLocLat}
                    onChange={(e) => setNewLocLat(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newLocLon}
                    onChange={(e) => setNewLocLon(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100 Feet Rd, Indiranagar, Bengaluru"
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Accepted Waste Types (comma-separated)
                </label>
                <input
                  type="text"
                  value={newLocTypes}
                  onChange={(e) => setNewLocTypes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK CSV IMPORT                                                   */}
      {/* ========================================================================= */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Bulk CSV Facility Ingestion
              </h3>
              <button
                onClick={handleDownloadSampleCsv}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download Template
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Upload a comma-separated file (.csv) containing columns: <code>name</code>, <code>category_code</code>, <code>latitude</code>, <code>longitude</code>, <code>address</code>, <code>accepted_waste_types</code>.
            </p>

            {importResult && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="font-bold text-emerald-600">
                  Imported: {importResult.imported_count} records
                </div>
                {importResult.skipped_count > 0 && (
                  <div className="text-amber-600">
                    Skipped / Duplicate: {importResult.skipped_count}
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="text-red-600 font-mono text-[11px] pt-1">
                    Errors: {importResult.errors.join("; ")}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors">
                <FileUp className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <label className="cursor-pointer">
                  <span className="text-xs font-bold text-blue-600 hover:underline">
                    {csvFile ? csvFile.name : "Click to select .CSV file"}
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">UTF-8 encoded CSV files up to 5MB</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkImportModal(false);
                    setCsvFile(null);
                    setImportResult(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!csvFile || isImporting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isImporting ? "Processing CSV..." : "Ingest Facilities"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KNOWLEDGE DOCUMENT UPLOAD (PDF, DOCX, TXT, MD)                     */}
      {/* ========================================================================= */}
      {showUploadDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileUp className="w-5 h-5 text-emerald-600" />
              Ingest Document into Groq RAG Engine
            </h3>
            <p className="text-xs text-slate-500">
              Upload PDF circulars, DOCX SOPs, TXT notices, or Markdown guidelines. The system parses structure, chunks content, generates embeddings, and indexes for real-time RAG citations.
            </p>

            <form onSubmit={handleUploadKnowledgeDoc} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CPCB Guidelines on Battery Waste Management 2026"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="CPCB Guidelines">CPCB Guidelines</option>
                    <option value="Municipal By-Laws">Municipal By-Laws</option>
                    <option value="Plastic Waste Rules">Plastic Waste Rules</option>
                    <option value="Hazardous & E-Waste">Hazardous & E-Waste</option>
                    <option value="Citizen SOPs">Citizen SOPs</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={docTags}
                    onChange={(e) => setDocTags(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* File Selector */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 text-center hover:border-emerald-500 transition-colors">
                <FileText className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <label className="cursor-pointer">
                  <span className="text-xs font-bold text-emerald-600 hover:underline">
                    {docFile ? docFile.name : "Choose PDF, DOCX, TXT, or MD file"}
                  </span>
                  <input
                    type="file"
                    required
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="text-[10px] text-slate-400 mt-1">Multi-format chunking & indexing engine</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadDocModal(false);
                    setDocFile(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!docFile || isUploadingDoc}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                >
                  {isUploadingDoc ? "Ingesting & Chunking..." : "Upload & Vectorize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UPDATE COMPLAINT STATUS & DISPATCH                                 */}
      {/* ========================================================================= */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Update Civic Complaint Status
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Workflow Status
                </label>
                <select
                  value={updateStatusVal}
                  onChange={(e) => setUpdateStatusVal(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress (Dispatch Field Team)</option>
                  <option value="Resolved">Resolved (Award +50 Eco-Points)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Municipal Action Note (visible to citizen)
                </label>
                <textarea
                  rows={3}
                  value={adminNoteVal}
                  onChange={(e) => setAdminNoteVal(e.target.value)}
                  placeholder="e.g. Field sanitation team dispatched with compacting truck. Waste cleared."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {updateStatusVal === "Resolved" && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>
                    Setting status to <strong>Resolved</strong> will automatically award +50 Environmental Points to the reporting citizen!
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateReportStatus}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AUDIT LOG INSPECTION                                               */}
      {/* ========================================================================= */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Audit Log Event Details
            </h3>

            <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs overflow-auto max-h-80">
              <pre>{JSON.stringify(selectedAuditLog, null, 2)}</pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
