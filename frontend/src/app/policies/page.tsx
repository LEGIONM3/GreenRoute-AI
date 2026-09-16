"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Building2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { Policy } from "@/lib/types";

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

  const policyCategories = [
    "all",
    "Solid Waste",
    "E-Waste",
    "Plastic Waste",
    "Biomedical Waste",
    "Hazardous Waste",
  ];

  useEffect(() => {
    async function loadPolicies() {
      try {
        setIsLoading(true);
        const data = await api.getPolicies();
        setPolicies(data);
        if (data.length > 0) setExpandedPolicyId(data[0].id);
      } catch (err) {
        console.error("Failed to load policies:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPolicies();
  }, []);

  const filteredPolicies = policies.filter((p) => {
    const matchesCat = selectedCategory === "all" || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.summary.toLowerCase().includes(search.toLowerCase()) ||
      p.authority.toLowerCase().includes(search.toLowerCase()) ||
      (p.document_number && p.document_number.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedPolicyId(expandedPolicyId === id ? null : id);
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-3 border border-blue-200 dark:border-blue-800">
          <ShieldCheck className="w-4 h-4" />
          <span>Statutory Gazette Notifications & Municipal Rules</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Government Policy & Environmental Regulations Portal
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
          Browse official statutory rules governing solid waste, plastic bans, extended producer responsibility (EPR), electronic waste recycling, and biomedical containment.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policies by authority, gazette number, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {policyCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              {cat === "all" ? "All Policies" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Policy Documents Accordion List */}
      <div className="space-y-4">
        {filteredPolicies.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 text-sm">No policy documents match your criteria.</p>
          </div>
        ) : (
          filteredPolicies.map((policy) => {
            const isExpanded = expandedPolicyId === policy.id;
            return (
              <div
                key={policy.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200"
              >
                {/* Accordion Trigger */}
                <div
                  onClick={() => toggleExpand(policy.id)}
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        {policy.category}
                      </span>
                      {policy.document_number && (
                        <span className="text-xs text-slate-400 font-medium">
                          No: {policy.document_number}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      {policy.title}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{policy.authority}</span>
                      </span>
                      {policy.effective_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Effective: {policy.effective_date}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {isExpanded ? "Collapse Details" : "View Provisions"}
                    </span>
                    <div className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Provisions Content */}
                {isExpanded && (
                  <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-5">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                        Executive Summary
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {policy.summary}
                      </p>
                    </div>

                    <div>
                      <div className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                        Key Statutory Provisions & Generator Duties
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                        {policy.full_text}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-3">
                        {policy.file_url && (
                          <a
                            href={policy.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                          >
                            <span>Download Official Gazette (PDF)</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <Link
                        href={`/chat?q=What does ${encodeURIComponent(policy.title)} require?`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ask AI Assistant about this policy</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
