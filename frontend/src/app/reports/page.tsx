"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Plus,
  Clock,
  CheckCircle2,
  MapPin,
  Image as ImageIcon,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { IssueReport } from "@/lib/types";
import { useAuthStore } from "@/lib/store";

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setIsLoading(true);
        const data = await api.getReports();
        setReports(data);
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReports();
  }, []);

  const filteredReports = reports.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Resolved</span>
          </span>
        );
      case "In Progress":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Clock className="w-3.5 h-3.5" />
            <span>In Progress</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Open</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <span>Civic Sanitation Issue Reports</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Help municipal teams keep neighborhoods clean by reporting overflowing dustbins and illegal dumping.
          </p>
        </div>

        <Link
          href="/reports/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {["all", "Open", "In Progress", "Resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === s
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            }`}
          >
            {s === "all" ? "All Issues" : s}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 text-sm">No reports found matching your criteria.</p>
            <Link
              href="/reports/new"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
            >
              <span>Submit the first report now</span>
            </Link>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(report.status)}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {report.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    Reported on {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {report.description}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</span>
                </div>

                {report.admin_notes && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1">
                    <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Municipal Resolution Note</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{report.admin_notes}</p>
                  </div>
                )}
              </div>

              {report.image_url && (
                <div className="w-full md:w-36 h-28 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 dark:border-slate-800">
                  <img
                    src={report.image_url}
                    alt="Report attachment"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
