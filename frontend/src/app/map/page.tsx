"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Search,
  Crosshair,
  Filter,
  Navigation,
  Phone,
  Clock,
  CheckCircle2,
  Trash2,
  Recycle,
  Cpu,
  AlertTriangle,
  ChevronRight,
  Info,
} from "lucide-react";
import { api } from "@/lib/api";
import { LocationItem, LocationCategory } from "@/lib/types";
import { useAuthStore } from "@/lib/store";

// Dynamic SSR-safe Leaflet map loader
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-sm font-medium">Loading GIS Map Engine...</p>
    </div>
  ),
});

export default function MapExplorerPage() {
  const { userCoords, setUserCoords } = useAuthStore();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [categories, setCategories] = useState<LocationCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);

  // Load categories and initial locations
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [cats, locs] = await Promise.all([
          api.getCategories(),
          api.getLocations(userCoords ? { lat: userCoords.lat, lon: userCoords.lon } : undefined),
        ]);
        setCategories(cats);
        setLocations(locs);
        if (locs.length > 0) setSelectedLocation(locs[0]);
      } catch (err) {
        console.error("Failed to load map data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [userCoords]);

  // Handle Geolocation Detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserCoords(coords);
        try {
          const locs = await api.getLocations({
            lat: coords.lat,
            lon: coords.lon,
            category_code: selectedCategory !== "all" ? selectedCategory : undefined,
            search: searchQuery || undefined,
          });
          setLocations(locs);
          if (locs.length > 0) setSelectedLocation(locs[0]);
        } catch (err) {
          console.error(err);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.warn("Location error:", error.message);
        // Fallback to central point (e.g. Bengaluru downtown)
        const defaultCoords = { lat: 12.9716, lon: 77.5946 };
        setUserCoords(defaultCoords);
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Filter handlers
  const handleCategoryFilter = async (categoryCode: string) => {
    setSelectedCategory(categoryCode);
    setIsLoading(true);
    try {
      const locs = await api.getLocations({
        category_code: categoryCode !== "all" ? categoryCode : undefined,
        search: searchQuery || undefined,
        lat: userCoords?.lat,
        lon: userCoords?.lon,
      });
      setLocations(locs);
      if (locs.length > 0) setSelectedLocation(locs[0]);
      else setSelectedLocation(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const locs = await api.getLocations({
        search: searchQuery || undefined,
        category_code: selectedCategory !== "all" ? selectedCategory : undefined,
        lat: userCoords?.lat,
        lon: userCoords?.lon,
      });
      setLocations(locs);
      if (locs.length > 0) setSelectedLocation(locs[0]);
      else setSelectedLocation(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (code?: string) => {
    switch (code) {
      case "recycling":
        return <Recycle className="w-4 h-4 text-blue-500" />;
      case "e_waste":
        return <Cpu className="w-4 h-4 text-purple-500" />;
      case "hazardous":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Trash2 className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <MapPin className="w-7 h-7 text-emerald-600" />
            <span>Facility & Dustbin Explorer</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Discover verified drop-off hubs, dual segregation bins, and hazardous material depots in real-time.
          </p>
        </div>

        {/* Locate Me Trigger */}
        <button
          onClick={handleDetectLocation}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all"
        >
          <Crosshair className={`w-4 h-4 ${isLocating ? "animate-spin" : ""}`} />
          <span>{isLocating ? "Detecting GPS..." : userCoords ? "Update My Location" : "Find Near Me"}</span>
        </button>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col md:flex-row items-center gap-3 mb-6">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by facility name, address, or waste materials..."
            className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
          >
            Search
          </button>
        </form>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => handleCategoryFilter("all")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            }`}
          >
            All Facilities
          </button>
          {categories.map((cat) => (
            <button
              key={cat.code}
              onClick={() => handleCategoryFilter(cat.code)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.code
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              {getCategoryIcon(cat.code)}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: GIS Map & Facilities Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[600px]">
        {/* Left Column: Interactive GIS Map */}
        <div className="lg:col-span-8 h-[450px] lg:h-full min-h-[450px] rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 relative">
          <MapComponent
            locations={locations}
            userCoords={userCoords}
            selectedLocation={selectedLocation}
            onSelectLocation={(loc) => setSelectedLocation(loc)}
          />

          {/* Map Legend Overlay */}
          <div className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-xs space-y-1.5 hidden sm:block">
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">Facility Legend</div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 dark:text-slate-400">Public Smart Dustbins</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-600 dark:text-slate-400">Recycling Recovery Hubs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span className="text-slate-600 dark:text-slate-400">E-Waste Drop Centers</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-600 dark:text-slate-400">Hazardous & Biomedical</span>
            </div>
          </div>
        </div>

        {/* Right Column: Facilities List & Selected Details */}
        <div className="lg:col-span-4 flex flex-col gap-4 max-h-[750px] overflow-hidden">
          {/* Header count */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {locations.length} Facilities Found
            </span>
            {userCoords && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                📍 Ranked by Proximity
              </span>
            )}
          </div>

          {/* Location Cards Container */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {locations.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300">No Facilities Found</h4>
                <p className="text-xs text-slate-500 mt-1">Try expanding your search query or selecting &quot;All Facilities&quot;.</p>
              </div>
            ) : (
              locations.map((loc) => {
                const isSelected = selectedLocation?.id === loc.id;
                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                          {getCategoryIcon(loc.category?.code)}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                          {loc.name}
                        </h3>
                      </div>
                      {loc.distance_km !== undefined && loc.distance_km !== null && (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md shrink-0">
                          {loc.distance_km} km
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {loc.address}, {loc.city}
                    </p>

                    {/* Accepted Materials Preview */}
                    {loc.accepted_waste_types && loc.accepted_waste_types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {loc.accepted_waste_types.slice(0, 3).map((type) => (
                          <span
                            key={type}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300"
                          >
                            {type}
                          </span>
                        ))}
                        {loc.accepted_waste_types.length > 3 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{loc.accepted_waste_types.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                      {loc.contact_phone ? (
                        <a
                          href={`tel:${loc.contact_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-slate-500 hover:text-emerald-600 font-medium"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Monitored Bin</span>
                      )}

                      <a
                        href={loc.directions_url || `https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=16/${loc.latitude}/${loc.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Navigate</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
