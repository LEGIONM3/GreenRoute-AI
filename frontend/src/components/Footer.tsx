import Link from "next/link";
import { ShieldCheck, Heart, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-white font-bold text-lg">WasteCare</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Empowering citizens with intelligent GIS location discovery and AI-powered waste disposal guidance grounded in verified environmental policies.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Compliant with CPCB & MoEFCC Standards</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Features</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/map" className="hover:text-emerald-400 transition-colors">
                  Map Explorer
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-emerald-400 transition-colors">
                  Waste Disposal Search
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-emerald-400 transition-colors">
                  AI RAG Assistant
                </Link>
              </li>
              <li>
                <Link href="/reports" className="hover:text-emerald-400 transition-colors">
                  Community Issue Reporting
                </Link>
              </li>
            </ul>
          </div>

          {/* Policy Knowledge */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Guidelines</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/policies" className="hover:text-emerald-400 transition-colors">
                  Solid Waste Management 2016
                </Link>
              </li>
              <li>
                <Link href="/policies" className="hover:text-emerald-400 transition-colors">
                  E-Waste Management 2022
                </Link>
              </li>
              <li>
                <Link href="/policies" className="hover:text-emerald-400 transition-colors">
                  Plastic Waste Rules 2024
                </Link>
              </li>
              <li>
                <Link href="/awareness" className="hover:text-emerald-400 transition-colors">
                  Segregation & Composting Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Civic Helpline */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Sanitation Helpline</h3>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
              <div className="font-semibold text-slate-200">Toll-Free Civic Support</div>
              <div className="text-emerald-400 text-base font-bold">1800-11-WASTE (92783)</div>
              <div className="text-slate-400">Emergency Illegal Dumping Desk: 24/7 Monitored Dispatch</div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} Smart Waste Management Platform. All rights reserved.</div>
          <div className="flex items-center gap-1">
            <span>Built with precision for urban civic sustainability</span>
            <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400 mx-1" />
          </div>
        </div>
      </div>
    </footer>
  );
}
