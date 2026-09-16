"use client";

import { useEffect, useRef } from "react";
import { LocationItem } from "@/lib/types";

interface MapProps {
  locations: LocationItem[];
  userCoords?: { lat: number; lon: number } | null;
  selectedLocation?: LocationItem | null;
  onSelectLocation?: (location: LocationItem) => void;
  zoom?: number;
  center?: [number, number];
}

export default function MapComponent({
  locations,
  userCoords,
  selectedLocation,
  onSelectLocation,
  zoom = 13,
  center = [12.9716, 77.5946],
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Dynamically import Leaflet to avoid SSR window errors
    import("leaflet").then((L) => {
      // Fix default marker icon path issue in Webpack/Next
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const container = mapContainerRef.current;
      if (!container) return;

      if (!mapInstanceRef.current) {
        const initialCenter = userCoords ? [userCoords.lat, userCoords.lon] : center;
        const map = L.map(container, {
          center: initialCenter as [number, number],
          zoom: zoom,
          zoomControl: false,
        });

        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const markersLayer = markersLayerRef.current;

      // Update User Marker
      if (userCoords) {
        if (userMarkerRef.current) {
          markersLayer.removeLayer(userMarkerRef.current);
        }
        const userIcon = L.divIcon({
          className: "custom-user-marker",
          html: `<div class="user-location-marker" title="Your Location"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        const uMarker = L.marker([userCoords.lat, userCoords.lon], { icon: userIcon })
          .bindPopup("<b>You are here</b><br>Current Detected Location");
        markersLayer.addLayer(uMarker);
        userMarkerRef.current = uMarker;
      }

      // Update Location Markers
      if (markersLayer) {
        markersLayer.clearLayers();
        if (userMarkerRef.current) markersLayer.addLayer(userMarkerRef.current);

        locations.forEach((loc) => {
          const categoryCode = loc.category?.code || "dustbin";
          let markerColor = "#10B981"; // green
          let iconSymbol = "🗑️";

          if (categoryCode === "recycling") {
            markerColor = "#3B82F6"; // blue
            iconSymbol = "♻️";
          } else if (categoryCode === "e_waste") {
            markerColor = "#8B5CF6"; // purple
            iconSymbol = "⚡";
          } else if (categoryCode === "hazardous") {
            markerColor = "#EF4444"; // red
            iconSymbol = "⚠️";
          }

          const customIcon = L.divIcon({
            className: "custom-facility-pin",
            html: `
              <div style="
                background-color: ${markerColor};
                color: white;
                width: 34px;
                height: 34px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #ffffff;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              ">
                <span style="transform: rotate(45deg); font-size: 15px;">${iconSymbol}</span>
              </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 34],
            popupAnchor: [0, -32],
          });

          const popupContent = `
            <div style="font-family: inherit; font-size: 13px; max-width: 250px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 10px; text-transform: uppercase; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${markerColor}20; color: ${markerColor};">
                  ${loc.category?.name || "Facility"}
                </span>
                ${loc.distance_km !== undefined && loc.distance_km !== null ? `<span style="font-weight: 600; color: #475569; font-size: 11px;">📍 ${loc.distance_km} km</span>` : ""}
              </div>
              <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #0f172a;">${loc.name}</h4>
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; line-height: 1.4;">${loc.address}</p>
              
              ${loc.accepted_waste_types && loc.accepted_waste_types.length > 0 ? `
                <div style="margin-bottom: 8px;">
                  <div style="font-size: 10px; font-weight: 600; color: #475569; margin-bottom: 3px;">Accepted:</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                    ${loc.accepted_waste_types.map(t => `<span style="background: #f1f5f9; padding: 2px 5px; border-radius: 3px; font-size: 10px; color: #334155;">${t}</span>`).join("")}
                  </div>
                </div>
              ` : ""}

              ${loc.contact_phone ? `
                <div style="margin-bottom: 8px; font-size: 11px; color: #475569;">
                  📞 <a href="tel:${loc.contact_phone}" style="color: #059669; text-decoration: none; font-weight: 600;">${loc.contact_phone}</a>
                </div>
              ` : ""}

              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <a href="${loc.directions_url || `https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=16/${loc.latitude}/${loc.longitude}`}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #059669; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none;">
                  Directions (OSM) ↗
                </a>
              </div>
            </div>
          `;

          const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon })
            .bindPopup(popupContent);

          marker.on("click", () => {
            if (onSelectLocation) onSelectLocation(loc);
          });

          markersLayer.addLayer(marker);
        });
      }

      // Fly to selected location if passed
      if (selectedLocation && map) {
        map.flyTo([selectedLocation.latitude, selectedLocation.longitude], 15, { duration: 1.2 });
      }
    });

    return () => {
      // Keep instance in ref
    };
  }, [locations, userCoords, selectedLocation, zoom, center, onSelectLocation]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainerRef} className="w-full h-full rounded-2xl shadow-inner border border-slate-200 dark:border-slate-800" />
    </div>
  );
}
