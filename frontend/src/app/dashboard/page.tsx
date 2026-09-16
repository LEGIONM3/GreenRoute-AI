"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Search,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Bell,
  Award,
  TrendingUp,
  Bookmark,
  Leaf,
  Flame,
  Check
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { IssueReport, KnowledgeArticle, LocationItem } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const [myReports, setMyReports] = useState<IssueReport[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [savedLocations, setSavedLocations] = useState<LocationItem[]>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; desc: string; time: string; read: boolean }>>([
    {
      id: "notif-1",
      title: "Monsoon Waste Collection Advisory",
      desc: "Dry waste collection schedule has been updated for Ward 4 and adjacent sectors.",
      time: "2 hours ago",
      read: false
    },
    {
      id: "notif-2",
      title: "Environmental Milestone Unlocked",
      desc: "You have earned the Silver Civic Steward badge for logging 50+ eco points.",
      time: "1 day ago",
      read: false
    },
    {
      id: "notif-3",
      title: "Field Officer Assigned",
      desc: "Municipal cleanup squad dispatched for your reported overflow incident.",
      time: "2 days ago",
      read: true
    }
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }

    async function loadDashboardData() {
      try {
        setIsLoading(true);
        const [reps, arts, allLocs] = await Promise.all([
          api.getReports({ only_mine: true }),
          api.getArticles(),
          api.getLocations().catch(() => []),
        ]);
        setMyReports(reps);
        setArticles(arts.slice(0, 3));

        try {
          const storedFavs = localStorage.getItem("wastecare_saved_locations");
          if (storedFavs && allLocs.length > 0) {
            const favIds: string[] = JSON.parse(storedFavs);
            setSavedLocations(allLocs.filter((l) => favIds.includes(l.id)));
          }
        } catch {}
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || !user) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Loading Citizen Dashboard...</p>
      </div>
    );
  }

  const openCount = myReports.filter((r) => r.status === "Open").length;
  const inProgressCount = myReports.filter((r) => r.status === "In Progress").length;
  const resolvedCount = myReports.filter((r) => r.status === "Resolved").length;

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Welcome Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Active Citizen Contributor</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {user.full_name}!
          </h1>
          <p className="text-sm text-emerald-100 max-w-xl">
            Track your neighborhood sanitation reports, discover local recyclers, and explore government environmental guidelines.
          </p>
        </div>

        <div className="relative z-10 flex gap-3">
          <Link
            href="/reports/new"
            className="px-5 py-3 rounded-xl bg-white text-emerald-800 font-bold text-sm shadow-md hover:bg-emerald-50 transition-all"
          >
            + Report Issue
          </Link>
          <Link
            href="/map"
            className="px-5 py-3 rounded-xl bg-emerald-700/60 backdrop-blur-md text-white font-semibold text-sm hover:bg-emerald-700 transition-all"
          >
            Find Facilities
          </Link>
        </div>
      </div>

      {/* Quick Access Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/map"
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500 hover:shadow-lg transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Facility Explorer</h3>
          <p className="text-xs text-slate-500 mt-1">Locate smart dustbins and recycling kiosks near you.</p>
        </Link>

        <Link
          href="/search"
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 hover:shadow-lg transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Disposal Directory</h3>
          <p className="text-xs text-slate-500 mt-1">Instant bin designation and dismantling guidance.</p>
        </Link>

        <Link
          href="/chat"
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-500 hover:shadow-lg transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">AI Policy Assistant</h3>
          <p className="text-xs text-slate-500 mt-1">Ask any waste regulation question with statutory citations.</p>
        </Link>

        <Link
          href="/reports/new"
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-500 hover:shadow-lg transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Report Civic Issue</h3>
          <p className="text-xs text-slate-500 mt-1">Notify authorities about overflowing or damaged bins.</p>
        </Link>
      </div>

      {/* Reports Status Summary & Activity */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Sanitation Reports</h2>
          <Link href="/reports" className="text-xs font-semibold text-emerald-600 hover:underline">
            View all reports ({myReports.length}) →
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="text-2xl font-black text-amber-500">{openCount}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Open Cases</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="text-2xl font-black text-blue-500">{inProgressCount}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">In Dispatch</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="text-2xl font-black text-emerald-500">{resolvedCount}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Resolved</div>
          </div>
        </div>

        {/* Report Cards Preview */}
        {myReports.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500">You haven&apos;t filed any sanitation reports yet.</p>
            <Link
              href="/reports/new"
              className="mt-2 inline-block text-xs font-bold text-emerald-600 hover:underline"
            >
              Report an issue in your area →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myReports.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">{r.category}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    r.status === "Resolved"
                      ? "bg-emerald-100 text-emerald-800"
                      : r.status === "In Progress"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{r.description}</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  {new Date(r.created_at).toLocaleDateString()} • {r.address || "GPS Location"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Environmental Score Analytics Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Environmental Score Analytics</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                  {user.environmental_score >= 300 ? "Platinum" : user.environmental_score >= 150 ? "Gold" : user.environmental_score >= 50 ? "Silver" : "Bronze"} Steward
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Municipal gamification points based on verified recycling and reporting.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-lg font-black text-emerald-600">{user.environmental_score}</div>
              <div className="text-[11px] text-slate-500 font-medium">Eco Points</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-lg font-black text-teal-600">{(user.environmental_score * 1.8).toFixed(1)} kg</div>
              <div className="text-[11px] text-slate-500 font-medium">CO2 Offset</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-lg font-black text-amber-500">14 Days</div>
              <div className="text-[11px] text-slate-500 font-medium">Segregation Streak</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="text-lg font-black text-purple-600">Top 5%</div>
              <div className="text-[11px] text-slate-500 font-medium">Ward Rank</div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Center & Civic Alerts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Municipal Notification Center</h2>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                {notifications.filter((n) => !n.read).length} new
              </span>
            )}
          </div>
          <button
            onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
            className="text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
          >
            Mark all as read
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border transition-all ${
                notif.read
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75"
                  : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-900 dark:text-white">{notif.title}</span>
                <span className="text-[10px] text-slate-400">{notif.time}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{notif.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Facilities & Offline Bookmarks */}
      {savedLocations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved Facilities & Offline Bookmarks</h2>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                Offline Ready
              </span>
            </div>
            <Link href="/map" className="text-xs font-semibold text-emerald-600 hover:underline">
              Manage on Map →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedLocations.map((loc) => (
              <div
                key={loc.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-emerald-500 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{loc.name}</span>
                  <span className="text-xs font-medium text-slate-400">{loc.city}</span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-1">{loc.address}</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-emerald-600 font-medium">Available Offline</span>
                  {loc.directions_url && (
                    <a
                      href={loc.directions_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Directions ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Guides */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recommended Recycling Guides</h2>
          <Link href="/awareness" className="text-xs font-semibold text-emerald-600 hover:underline">
            Browse all guides →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((art) => (
            <Link
              key={art.id}
              href={`/awareness/${art.slug}`}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 shadow-sm transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 mb-1 block">
                  {art.category}
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                  {art.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{art.summary}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>{art.read_time}</span>
                <span className="font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  Read →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
