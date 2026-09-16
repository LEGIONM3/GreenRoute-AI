"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapPin,
  Search,
  Bot,
  BookOpen,
  FileText,
  AlertTriangle,
  ShieldAlert,
  LayoutDashboard,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Sparkles,
  Bell,
  ChevronDown,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, fetchMe } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState([
    {
      id: "n1",
      title: "Ward 101 E-Waste Drive",
      message: "Special e-waste dropoff drive this Saturday at Indiranagar Center.",
      unread: true,
      time: "10m ago",
    },
    {
      id: "n2",
      title: "Report Status Update",
      message: "Your illegal dumping report #3912 has been resolved by Municipal Field Team.",
      unread: true,
      time: "1h ago",
    },
    {
      id: "n3",
      title: "Offline Cache Ready",
      message: "42 local recycling facilities cached for offline use.",
      unread: false,
      time: "3h ago",
    },
  ]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Click outside and ESC key listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setMoreMenuOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Primary core navigation items (always visible on desktop)
  const coreLinks = [
    { name: "Map Explorer", href: "/map", icon: MapPin },
    { name: "Disposal Search", href: "/search", icon: Search },
    { name: "AI Assistant", href: "/chat", icon: Bot, badge: "RAG" },
    { name: "Report Issue", href: "/reports", icon: AlertTriangle },
  ];

  // Secondary navigation items (visible on xl, collapsed into 'More' on lg)
  const secondaryLinks = [
    { name: "Awareness", href: "/awareness", icon: BookOpen },
    { name: "Policies", href: "/policies", icon: FileText },
  ];

  const isAdmin = ["admin", "superadmin", "municipaloperator"].includes(
    user?.role?.name?.toLowerCase() || ""
  );

  const isSecondaryActive = secondaryLinks.some((link) =>
    pathname.startsWith(link.href)
  );

  return (
    <nav
      aria-label="Main Navigation"
      className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo */}
          <Link
            href="/"
            aria-label="WasteCare Homepage"
            className="flex items-center gap-2.5 shrink-0 group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-tight text-slate-900 dark:text-white">
                Waste<span className="text-emerald-600 dark:text-emerald-400">Care</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">
                Civic Guidance & GIS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (flex-1 min-w-0 for responsive fluidity) */}
          <div className="hidden lg:flex items-center gap-1 flex-1 min-w-0 px-2 justify-center">
            {/* Core Links */}
            {coreLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Secondary Links: direct on XL */}
            <div className="hidden xl:flex items-center gap-1">
              {secondaryLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Secondary Links: 'More' Dropdown on LG (1024-1279px) */}
            <div className="relative xl:hidden" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                aria-expanded={moreMenuOpen}
                aria-label="More navigation links"
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSecondaryActive
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>More</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {moreMenuOpen && (
                <div className="absolute left-0 mt-2 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                  {secondaryLinks.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMoreMenuOpen(false)}
                        className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="w-4 h-4 text-emerald-600" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dynamic Dashboard Link for Authenticated Citizens */}
            {user && (
              <Link
                href="/dashboard"
                aria-current={pathname.startsWith("/dashboard") ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  pathname.startsWith("/dashboard")
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard</span>
              </Link>
            )}

            {/* Admin Portal for Authorized Roles */}
            {isAdmin && (
              <Link
                href="/admin"
                aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  pathname.startsWith("/admin")
                    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                    : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Admin</span>
              </Link>
            )}
          </div>

          {/* User Auth Section & Notification Center (shrink-0) */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            {/* Notification Center */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Civic and System Notifications"
                aria-expanded={notificationsOpen}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <Bell className="w-5 h-5" />
                {notifications.some((n) => n.unread) && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <div
                  role="region"
                  aria-label="Notifications Panel"
                  className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Civic Notifications
                    </span>
                    <button
                      onClick={() =>
                        setNotifications(
                          notifications.map((n) => ({ ...n, unread: false }))
                        )
                      }
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-64 overflow-y-auto mt-2">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`py-2.5 px-2 rounded-lg text-left transition-colors ${
                          n.unread
                            ? "bg-emerald-50/60 dark:bg-emerald-950/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                {/* Environmental Score Pill */}
                <Link
                  href="/profile"
                  title="Environmental Score & Badges"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-bold hover:scale-105 transition-all shadow-sm shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{user.environmental_score || 0} pts</span>
                </Link>

                <Link
                  href="/profile"
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-medium text-slate-800 dark:text-slate-200 shrink-0"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {user.full_name.charAt(0)}
                    </div>
                  )}
                  <span className="max-w-[100px] truncate">{user.full_name}</span>
                </Link>

                <button
                  onClick={logout}
                  aria-label="Sign Out"
                  title="Sign Out"
                  className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 transition-all hover:shadow"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-6 space-y-1">
          {/* Core Links */}
          {coreLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Secondary Links */}
          {secondaryLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Dashboard Link for Mobile */}
          {user && (
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                pathname.startsWith("/dashboard")
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Dashboard</span>
            </Link>
          )}

          {/* Admin Management Link for Mobile */}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Admin Management</span>
            </Link>
          )}

          {/* User Auth Footer for Mobile */}
          <div className="pt-4 mt-3 border-t border-slate-200 dark:border-slate-800">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                        {user.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-white">
                        {user.full_name}
                      </div>
                      <span className="text-[10px] text-slate-500 capitalize">
                        {user.role?.name || "Citizen"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-3 h-3" />
                    <span>{user.environmental_score || 0} pts</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/30"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2.5 bg-emerald-600 rounded-lg text-xs font-semibold text-white"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
