"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Bot,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Recycle,
  CheckCircle2,
  Cpu,
  Trash2,
  BookOpen,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const sampleItems = [
    { name: "Plastic Bottle", bin: "Blue (Dry)", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { name: "Lithium Battery", bin: "Grey (E-Waste)", color: "bg-purple-50 text-purple-700 border-purple-200" },
    { name: "Kitchen Scraps", bin: "Green (Wet)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { name: "Expired Pills", bin: "Red (Hazardous)", color: "bg-rose-50 text-rose-700 border-rose-200" },
    { name: "Thermocol Foam", bin: "Blue (Dry MRF)", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  ];

  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-emerald-50/70 via-white to-transparent dark:from-emerald-950/20 dark:via-slate-950 dark:to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Regulatory Compliance Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-6 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-4 h-4" />
            <span>Official CPCB & MoEFCC Compliant Civic Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Smart Waste Disposal & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              AI-Powered Guidance
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Locate verified dustbins, recyclers, and hazardous collection centers in your neighbourhood. Receive instant disposal instructions backed by statutory environmental policies.
          </p>

          {/* Quick Search Bar */}
          <div className="mt-10 max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative flex items-center shadow-lg shadow-emerald-950/5 rounded-2xl overflow-hidden border-2 border-emerald-500/30 dark:border-emerald-500/40 bg-white dark:bg-slate-900 focus-within:border-emerald-600 transition-all">
              <div className="pl-4 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any item: e.g. batteries, plastic bottle, thermocol, medicines..."
                className="w-full py-4 pl-3 pr-28 text-slate-900 dark:text-white bg-transparent focus:outline-none text-base placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <span>Search</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Chips */}
            <div className="mt-4 flex items-center justify-center flex-wrap gap-2 text-xs">
              <span className="text-slate-500 font-medium">Quick search:</span>
              {sampleItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => router.push(`/search?q=${encodeURIComponent(item.name)}`)}
                  className={`px-2.5 py-1 rounded-full border transition-all hover:scale-105 ${item.color}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Hero CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/map"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-base shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
              <span>Explore Facilities Map</span>
            </Link>
            <Link
              href="/chat"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-base hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2"
            >
              <Bot className="w-5 h-5 text-emerald-600" />
              <span>Ask AI Policy Assistant</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Everything you need for sustainable waste management
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            A comprehensive civic technology suite engineered for citizens, sanitation workers, and urban administrators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: GIS Location Intelligence */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                GIS Location Discovery
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                Interactive OpenStreetMap integration to locate public dustbins, dry waste recovery centers, certified e-waste hubs, and hazardous depots with distance calculations and turn-by-turn routing.
              </p>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:gap-2 transition-all"
            >
              <span>View Live Map</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: AI RAG Assistant */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                AI Assistant (RAG Pipeline)
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                Ask any disposal or recycling question. Grounded in official statutory documents with explicit source citations, hybrid vector retrieval, and safety guardrails to prevent hallucinations.
              </p>
            </div>
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:gap-2 transition-all"
            >
              <span>Chat with Assistant</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Issue Reporting */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Civic Issue Reporting
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                Report overflowing dustbins, missing bins, and illegal dumpsites with photo evidence and geolocation pins. Track real-time resolution from municipal authorities.
              </p>
            </div>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:gap-2 transition-all"
            >
              <span>Submit Issue Report</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3-Stream Segregation Visual Guide */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white relative overflow-hidden">
          <div className="max-w-2xl mb-10">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 mb-2 block">
              Official Segregation Standard
            </span>
            <h2 className="text-3xl font-bold">The Three-Stream Segregation Rule</h2>
            <p className="mt-2 text-slate-400 text-sm">
              As mandated by the Solid Waste Management Rules 2016 (MoEFCC), every citizen must segregate waste at source.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Green Bin */}
            <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                    🌿
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-emerald-300">Green Bin: Wet</h4>
                    <span className="text-xs text-emerald-400 font-medium">Biodegradable Organic Waste</span>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Kitchen fruit & vegetable peels</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cooked food scraps & tea leaves</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Leaves, flowers & garden clippings</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-emerald-900/80 text-[11px] text-emerald-400 font-semibold">
                Destination: Scientific Composting & Bio-CNG
              </div>
            </div>

            {/* Blue Bin */}
            <div className="p-6 rounded-2xl bg-blue-950/60 border border-blue-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                    📦
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-blue-300">Blue Bin: Dry</h4>
                    <span className="text-xs text-blue-400 font-medium">Recyclable Clean Materials</span>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Plastic bottles, containers & tubs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Paper, newspapers & corrugated cartons</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Glass jars, bottles & beverage cans</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-blue-900/80 text-[11px] text-blue-400 font-semibold">
                Destination: Material Recovery Facilities (MRF)
              </div>
            </div>

            {/* Red Bin */}
            <div className="p-6 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold">
                    ⚠️
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-rose-300">Red Bin: Domestic Hazard</h4>
                    <span className="text-xs text-rose-400 font-medium">Toxic & Sanitary Items</span>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Wrapped diapers & sanitary pads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Spent batteries & fluorescent tubes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Paints, insecticides & expired medicines</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-rose-900/80 text-[11px] text-rose-400 font-semibold">
                Destination: High-temp Incineration / Hazardous Depot
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Awareness & Policy Quick Access */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Awareness Guides & Policy Portal</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Read practical eco-guides or search statutory environmental regulations.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/awareness"
              className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-sm hover:bg-emerald-100 transition-colors"
            >
              All Articles
            </Link>
            <Link
              href="/policies"
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              Policy Repository
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase">Featured Guide</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                How to Safely Handle & Dispose of Lithium-Ion Batteries
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Learn why taping battery terminals saves municipal collection vehicles from catastrophic fires and where to find local drop-off boxes.
              </p>
              <Link href="/awareness/how-to-safely-dispose-lithium-batteries" className="mt-3 inline-block text-xs font-semibold text-emerald-600 hover:underline">
                Read guide (4 min read) →
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase">Official Policy</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                E-Waste (Management) Rules 2022
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Central Pollution Control Board mandates Extended Producer Responsibility (EPR) and prohibits commingling electronic items in municipal trash.
              </p>
              <Link href="/policies" className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline">
                View policy provisions →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
