"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  MapPin,
  Trash2,
  Recycle,
  Cpu,
  ChevronRight,
  Info,
} from "lucide-react";

interface SanitizedAIResponseProps {
  content: string;
}

export default function SanitizedAIResponse({ content }: SanitizedAIResponseProps) {
  if (!content) return null;

  // Clean raw artifacts before block parsing
  let sanitized = content
    // Remove raw markdown divider blocks
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Remove raw empty brackets
    .replace(/\[\]/g, "")
    // Remove noisy inline bracket citation noise
    .replace(/\[([^\]]+ - (?:Awareness Guide|Government Policy|Regulation|Recycling Guide))\]/gi, "")
    // Replace raw arrows
    .replace(/→/g, " -> ")
    // Clean repeated spaces and newlines
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Split into paragraph blocks
  const rawBlocks = sanitized.split("\n\n");

  const renderFormattedInline = (text: string) => {
    // Remove raw double asterisks while preserving emphasis
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("*") && part.endsWith("*")) {
        const clean = part.replace(/^\*+|\*+$/g, "");
        // Highlight bin colors
        const lower = clean.toLowerCase();
        if (lower.includes("green") || lower.includes("wet")) {
          return (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 mx-1"
            >
              {clean}
            </span>
          );
        }
        if (lower.includes("blue") || lower.includes("dry") || lower.includes("recycl")) {
          return (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 mx-1"
            >
              {clean}
            </span>
          );
        }
        if (lower.includes("red") || lower.includes("hazard") || lower.includes("danger")) {
          return (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 mx-1"
            >
              {clean}
            </span>
          );
        }
        if (lower.includes("e-waste") || lower.includes("electronic") || lower.includes("grey")) {
          return (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 mx-1"
            >
              {clean}
            </span>
          );
        }
        return (
          <strong key={idx} className="font-bold text-slate-900 dark:text-white">
            {clean}
          </strong>
        );
      }
      // Clean single asterisks or leftover backticks
      const cleanPart = part.replace(/^[*_`]+|[*_`]+$/g, "");
      return <span key={idx}>{cleanPart}</span>;
    });
  };

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
      {rawBlocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Check if block is a Heading
        const isMarkdownHeader = /^#{1,6}\s*(.+)$/.test(trimmed);
        const isNumberedHeader = /^[0-9]+\.\s+([A-Z][A-Za-z\s&/]+)(?::|$)/.test(trimmed);

        if (isMarkdownHeader || (isNumberedHeader && !trimmed.includes("\n"))) {
          const headerText = trimmed
            .replace(/^#{1,6}\s*/, "")
            .replace(/^[0-9]+\.\s*/, "")
            .replace(/\*/g, "")
            .replace(/:$/, "");

          let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
          const hLower = headerText.toLowerCase();
          if (hLower.includes("bin") || hLower.includes("segregation")) {
            icon = <Trash2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
          } else if (hLower.includes("safety") || hLower.includes("hazard") || hLower.includes("warning")) {
            icon = <AlertTriangle className="w-4 h-4 text-rose-500" />;
          } else if (hLower.includes("recycl")) {
            icon = <Recycle className="w-4 h-4 text-emerald-500" />;
          } else if (hLower.includes("facility") || hLower.includes("center")) {
            icon = <MapPin className="w-4 h-4 text-teal-500" />;
          }

          return (
            <div
              key={bIdx}
              className="flex items-center gap-2 pt-2 pb-1 border-b border-slate-100 dark:border-slate-800/80 font-bold text-slate-900 dark:text-white text-base"
            >
              <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                {icon}
              </div>
              <h3>{headerText}</h3>
            </div>
          );
        }

        // Check if block is a List
        const lines = trimmed.split("\n");
        const isListBlock = lines.every(
          (l) => /^\s*([*\-•]|[0-9]+\.)\s+/.test(l.trim()) || l.trim() === ""
        );

        if (isListBlock && lines.length > 0) {
          return (
            <ul key={bIdx} className="space-y-2 pl-1 my-2">
              {lines.map((line, lIdx) => {
                const lineClean = line.replace(/^\s*([*\-•]|[0-9]+\.)\s+/, "").trim();
                if (!lineClean) return null;

                const lLower = lineClean.toLowerCase();
                const isWarning =
                  lLower.includes("not place") ||
                  lLower.includes("never") ||
                  lLower.includes("danger") ||
                  lLower.includes("do not") ||
                  lLower.includes("fire hazard") ||
                  lLower.includes("toxic");

                return (
                  <li key={lIdx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed">
                    <div className="shrink-0 mt-0.5">
                      {isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1">{renderFormattedInline(lineClean)}</div>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Check if block is a critical safety warning callout
        const bLower = trimmed.toLowerCase();
        const isSafetyCallout =
          (bLower.includes("fire hazard") ||
            bLower.includes("thermal runaway") ||
            bLower.includes("toxic") ||
            bLower.includes("severe burn") ||
            bLower.includes("carcinogen")) &&
          !isMarkdownHeader;

        if (isSafetyCallout) {
          return (
            <div
              key={bIdx}
              className="p-3.5 sm:p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs sm:text-sm text-rose-900 dark:text-rose-200 flex items-start gap-3 my-2"
            >
              <Flame className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1 space-y-1">
                <span className="font-bold uppercase tracking-wider text-[11px] text-rose-600 dark:text-rose-400 block">
                  Safety Hazard Notice
                </span>
                <div>{renderFormattedInline(trimmed)}</div>
              </div>
            </div>
          );
        }

        // Standard clean paragraph
        return (
          <p key={bIdx} className="text-xs sm:text-sm leading-relaxed">
            {renderFormattedInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
