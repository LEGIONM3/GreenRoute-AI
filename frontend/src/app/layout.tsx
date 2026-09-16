import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PWAProvider from "@/components/PWAProvider";

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "WasteCare | Smart Waste Management & AI Guidance",
  description:
    "Locate nearby waste disposal facilities, recycling hubs, and receive AI-powered disposal guidance grounded in official government environmental policies.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white font-bold text-sm"
        >
          Skip to main content
        </a>
        <PWAProvider>
          <Navbar />
          <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col focus:outline-none">
            {children}
          </main>
          <Footer />
        </PWAProvider>
      </body>
    </html>
  );
}
