"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Recycle,
  ShieldAlert,
  MapPin,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Info,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { WasteItem, WasteSearchResponse, LocationItem } from "@/lib/types";
import { useAuthStore } from "@/lib/store";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const { userCoords } = useAuthStore();

  const [query, setQuery] = useState(initialQuery);
  const [searchResult, setSearchResult] = useState<WasteSearchResponse | null>(null);
  const [allItems, setAllItems] = useState<WasteItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBinFilter, setSelectedBinFilter] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Plastic bottle",
    "Lithium battery",
    "Cardboard box",
    "CFL bulb",
  ]);
  const [savedLocationIds, setSavedLocationIds] = useState<string[]>([]);

  const CATEGORIES = [
    "all",
    "Plastic",
    "Glass",
    "Metal",
    "Paper",
    "Organic",
    "Hazardous",
    "Biomedical",
    "Electronic",
    "Construction",
    "Textile",
    "Household",
    "Automotive",
    "Industrial",
  ];

  // Load directory items with offline JSON fallback & persistent local storage
  useEffect(() => {
    async function loadCatalog() {
      try {
        let items = await api.listWasteItems();
        if (!items || items.length === 0) {
          const res = await fetch("/waste_items.json");
          if (res.ok) {
            items = await res.json();
          }
        }
        setAllItems(items || []);
      } catch (err) {
        console.warn("Backend listWasteItems failed, falling back to local dataset:", err);
        try {
          const res = await fetch("/waste_items.json");
          if (res.ok) {
            const fallbackItems = await res.json();
            setAllItems(fallbackItems || []);
          }
        } catch (fetchErr) {
          console.error("Failed to load offline catalog:", fetchErr);
        }
      }
    }
    loadCatalog();

    try {
      const storedSearches = localStorage.getItem("wastecare_recent_searches");
      if (storedSearches) setRecentSearches(JSON.parse(storedSearches));
      const storedFavs = localStorage.getItem("wastecare_saved_locations");
      if (storedFavs) setSavedLocationIds(JSON.parse(storedFavs));
    } catch {
      // LocalStorage fallback
    }
  }, []);

  // Perform search if initial query exists
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (term: string) => {
    if (!term.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.searchWaste(term, userCoords || undefined);
      setSearchResult(res);

      // Persist to recent searches
      const cleanTerm = term.trim();
      const updated = [
        cleanTerm,
        ...recentSearches.filter((s) => s.toLowerCase() !== cleanTerm.toLowerCase()),
      ].slice(0, 6);
      setRecentSearches(updated);
      try {
        localStorage.setItem("wastecare_recent_searches", JSON.stringify(updated));
      } catch {}
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSaveLocation = (locId: string) => {
    const updated = savedLocationIds.includes(locId)
      ? savedLocationIds.filter((id) => id !== locId)
      : [...savedLocationIds, locId];
    setSavedLocationIds(updated);
    try {
      localStorage.setItem("wastecare_saved_locations", JSON.stringify(updated));
    } catch {}
  };

  const getBinBadgeClass = (binString: string) => {
    if (binString.includes("Green")) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
    if (binString.includes("Blue")) return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300";
    if (binString.includes("Grey")) return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300";
    if (binString.includes("Red")) return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300";
    return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300";
  };

  const filteredCatalog = allItems.filter((item) => {
    // Category filter
    if (selectedCategory !== "all") {
      if (item.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }
    // Bin filter
    if (selectedBinFilter !== "all") {
      if (!item.segregation_bin?.toLowerCase().includes(selectedBinFilter.toLowerCase())) {
        return false;
      }
    }
    // Keystroke live search
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const nameMatch = item.name?.toLowerCase().includes(q);
      const categoryMatch = item.category?.toLowerCase().includes(q);
      const methodMatch = item.disposal_method?.toLowerCase().includes(q);
      const binMatch = item.segregation_bin?.toLowerCase().includes(q);
      if (!nameMatch && !categoryMatch && !methodMatch && !binMatch) {
        return false;
      }
    }
    return true;
  });

  const isFuzzyOrSynonymMatch =
    searchResult?.matched_item &&
    searchResult.matched_item.name.toLowerCase() !== searchResult.query.trim().toLowerCase();

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Search Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Waste Disposal & Recycling Directory
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Search over 300+ everyday items to discover the exact segregation bin, proper rinsing & dismantling procedure, recycling viability, and nearest authorized disposal points.
        </p>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="mt-8 relative flex items-center shadow-lg shadow-emerald-950/5 rounded-2xl overflow-hidden border-2 border-emerald-500/30 bg-white dark:bg-slate-900 focus-within:border-emerald-600 transition-all"
        >
          <div className="pl-4 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. batteries, glass jar, medicines, thermocol, mobile..."
            className="w-full py-3.5 pl-3 pr-28 text-slate-900 dark:text-white bg-transparent focus:outline-none text-sm placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/20"
          >
            {isSearching ? "Searching..." : "Look Up"}
          </button>
        </form>

        {/* Recent Searches Chips */}
        {recentSearches.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Recent Searches:</span>
            {recentSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuery(item);
                  handleSearch(item);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Search Result Hero Card */}
      {searchResult && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-xl space-y-6">
          {/* Typo / Synonym Correction Callout */}
          {isFuzzyOrSynonymMatch && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Showing verified guidance for <strong>{searchResult.matched_item?.name}</strong>{" "}
                <span className="text-slate-500 dark:text-slate-400 font-normal">(matched query &ldquo;{searchResult.query}&rdquo;)</span>
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Disposal Guidance For
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {searchResult.matched_item ? searchResult.matched_item.name : searchResult.query}
              </h2>
            </div>

            {searchResult.matched_item && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Designated Bin:</span>
                <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${getBinBadgeClass(searchResult.matched_item.segregation_bin)}`}>
                  {searchResult.matched_item.segregation_bin}
                </span>
              </div>
            )}
          </div>

          {searchResult.matched_item ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Disposal Method */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>How to Dispose</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {searchResult.matched_item.disposal_method}
                </p>
              </div>

              {/* Recycling Potential */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                  <Recycle className="w-4 h-4" />
                  <span>Recycling Process</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {searchResult.matched_item.recycling_guidance}
                </p>
              </div>

              {/* Safety Precautions */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Safety Precautions</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {searchResult.matched_item.safety_precautions}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500">
              <p className="text-sm">
                No exact item profile for &quot;{searchResult.query}&quot;. Try asking our AI Assistant for detailed policy guidelines!
              </p>
              <Link
                href={`/chat?q=${encodeURIComponent(searchResult.query)}`}
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:underline"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ask AI Assistant about this item</span>
              </Link>
            </div>
          )}

          {/* Nearest Facilities Section */}
          {searchResult.nearest_facilities.length > 0 && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Nearest Authorized Drop-Off Facilities</span>
                </h3>
                <Link href="/map" className="text-xs font-semibold text-emerald-600 hover:underline">
                  View on Interactive Map →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResult.nearest_facilities.map((fac) => (
                  <div
                    key={fac.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{fac.name}</span>
                        {fac.distance_km !== undefined && fac.distance_km !== null && (
                          <span className="text-emerald-600 font-bold shrink-0">{fac.distance_km} km</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{fac.address}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSaveLocation(fac.id)}
                          aria-label={
                            savedLocationIds.includes(fac.id)
                              ? "Remove from saved locations"
                              : "Save location to favorites"
                          }
                          title={savedLocationIds.includes(fac.id) ? "Saved" : "Save Location"}
                          className={`p-1 rounded-md transition-colors ${
                            savedLocationIds.includes(fac.id)
                              ? "text-amber-500 bg-amber-50 dark:bg-amber-950/60"
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          }`}
                        >
                          {savedLocationIds.includes(fac.id) ? (
                            <BookmarkCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="text-[10px] text-slate-400">{fac.category?.name}</span>
                      </div>
                      <a
                        href={fac.directions_url || `https://www.openstreetmap.org/?mlat=${fac.latitude}&mlon=${fac.longitude}#map=16/${fac.latitude}/${fac.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Directions</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Waste Items Catalog Directory */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Disposal Catalog & Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filteredCatalog.length} of {allItems.length} indexed items across municipal streams.
              </p>
            </div>

            {/* Bin Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {["all", "Blue", "Green", "Grey", "Red"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedBinFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedBinFilter === filter
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {filter === "all" ? "All Bins" : `${filter} Bin`}
                </button>
              ))}
            </div>
          </div>

          {/* 13 Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100 dark:border-slate-800">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            ))}
          </div>
        </div>

        {filteredCatalog.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              No items found matching your current filter & search criteria.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedCategory("all");
                setSelectedBinFilter("all");
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatalog.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setQuery(item.name);
                  handleSearch(item.name);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                      {item.name}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${getBinBadgeClass(item.segregation_bin)}`}>
                      {item.segregation_bin}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {item.disposal_method}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-medium">Category: {item.category}</span>
                  <span className="font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WasteSearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading Waste Search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
