"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Eye,
  CheckCircle,
  Share2,
  Bookmark,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import { KnowledgeArticle } from "@/lib/types";

export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [isRead, setIsRead] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadArticle() {
      try {
        setIsLoading(true);
        const data = await api.getArticleBySlug(resolvedParams.slug);
        setArticle(data);

        // Check read state
        const saved = localStorage.getItem("read_articles");
        if (saved) {
          const list: string[] = JSON.parse(saved);
          if (list.includes(resolvedParams.slug)) {
            setIsRead(true);
          }
        }
      } catch (err) {
        console.error("Failed to load article:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadArticle();
  }, [resolvedParams.slug]);

  const toggleReadStatus = () => {
    const saved = localStorage.getItem("read_articles");
    let list: string[] = saved ? JSON.parse(saved) : [];

    if (isRead) {
      list = list.filter((s) => s !== resolvedParams.slug);
      setIsRead(false);
    } else {
      list.push(resolvedParams.slug);
      setIsRead(true);
    }
    localStorage.setItem("read_articles", JSON.stringify(list));
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Loading Guide...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Guide Not Found</h2>
        <p className="text-sm text-slate-500">The guide you requested does not exist or has been archived.</p>
        <Link
          href="/awareness"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Awareness Center</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Navigation and Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/awareness"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all guides</span>
        </Link>

        <button
          onClick={toggleReadStatus}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            isRead
              ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 text-emerald-700 dark:text-emerald-300"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <CheckCircle className={`w-4 h-4 ${isRead ? "text-emerald-600" : "text-slate-400"}`} />
          <span>{isRead ? "Marked as Completed" : "Mark as Read"}</span>
        </button>
      </div>

      {/* Article Header */}
      <header className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
            {article.category}
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{article.read_time}</span>
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{article.views_count} views</span>
            </span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
          {article.title}
        </h1>

        <p className="text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
          {article.summary}
        </p>
      </header>

      {/* Main Content Body */}
      <article className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base space-y-4">
        {article.content.split("\n\n").map((para, idx) => {
          if (para.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-2">
                {para.replace("### ", "")}
              </h3>
            );
          }
          if (para.startsWith("- ")) {
            const items = para.split("\n").map((line) => line.replace(/^- /, ""));
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1.5 my-3">
                {items.map((item, iIdx) => (
                  <li key={iIdx}>{item}</li>
                ))}
              </ul>
            );
          }
          return <p key={idx}>{para}</p>;
        })}
      </article>

      {/* Tags and CTA */}
      <footer className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
        {article.tags && article.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400">Tags:</span>
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">Have specific disposal questions?</div>
              <div className="text-xs text-slate-500">Ask our AI Assistant for policy-backed guidance on this topic.</div>
            </div>
          </div>
          <Link
            href={`/chat?q=${encodeURIComponent(article.title)}`}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shrink-0"
          >
            Ask AI Assistant
          </Link>
        </div>
      </footer>
    </div>
  );
}
