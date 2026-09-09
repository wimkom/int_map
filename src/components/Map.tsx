"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LocateFixed } from "lucide-react";

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function checkHandling(coord: [number, number], geojsonData: any) {
  if (!geojsonData) return null;
  let closestFeature = null;
  let minDistance = Infinity;

  for (const feature of geojsonData.features) {
    if (feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates;
      for (const pt of coords) {
        const dist = getDistanceInMeters(coord[0], coord[1], pt[1], pt[0]);
        if (dist < minDistance) {
          minDistance = dist;
          closestFeature = feature;
        }
      }
    }
  }

  if (minDistance < 50 && closestFeature) {
    return { feature: closestFeature, distance: minDistance };
  }
  return null;
}

function findClosestSTA(coord: [number, number], staLabels: any) {
  if (!staLabels) return null;
  let closestFeature = null;
  let minDistance = Infinity;

  for (const feature of staLabels.features) {
    if (feature.geometry.type === 'Point') {
      const pt = feature.geometry.coordinates;
      const dist = getDistanceInMeters(coord[0], coord[1], pt[1], pt[0]);
      if (dist < minDistance) {
        minDistance = dist;
        closestFeature = feature;
      }
    }
  }
  
  // Let's expand the radius to 1000m (1km) so they get some reading if slightly off
  if (minDistance < 1000 && closestFeature) {
    return { name: closestFeature.properties.name, distance: minDistance };
  }
  return null; 
}

function DynamicMarkers({ searchedCoord, focusedFeatureCoord, myLocation, roadGeoJson, staLabels }: any) {
  const map = useMap();
  const markerRef = useRef<L.Marker>(null);
  
  const [handlingResult, setHandlingResult] = useState<any>(null);
  const [closestSta, setClosestSta] = useState<any>(null);

  useEffect(() => {
    if (searchedCoord) {
      map.flyTo(searchedCoord, 16, { animate: true, duration: 1.5 });
      setHandlingResult(checkHandling(searchedCoord, roadGeoJson));
      setClosestSta(findClosestSTA(searchedCoord, staLabels));
    }
  }, [searchedCoord, map, roadGeoJson, staLabels]);

  useEffect(() => {
    if (myLocation) {
      map.flyTo(myLocation, 17, { animate: true, duration: 1.5 });
      setHandlingResult(checkHandling(myLocation, roadGeoJson));
      setClosestSta(findClosestSTA(myLocation, staLabels));
    }
  }, [myLocation, map, roadGeoJson, staLabels]);

  useEffect(() => {
    if (focusedFeatureCoord) {
      map.flyTo(focusedFeatureCoord, 16, { animate: true, duration: 1.5 });
      setHandlingResult(null); 
    }
  }, [focusedFeatureCoord, map]);

  // Auto-open popup when activeCoord changes
  const activeCoord = myLocation || searchedCoord;
  useEffect(() => {
    if (activeCoord && markerRef.current) {
      // Delay opening popup to allow map to fly first
      setTimeout(() => {
        markerRef.current?.openPopup();
      }, 500);
    }
  }, [activeCoord]);

  if (!activeCoord) return null;

  const isMyLocation = !!myLocation && activeCoord === myLocation;
  const iconColor = isMyLocation ? '#3b82f6' : '#ef4444'; 
  
  const customIcon = new L.DivIcon({
    className: "clear-icon",
    html: `<div style="background-color: ${iconColor}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${iconColor}; animation: pulse-${isMyLocation ? 'blue' : 'red'} 2s infinite;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return (
    <Marker position={activeCoord} icon={customIcon} ref={markerRef}>
      <Popup>
        <div className="p-2 min-w-[220px]">
          <h3 className="font-bold text-lg border-b pb-1 mb-2">
            {isMyLocation ? '📍 Posisi Anda Saat Ini' : 'Hasil Pencarian'}
          </h3>
          
          <div className="mb-3">
            {closestSta ? (
              <p className="text-sm font-bold text-slate-700">
                Sekitar STA: <span className="text-blue-600 bg-blue-50 px-1 rounded">{closestSta.name}</span>
                <span className="block text-[10px] text-slate-500 font-normal mt-0.5">Jarak ke titik STA: {Math.round(closestSta.distance)}m</span>
              </p>
            ) : (
              <p className="text-xs font-bold text-amber-600 italic p-1.5 bg-amber-50 rounded">⚠️ Anda berada jauh dari ruas jalan M. Beliti - Mangunjaya.</p>
            )}
          </div>
          
          {handlingResult ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-sm shadow-sm">
              <p className="font-bold flex items-center mb-1">✅ Masuk Area Penanganan</p>
              <p className="font-bold text-emerald-900 text-xs">{handlingResult.feature.properties.name}</p>
              <p className="text-[10px] opacity-80 mt-1">{handlingResult.feature.properties.description}</p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 text-slate-600 p-2.5 rounded-xl text-sm shadow-sm mt-2">
              <p className="font-bold text-slate-800">❌ Tidak Ada Penanganan</p>
              <p className="text-[10px] mt-1">Titik ini tidak masuk dalam daftar penanganan aktif.</p>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

const createSmallDot = (color: string) => {
  return new L.DivIcon({
    className: "clear-icon",
    html: `<div style="background-color: white; width: 10px; height: 10px; border-radius: 50%; border: 3px solid ${color}; box-shadow: 0 1px 2px rgba(0,0,0,0.4);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
};

export default function Map({ searchedCoord, focusedFeatureCoord, roadGeoJson, baseRoad, staLabels }: any) {
  const center: [number, number] = [-2.919, 103.463];
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMyLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          alert("Gagal mendapatkan lokasi. Pastikan GPS/Location aktif di HP Anda dan izin browser diberikan.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Browser Anda tidak mendukung fitur GPS.");
    }
  };

  const onEachLineFeature = (feature: any, layer: any) => {
    if (feature.properties && feature.properties.name) {
      layer.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">${feature.properties.name}</h3>
          <p style="margin: 0; font-size: 12px; color: #555;">${feature.properties.description || ''}</p>
        </div>
      `);
      
      layer.on({
        mouseover: (e: any) => {
          const l = e.target;
          l.setStyle({ weight: 8, opacity: 1 });
        },
        mouseout: (e: any) => {
          const l = e.target;
          l.setStyle({ weight: 6, opacity: 0.9 });
        }
      });
    }
  };

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer center={center} zoom={11} className="w-full h-full" scrollWheelZoom={true}>
        
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Google Maps Biasa">
            <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Google Maps Satelit">
            <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" attribution="&copy; Google Maps Satellite" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Peta Netral (OSM)">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          </LayersControl.BaseLayer>
        </LayersControl>

        <DynamicMarkers searchedCoord={searchedCoord} focusedFeatureCoord={focusedFeatureCoord} myLocation={myLocation} roadGeoJson={roadGeoJson} staLabels={staLabels} />

        {baseRoad && (
          <GeoJSON 
            data={baseRoad}
            style={() => ({
              color: '#64748b',
              weight: 5,
              opacity: 0.7,
              dashArray: '5, 8'
            })}
          />
        )}

        {staLabels && (
          <GeoJSON
            data={staLabels}
            filter={(feature) => feature.geometry.type === 'Point'}
            pointToLayer={(feature, latlng) => {
              return L.circleMarker(latlng, {
                radius: 3,
                fillColor: '#ffffff',
                color: '#3b82f6',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.8
              }).bindTooltip(
                `<span style="font-weight:bold;">STA ${feature.properties.name}</span>`,
                { permanent: false, direction: 'top', offset: [0, -4] }
              );
            }}
          />
        )}

        {roadGeoJson && (
          <GeoJSON 
            data={roadGeoJson}
            filter={(feature) => feature.geometry.type === 'LineString'}
            style={(feature: any) => {
              return {
                color: feature.properties.stroke || '#3b82f6',
                weight: 6,
                opacity: 0.9
              }
            }}
            onEachFeature={onEachLineFeature}
          />
        )}

        {roadGeoJson && (
          <GeoJSON
            data={roadGeoJson}
            filter={(feature) => feature.geometry.type === 'Point'}
            pointToLayer={(feature, latlng) => {
              return L.marker(latlng, { icon: createSmallDot('#1e293b') }).bindTooltip(
                feature.properties.name,
                { permanent: true, direction: 'right', offset: [5, 0], className: 'bg-transparent border-0 shadow-none text-[12px] font-bold text-gray-800 text-stroke' }
              );
            }}
          />
        )}

      </MapContainer>

      {/* Floating GPS Button */}
      <div className="absolute bottom-6 right-4 md:right-6 z-[1000]">
        <button 
          onClick={handleGetLocation}
          className="bg-white text-blue-600 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 flex items-center justify-center hover:bg-blue-50 active:scale-95 transition-all group"
        >
          <LocateFixed size={24} className="group-hover:animate-spin-slow" />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes pulse-blue {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .text-stroke {
          text-shadow: -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0px 0px 4px rgba(255,255,255,1);
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .clear-icon {
          background: none !important;
          border: none !important;
        }
        .leaflet-tooltip.bg-transparent {
          background-color: transparent;
        }
        .leaflet-control-layers-toggle {
          background-size: 50%;
        }
      `}} />
    </div>
  );
}
