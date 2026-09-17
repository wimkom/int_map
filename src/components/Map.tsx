"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup, LayersControl, useMapEvents, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LocateFixed, Cloud, Sun, CloudRain, Ruler, Trash2, ExternalLink } from "lucide-react";

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
  
  if (minDistance < 1000 && closestFeature) {
    return { 
      name: closestFeature.properties.name, 
      distance: minDistance,
      description: closestFeature.properties.description
    };
  }
  return null; 
}

function DynamicMarker({ coord, isMyLocation, roadGeoJson, staLabels, triggerTime }: any) {
  const map = useMap();
  const markerRef = useRef<L.Marker>(null);
  
  const [handlingResult, setHandlingResult] = useState<any>(null);
  const [closestSta, setClosestSta] = useState<any>(null);

  useEffect(() => {
    if (coord) {
      map.flyTo(coord, 16, { animate: true, duration: 1.5 });
      setHandlingResult(checkHandling(coord, roadGeoJson));
      setClosestSta(findClosestSTA(coord, staLabels));
    }
  }, [coord, map, roadGeoJson, staLabels, triggerTime]);

  useEffect(() => {
    if (coord && markerRef.current) {
      setTimeout(() => {
        markerRef.current?.openPopup();
      }, 500);
    }
  }, [coord, triggerTime]);

  if (!coord) return null;

  const iconColor = isMyLocation ? '#3b82f6' : '#ef4444'; 
  
  const customIcon = new L.DivIcon({
    className: "clear-icon",
    html: `<div style="background-color: ${iconColor}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${iconColor}; animation: pulse-${isMyLocation ? 'blue' : 'red'} 2s infinite;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return (
    <Marker position={coord} icon={customIcon} ref={markerRef}>
      <Popup>
        <div className="p-2 min-w-[220px]">
          <h3 className="font-bold text-lg border-b pb-1 mb-2">
            {isMyLocation ? '📍 Posisi Anda Saat Ini' : 'Hasil Pencarian'}
          </h3>
          
          <div className="mb-3">
            {closestSta ? (
              <div className="text-sm font-bold text-slate-700">
                <p>Sekitar STA: <span className="text-blue-600 bg-blue-50 px-1 rounded">{closestSta.name}</span></p>
                {closestSta.description && (
                  <p className="text-[10px] text-slate-600 font-normal leading-tight mt-1 bg-slate-50 p-1 rounded border border-slate-100">
                    {closestSta.description.includes('MANGUN JAYA') ? 'Ruas 034: ' : 
                     closestSta.description.includes('MUARA BELITI') ? 'Ruas 035: ' : ''}
                    {closestSta.description.trim()}
                  </p>
                )}
                <span className="block text-[10px] text-slate-500 font-normal mt-1">Jarak ke titik STA: {Math.round(closestSta.distance)}m</span>
              </div>
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
          
          <div className="mt-3 flex gap-2">
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${coord[0]},${coord[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 py-2 rounded-lg text-xs font-bold transition-colors border border-blue-200 shadow-sm"
            >
              🧭 Rute
            </a>
            <a 
              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coord[0]},${coord[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-slate-50 text-slate-700 hover:bg-slate-100 py-2 rounded-lg text-xs font-bold transition-colors border border-slate-200 shadow-sm"
            >
              📸 Street View
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Separate component just to handle flying to clicked features in the list
function FeatureFocusController({ focusedFeatureCoord }: any) {
  const map = useMap();
  useEffect(() => {
    if (focusedFeatureCoord) {
      map.flyTo(focusedFeatureCoord, 16, { animate: true, duration: 1.5 });
    }
  }, [focusedFeatureCoord, map]);
  return null;
}

const createSmallDot = (color: string) => {
  return new L.DivIcon({
    className: "clear-icon",
    html: `<div style="background-color: white; width: 10px; height: 10px; border-radius: 50%; border: 3px solid ${color}; box-shadow: 0 1px 2px rgba(0,0,0,0.4);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
};

const createBridgeIcon = () => {
  return new L.DivIcon({
    className: "clear-icon",
    html: `<div style="background-color: #8b5cf6; width: 16px; height: 16px; border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 10px; font-weight: bold;">J</span></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

function MeasureTool({ isMeasuring, measurePoints, setMeasurePoints }: { isMeasuring: boolean, measurePoints: [number, number][], setMeasurePoints: any }) {
  useMapEvents({
    click(e) {
      if (isMeasuring) {
        setMeasurePoints((prev: [number, number][]) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      }
    }
  });

  if (measurePoints.length === 0) return null;

  return (
    <>
      <Polyline positions={measurePoints} color="#f97316" weight={4} dashArray="5, 10" />
      {measurePoints.map((pt, idx) => (
        <Marker 
          key={idx} 
          position={pt} 
          icon={new L.DivIcon({
            className: "clear-icon",
            html: `<div style="background-color: #f97316; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })}
        />
      ))}
    </>
  );
}

export default function Map({ searchedCoord, focusedFeatureCoord, roadGeoJson, baseRoad, staLabels, bridges, reports }: any) {
  const center: [number, number] = [-2.919, 103.463];
  
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [myLocationTrigger, setMyLocationTrigger] = useState(0);
  
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [weather, setWeather] = useState<any>(null);

  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);

  const totalDistance = measurePoints.length > 1 
    ? measurePoints.reduce((acc, pt, i) => {
        if (i === 0) return 0;
        return acc + getDistanceInMeters(measurePoints[i-1][0], measurePoints[i-1][1], pt[0], pt[1]);
      }, 0)
    : 0;

  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=-2.919&longitude=103.463&current_weather=true")
      .then(res => res.json())
      .then(data => {
        if (data.current_weather) {
          setWeather(data.current_weather);
        }
      })
      .catch(console.error);
  }, []);

  // When searchedCoord props update from parent (Sidebar), trigger popup
  useEffect(() => {
    if (searchedCoord) setSearchTrigger(Date.now());
  }, [searchedCoord]);

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMyLocation([position.coords.latitude, position.coords.longitude]);
          setMyLocationTrigger(Date.now());
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
      let lat = 0, lng = 0;
      if (feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
        const mid = Math.floor(feature.geometry.coordinates.length / 2);
        lat = feature.geometry.coordinates[mid][1];
        lng = feature.geometry.coordinates[mid][0];
      }
      
      layer.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">${feature.properties.name}</h3>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #555;">${feature.properties.description || ''}</p>
          ${lat !== 0 ? `
            <div style="display: flex; gap: 8px;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="flex: 1; text-align: center; background: #eff6ff; color: #2563eb; text-decoration: none; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: bold; border: 1px solid #bfdbfe;">🧭 Rute</a>
              <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}" target="_blank" style="flex: 1; text-align: center; background: #f8fafc; color: #0f172a; text-decoration: none; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: bold; border: 1px solid #e2e8f0;">📸 Street View</a>
            </div>
          ` : ''}
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

        <FeatureFocusController focusedFeatureCoord={focusedFeatureCoord} />

        <DynamicMarker coord={searchedCoord} isMyLocation={false} roadGeoJson={roadGeoJson} staLabels={staLabels} triggerTime={searchTrigger} />
        <DynamicMarker coord={myLocation} isMyLocation={true} roadGeoJson={roadGeoJson} staLabels={staLabels} triggerTime={myLocationTrigger} />

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

        {bridges && (
          <GeoJSON
            data={bridges}
            pointToLayer={(feature, latlng) => {
              const pt: [number, number] = [(latlng as any).lat, (latlng as any).lng];
              const closest = findClosestSTA(pt, staLabels);
              const staText = closest ? closest.name : "-";

              return L.marker(latlng, { icon: createBridgeIcon() })
                .bindTooltip(
                  `<span style="font-weight:bold;">${feature.properties.name}</span>`,
                  { permanent: false, direction: 'top', offset: [0, -6] }
                )
                .bindPopup(`
                  <div style="font-family: sans-serif; padding: 4px;">
                    <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #8b5cf6; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">🌉 Jembatan ${feature.properties.name}</h3>
                    <p style="margin: 0 0 2px 0; font-size: 11px;"><strong>No Jembatan:</strong> ${feature.properties.no}</p>
                    <p style="margin: 0 0 2px 0; font-size: 11px;"><strong>Posisi STA:</strong> <span style="background: #f3e8ff; padding: 1px 4px; border-radius: 4px; color: #7e22ce;">${staText}</span></p>
                    <p style="margin: 0 0 2px 0; font-size: 11px;"><strong>Panjang:</strong> ${feature.properties.panjang} m</p>
                    <p style="margin: 0 0 2px 0; font-size: 11px;"><strong>Lebar:</strong> ${feature.properties.lebar} m</p>
                    <p style="margin: 0 0 8px 0; font-size: 11px;"><strong>Thn Bangun:</strong> ${feature.properties.tahun || '-'}</p>
                    <div style="display: flex; gap: 8px;">
                      <a href="https://www.google.com/maps/dir/?api=1&destination=${(latlng as any).lat},${(latlng as any).lng}" target="_blank" style="flex: 1; text-align: center; background: #faf5ff; color: #9333ea; text-decoration: none; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: bold; border: 1px solid #e9d5ff;">🧭 Rute</a>
                      <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${(latlng as any).lat},${(latlng as any).lng}" target="_blank" style="flex: 1; text-align: center; background: #f8fafc; color: #0f172a; text-decoration: none; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: bold; border: 1px solid #e2e8f0;">📸 Street View</a>
                    </div>
                  </div>
                `);
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

        {reports && reports.map((r: any) => (
          <Marker 
            key={r.id} 
            position={[r.lat, r.lng]} 
            icon={new L.DivIcon({
              className: "report-icon",
              html: `<div style="background-color: #f43f5e; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); font-weight: bold; font-size: 14px;">!</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
              popupAnchor: [0, -14]
            })}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', padding: '4px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 'bold', color: '#e11d48', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>🚨 Laporan: {r.type}</h3>
                {r.imageUrl && (
                  <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                    <img src={r.imageUrl} alt="Bukti Laporan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <p style={{ margin: '0 0 2px 0', fontSize: '11px', whiteSpace: 'pre-wrap' }}><strong>Deskripsi:</strong> {r.description}</p>
                <p style={{ margin: '0 0 6px 0', fontSize: '11px' }}><strong>Status:</strong> <span style={{ background: r.status === 'pending' ? '#fef3c7' : '#d1fae5', color: r.status === 'pending' ? '#b45309' : '#047857', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontSize: '9px', fontWeight: 'bold' }}>{r.status}</span></p>
                <p style={{ margin: '0 0 8px 0', fontSize: '10px', color: '#64748b' }}>Waktu: {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : 'Baru saja'}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`} target="_blank" style={{ flex: 1, textAlign: 'center', background: '#fff1f2', color: '#e11d48', textDecoration: 'none', padding: '6px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #fecdd3' }}>🧭 Rute</a>
                  <a href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${r.lat},${r.lng}`} target="_blank" style={{ flex: 1, textAlign: 'center', background: '#f8fafc', color: '#0f172a', textDecoration: 'none', padding: '6px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>📸 Street View</a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <MeasureTool isMeasuring={isMeasuring} measurePoints={measurePoints} setMeasurePoints={setMeasurePoints} />

      </MapContainer>

      {/* Measurement Tool Toggle */}
      <div className="absolute top-20 right-4 md:right-6 z-[1000]">
        <button 
          onClick={() => {
            setIsMeasuring(!isMeasuring);
            if (isMeasuring) setMeasurePoints([]);
          }}
          className={`p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border flex items-center justify-center transition-all group ${isMeasuring ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'}`}
          title="Alat Ukur Jarak"
        >
          <Ruler size={24} />
        </button>
      </div>

      {/* Measurement Status Panel */}
      {isMeasuring && (
        <div className="absolute bottom-28 right-4 md:right-6 z-[1000] bg-white rounded-2xl shadow-xl border border-slate-200 p-4 min-w-[200px]">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Jarak</p>
          <p className="text-2xl font-black text-orange-600 mb-3">
            {totalDistance > 1000 ? (totalDistance / 1000).toFixed(2) + ' km' : totalDistance.toFixed(0) + ' m'}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setMeasurePoints((prev) => prev.slice(0, -1))}
              disabled={measurePoints.length === 0}
              className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 disabled:opacity-50"
            >
              Undo
            </button>
            <button 
              onClick={() => setMeasurePoints([])}
              disabled={measurePoints.length === 0}
              className="flex items-center justify-center bg-rose-100 text-rose-600 px-3 py-2 rounded-lg hover:bg-rose-200 disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Weather Widget */}
      {weather && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-4 z-[1000] bg-white/90 backdrop-blur shadow-lg rounded-2xl p-2 px-4 border border-slate-200 flex items-center gap-3">
          {weather.weathercode > 50 ? <CloudRain size={24} className="text-blue-500" /> : weather.weathercode > 2 ? <Cloud size={24} className="text-slate-400" /> : <Sun size={24} className="text-amber-500" />}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Cuaca Proyek</p>
            <p className="text-sm font-black text-slate-800">{weather.temperature}°C</p>
          </div>
        </div>
      )}

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
