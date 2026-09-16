"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Clock,
  Eye,
  Tag,
  Sparkles,
  ArrowRight,
  BookmarkCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { KnowledgeArticle } from "@/lib/types";

export default function AwarenessPage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [readSlugs, setReadSlugs] = useState<string[]>([]);

  useEffect(() => {
    // Load read progress from localStorage
    const saved = localStorage.getItem("read_articles");
    if (saved) {
      try {
        setReadSlugs(JSON.parse(saved));
      } catch {}
    }

    async function fetchArticles() {
      try {
        setIsLoading(true);
        const data = await api.getArticles();
        setArticles(data);
      } catch (err) {
        console.error("Failed to load articles:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchArticles();
  }, []);

  const categories = ["all", "Segregation", "E-Waste Safety", "Composting", "Recycling"];

  const filteredArticles = articles.filter((art) => {
    const matchesCat = selectedCategory === "all" || art.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !search ||
      art.title.toLowerCase().includes(search.toLowerCase()) ||
      art.summary.toLowerCase().includes(search.toLowerCase()) ||
      art.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const completionPercentage = articles.length > 0 ? Math.round((readSlugs.length / articles.length) * 100) : 0;

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-emerald-600" />
            <span>Environmental Awareness & Guides</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Actionable educational guides, zero-waste practices, and home composting tutorials.
          </p>
        </div>

        {/* Read Progress Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-4 shrink-0 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 font-bold text-sm">
            <BookmarkCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Learning Progress
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {readSlugs.length} of {articles.length} Guides Read ({completionPercentage}%)
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guides by title, keyword, or tag..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              {cat === "all" ? "All Topics" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredArticles.map((art) => {
          const isRead = readSlugs.includes(art.slug);
          return (
            <article
              key={art.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {art.category}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{art.read_time}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{art.views_count}</span>
                    </span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                  <Link href={`/awareness/${art.slug}`}>{art.title}</Link>
                </h2>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {art.summary}
                </p>

                {/* Tags */}
                {art.tags && art.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {art.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {isRead ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Completed</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Not read yet</span>
                )}

                <Link
                  href={`/awareness/${art.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform"
                >
                  <span>Read Guide</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
