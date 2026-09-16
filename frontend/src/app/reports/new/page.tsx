"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Crosshair,
  Upload,
  CheckCircle2,
  Camera,
  MapPin,
  X,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

export default function NewReportPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [category, setCategory] = useState("Overflowing Bin");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const categories = [
    { name: "Overflowing Bin", desc: "Trash spilled or overflowing over bin threshold" },
    { name: "Illegal Dumping", desc: "Commercial or construction debris dumped on open plot/curb" },
    { name: "Missing Dustbin", desc: "Broken, missing, or stolen municipal bin requires replacement" },
    { name: "Damaged Facility", desc: "Damaged recycling kiosk or hazardous storage locker" },
  ];

  // Cleanup object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAddress(`Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`);
        setIsDetectingLocation(false);
      },
      () => {
        setIsDetectingLocation(false);
        alert("Could not detect GPS location automatically. Please enter address manually.");
      }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg("Please sign in to submit an issue report and track its status.");
      router.push("/login?redirect=/reports/new");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Please provide a description of the issue.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("description", description);
      formData.append("latitude", latitude.toString());
      formData.append("longitude", longitude.toString());
      if (address) formData.append("address", address);
      if (imageFile) formData.append("image", imageFile);

      await api.submitReport(formData);
      router.push("/reports");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back Button */}
      <Link
        href="/reports"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to reports</span>
      </Link>

      {/* Guest Notice Banner */}
      {!user && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <p className="font-bold">Authentication Required to Earn Points</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-300">
              You are currently submitting as a guest. Sign in to link this report to your civic account, earn 50 eco-points upon verification, and receive live SMS/in-app resolution notices.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <Link
                href="/login?redirect=/reports/new"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm"
              >
                Sign In
              </Link>
              <Link
                href="/register?redirect=/reports/new"
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded-lg font-semibold text-xs transition-colors"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Report a Sanitation or Dustbin Issue
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Submit photographic evidence and GPS coordinates to alert municipal clearance teams.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Category Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Issue Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((c) => {
                const isSelected = category === c.name;
                return (
                  <div
                    key={c.name}
                    onClick={() => setCategory(c.name)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Description & Landmark Details
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue (e.g. Bin has been overflowing for 2 days near the bus stop curb, packaging spilled onto pavement)..."
              className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Location & GPS Detection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Location & Coordinates
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isDetectingLocation ? "animate-spin" : ""}`} />
                <span>{isDetectingLocation ? "Detecting GPS..." : "Auto-Detect My GPS"}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / Area Name (e.g. 14th Main, Indiranagar)"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  placeholder="Latitude"
                  className="w-1/2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                  required
                />
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  placeholder="Longitude"
                  className="w-1/2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Photo Evidence (Optional but Recommended)
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 transition-colors">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Select or Capture Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {previewUrl && (
                <div className="relative group w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 dark:border-slate-700 shrink-0">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    aria-label="Remove uploaded photo"
                    title="Remove Photo"
                    className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Submit Trigger */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
            >
              {isSubmitting ? "Submitting Report..." : "Submit Sanitation Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
