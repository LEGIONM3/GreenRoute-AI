"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User as UserIcon,
  Shield,
  Award,
  Lock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  MapPin,
  Clock,
  Trash2,
  RefreshCw,
  TrendingUp,
  FileCheck2,
  Flame,
  Star,
  Building,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { UserSession, Municipality, IssueReport } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { user, fetchMe, logout, isLoading: isAuthLoading } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"overview" | "security" | "sessions" | "activity">("overview");
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [myReports, setMyReports] = useState<IssueReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [municipalityId, setMunicipalityId] = useState("");
  const [updateMsg, setUpdateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const presetAvatars = [
    { name: "Eco Hero", url: "https://api.dicebear.com/7.x/bottts/svg?seed=EcoHero&backgroundColor=10b981" },
    { name: "Green Scout", url: "https://api.dicebear.com/7.x/bottts/svg?seed=GreenScout&backgroundColor=06b6d4" },
    { name: "Zero Waste", url: "https://api.dicebear.com/7.x/bottts/svg?seed=ZeroWaste&backgroundColor=3b82f6" },
    { name: "Earth Guardian", url: "https://api.dicebear.com/7.x/bottts/svg?seed=EarthGuardian&backgroundColor=8b5cf6" },
    { name: "Civic Sentinel", url: "https://api.dicebear.com/7.x/bottts/svg?seed=CivicSentinel&backgroundColor=f59e0b" },
  ];

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setAvatarUrl(user.avatar_url || "");
      setMunicipalityId(user.municipality_id || "");
      loadUserData();
    }
  }, [user, isAuthLoading, router]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const [sessList, munis, reps] = await Promise.all([
        api.getSessions().catch(() => []),
        api.getMunicipalities().catch(() => []),
        api.getReports({ only_mine: true }).catch(() => []),
      ]);
      setSessions(sessList);
      setMunicipalities(munis);
      setMyReports(reps);
    } catch (err) {
      console.error("Failed to load user profile data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMsg(null);
    try {
      await api.updateProfile({
        full_name: fullName,
        phone: phone || undefined,
        avatar_url: avatarUrl || undefined,
        municipality_id: municipalityId || undefined,
      });
      await fetchMe();
      setUpdateMsg({ type: "success", text: "Profile details updated successfully!" });
    } catch (err: any) {
      setUpdateMsg({ type: "error", text: err.message || "Failed to update profile." });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg({ type: "success", text: "Password changed successfully! Keep your new credentials safe." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message || "Failed to update password." });
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      alert(err.message || "Failed to revoke session.");
    }
  };

  const handleLogoutAll = async () => {
    if (confirm("Are you sure you want to log out from all devices? You will need to sign in again.")) {
      try {
        await api.logoutAll();
        logout();
        router.push("/login");
      } catch (err: any) {
        alert(err.message || "Failed to log out of all sessions.");
      }
    }
  };

  if (isAuthLoading || !user) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Loading Citizen Profile...</p>
      </div>
    );
  }

  // Gamification calculations
  const score = user.environmental_score || 0;
  let tierTitle = "Eco Cadet";
  let tierColor = "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800";
  let nextTierScore = 100;
  let progressPct = Math.min(100, Math.round((score / 100) * 100));

  if (score >= 600) {
    tierTitle = "Sustainability Hero";
    tierColor = "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800";
    nextTierScore = 1000;
    progressPct = 100;
  } else if (score >= 300) {
    tierTitle = "Zero Waste Champion";
    tierColor = "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
    nextTierScore = 600;
    progressPct = Math.min(100, Math.round(((score - 300) / 300) * 100));
  } else if (score >= 100) {
    tierTitle = "Green Guardian";
    tierColor = "text-teal-600 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800";
    nextTierScore = 300;
    progressPct = Math.min(100, Math.round(((score - 100) / 200) * 100));
  }

  const badges = [
    {
      id: "first_report",
      title: "First Responder",
      desc: "Filed 1+ civic sanitation report",
      unlocked: myReports.length > 0,
      icon: AlertCircle,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
    },
    {
      id: "civic_sentinel",
      title: "Civic Sentinel",
      desc: "Filed 3+ civic reports",
      unlocked: myReports.length >= 3,
      icon: Shield,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40",
    },
    {
      id: "spotless_clean",
      title: "Clean Streets Hero",
      desc: "Report successfully resolved",
      unlocked: myReports.some((r) => r.status === "Resolved"),
      icon: FileCheck2,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      id: "verified_citizen",
      title: "Verified Citizen",
      desc: "Email verified & linked municipality",
      unlocked: user.email_verified || !!user.municipality_id,
      icon: CheckCircle2,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40",
    },
    {
      id: "green_champion",
      title: "Pioneer Recycler",
      desc: "Achieved 100+ Environmental Score",
      unlocked: score >= 100,
      icon: Flame,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40",
    },
  ];

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-md p-1 border-2 border-white/20 flex-shrink-0 relative overflow-hidden flex items-center justify-center">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-emerald-500 flex items-center justify-center text-3xl font-black text-white">
                {user.full_name.charAt(0)}
              </div>
            )}
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-emerald-900" title="Active"></div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{user.full_name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md border border-white/30">
                {user.role?.name || "Citizen"}
              </span>
              {user.status === "active" && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Verified Active
                </span>
              )}
            </div>
            <p className="text-sm text-emerald-100 flex items-center gap-2">
              <span>{user.email}</span>
              {user.phone && <span>• {user.phone}</span>}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {municipalities.find((m) => m.id === user.municipality_id)?.name || "National / Unassigned Region"}
              </span>
            </div>
          </div>
        </div>

        {/* Environmental Score Widget in Banner */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 min-w-[240px] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-100">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Environmental Score
            </span>
            <span className="text-amber-300 font-bold">{tierTitle}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">{score}</span>
            <span className="text-xs text-emerald-200">/ {nextTierScore} pts</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-emerald-200">
            {nextTierScore - score > 0
              ? `${nextTierScore - score} pts to reach next tier rank`
              : "Maximum eco-tier reached! You are an inspiration."}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto pb-px">
        {[
          { id: "overview", label: "Profile & Badges", icon: Award },
          { id: "security", label: "Account & Password", icon: Lock },
          { id: "sessions", label: "Active Sessions", icon: Smartphone, count: sessions.length },
          { id: "activity", label: "My Civic History", icon: Clock, count: myReports.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & BADGES */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Personal Info Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-emerald-600" />
                  Personal Information
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Keep your citizen records and municipal jurisdiction up to date.
                </p>
              </div>

              {updateMsg && (
                <div
                  className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
                    updateMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {updateMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{updateMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email Address (Permanent)
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Assigned Municipality
                    </label>
                    <select
                      value={municipalityId}
                      onChange={(e) => setMunicipalityId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">-- Select Municipality / Jurisdiction --</option>
                      {municipalities.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.code} - {m.state})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Avatar Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Choose an Eco-Avatar
                  </label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {presetAvatars.map((av) => (
                      <button
                        type="button"
                        key={av.name}
                        onClick={() => setAvatarUrl(av.url)}
                        className={`w-12 h-12 rounded-xl p-1 border-2 transition-all ${
                          avatarUrl === av.url
                            ? "border-emerald-500 scale-105 shadow-md shadow-emerald-500/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        }`}
                      >
                        <img src={av.url} alt={av.name} className="w-full h-full rounded-lg object-cover" />
                      </button>
                    ))}
                  </div>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Or enter custom image URL"
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Gamification Badges Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Civic Achievements
                </h3>
                <span className="text-xs font-bold text-emerald-600">
                  {badges.filter((b) => b.unlocked).length} / {badges.length}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Badges unlocked through active civic contribution and community sanitation upkeep.
              </p>

              <div className="space-y-3 pt-1">
                {badges.map((b) => {
                  const Icon = b.icon;
                  return (
                    <div
                      key={b.id}
                      className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                        b.unlocked
                          ? "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                          : "opacity-40 border-dashed border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${b.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{b.title}</h4>
                          {b.unlocked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{b.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Point Earning Guide */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">How to Earn Eco-Points:</h4>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Submit Sanitation Report:</span>
                    <span className="font-bold text-emerald-600">+10 pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Report Resolved by Municipality:</span>
                    <span className="font-bold text-emerald-600">+50 pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Policy & Waste Guide Lookups:</span>
                    <span className="font-bold text-emerald-600">+5 pts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === "security" && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              Change Account Password
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Passwords are cryptographically secured using Argon2id with memory-hard hashing.
            </p>
          </div>

          {passwordMsg && (
            <div
              className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
                passwordMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
              }`}
            >
              {passwordMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password (minimum 8 characters)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: SESSIONS & DEVICES */}
      {activeTab === "sessions" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                Active Device Sessions
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You are currently signed into {sessions.length} device(s). Revoke any unrecognized session.
              </p>
            </div>

            <button
              onClick={handleLogoutAll}
              className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-950 dark:text-red-300 text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out All Devices
            </button>
          </div>

          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No other active sessions detected.</p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {s.device_name || "Unknown Browser / Client"}
                        </span>
                        {s.is_current && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Current Session
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        IP: {s.ip_address} • Signed in: {new Date(s.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {!s.is_current && (
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MY CIVIC ACTIVITY */}
      {activeTab === "activity" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Submitted Sanitation Reports
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your civic contributions to municipal cleanliness and environmental health.
              </p>
            </div>
            <Link
              href="/reports/new"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
            >
              + File Report
            </Link>
          </div>

          {myReports.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileCheck2 className="w-12 h-12 mx-auto mb-2 opacity-40 text-emerald-500" />
              <p className="text-sm font-medium">No reports filed yet.</p>
              <p className="text-xs mt-1">Earn +10 Eco-Points by reporting overflowing bins or illegal dumping.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myReports.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">{r.category}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold ${
                        r.status === "Resolved"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : r.status === "In Progress"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{r.description}</p>
                  {r.admin_notes && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                      <span className="font-bold">Municipal Officer Note:</span> {r.admin_notes}
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    <span>{r.address || "GPS Coordinates"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
