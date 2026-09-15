import { MapPin, Activity, CheckCircle, Clock, Search, Navigation, List, Settings, Database, PlusCircle, Filter, PieChart, Info, Camera, Route, Map as MapIcon, Layers, Eye, EyeOff } from "lucide-react";
import { useState, useMemo } from "react";

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

function calculateFeatureLength(feature: any) {
  if (feature.geometry.type !== 'LineString') return 0;
  let totalLength = 0;
  const coords = feature.geometry.coordinates;
  for (let i = 0; i < coords.length - 1; i++) {
    totalLength += getDistanceInMeters(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
  }
  return totalLength;
}

export default function Sidebar({ 
  onSearchCoord, 
  roadGeoJson, 
  baseRoad,
  bridges,
  staLabels,
  onFeatureClick,
  activeDatabase,
  setActiveDatabase,
  showBridges, setShowBridges,
  showRoads, setShowRoads,
  showSta, setShowSta,
  showBaseRoad, setShowBaseRoad
}: { 
  onSearchCoord: (coord: [number, number]) => void,
  roadGeoJson: any,
  baseRoad: any,
  bridges: any,
  staLabels: any,
  onFeatureClick: (coord: [number, number]) => void,
  activeDatabase: string,
  setActiveDatabase: (db: string) => void,
  showBridges: boolean, setShowBridges: (v: boolean) => void,
  showRoads: boolean, setShowRoads: (v: boolean) => void,
  showSta: boolean, setShowSta: (v: boolean) => void,
  showBaseRoad: boolean, setShowBaseRoad: (v: boolean) => void
}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [staInput, setStaInput] = useState("");
  const [searchMode, setSearchMode] = useState<"gps" | "sta">("gps");
  const [listFilter, setListFilter] = useState("Semua");
  const [listMode, setListMode] = useState<"jalan" | "jembatan">("jalan");
  const [bridgeSearch, setBridgeSearch] = useState("");
  const [staRuasFilter, setStaRuasFilter] = useState("semua");

  const handlings = roadGeoJson ? roadGeoJson.features.filter((f: any) => f.geometry.type === 'LineString') : [];
  
  const groupedHandlings: Record<string, any[]> = {};
  const lengthStats: Record<string, number> = {
    "Total Penanganan": 0,
    "Rekonstruksi": 0,
    "Rehab Mayor": 0,
    "Rehab Minor": 0,
    "Pemeliharaan Rutin / Lainnya": 0
  };

  handlings.forEach((h: any) => {
    let type = "Lainnya";
    const color = h.properties.stroke;
    if (color === "#ff0000") type = "Rekonstruksi";
    else if (color === "#ffff00") type = "Rehab Mayor";
    else if (color === "#00ff00") type = "Rehab Minor";
    else if (color === "#0000ff") type = "Pemeliharaan Rutin / Lainnya";

    if (!groupedHandlings[type]) groupedHandlings[type] = [];
    groupedHandlings[type].push(h);

    const len = calculateFeatureLength(h);
    lengthStats[type] += len;
    lengthStats["Total Penanganan"] += len;
  });

  const totalBaseRoadLength = useMemo(() => {
    if (!baseRoad) return 0;
    let len = 0;
    baseRoad.features.forEach((f: any) => {
      len += calculateFeatureLength(f);
    });
    return len;
  }, [baseRoad]);

  const totalBridgeLength = useMemo(() => {
    if (!bridges) return 0;
    return bridges.features.reduce((sum: number, f: any) => sum + (f.properties.panjang || 0), 0);
  }, [bridges]);

  const handleSearchGPS = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng)) {
      onSearchCoord([lat, lng]);
    } else {
      alert("Masukkan koordinat yang valid (contoh: Lat -2.9, Lng 103.4)");
    }
  };

  const handleSearchSTA = () => {
    if (!staInput.trim() || !staLabels) return;
    
    // Convert input like "120+500" or "120.5" or "120,5" or "120500" into a float km (e.g., 120.5)
    let searchVal = 0;
    const cleanInput = staInput.toLowerCase().replace(/[^0-9\+\.,]/g, '');
    
    if (cleanInput.includes('+')) {
      const parts = cleanInput.split('+');
      const km = parseFloat(parts[0]) || 0;
      const m = parseFloat(parts[1]) || 0;
      searchVal = km + (m / 1000);
    } else {
      searchVal = parseFloat(cleanInput.replace(',', '.')) || 0;
      // If the number is huge (e.g. 120500 or 39890), it means they typed it entirely in meters.
      // Highway STAs are usually in KM (e.g., 30 to 200). So if > 2000, we assume it's meters.
      if (searchVal > 2000) {
        searchVal = searchVal / 1000;
      }
    }
    
    let closestFeature: any = null;
    let minDiff = Infinity;

    staLabels.features.forEach((f: any) => {
      if (f.geometry.type === 'Point' && f.properties && f.properties.name) {
        
        // Filter by Ruas if specific ruas is selected
        if (staRuasFilter === "034" && (!f.properties.description || !f.properties.description.includes('MANGUN JAYA'))) {
          return;
        }
        if (staRuasFilter === "035" && (!f.properties.description || !f.properties.description.includes('MUARA BELITI'))) {
          return;
        }

        const nameMatch = f.properties.name.match(/[0-9]+(\.[0-9]+)?/);
        if (nameMatch) {
          const featureVal = parseFloat(nameMatch[0]);
          const diff = Math.abs(searchVal - featureVal);
          if (diff < minDiff) {
            minDiff = diff;
            closestFeature = f;
          }
        }
      }
    });

    if (closestFeature && minDiff < 20) { // max diff 20km
      // Use onSearchCoord so it creates a popup marker just like GPS Search
      onSearchCoord([closestFeature.geometry.coordinates[1], closestFeature.geometry.coordinates[0]]);
    } else {
      alert("Patok STA tidak ditemukan atau di luar jangkauan ruas jalan.");
    }
  };

  const handleFeatureClick = (feature: any) => {
    if (feature.geometry.type === 'LineString' && feature.geometry.coordinates.length > 0) {
      const midIdx = Math.floor(feature.geometry.coordinates.length / 2);
      const coord = feature.geometry.coordinates[midIdx];
      onFeatureClick([coord[1], coord[0]]);
    } else if (feature.geometry.type === 'Point') {
      onFeatureClick([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]);
    }
  };

  const availableTypes = ["Semua", ...Object.keys(groupedHandlings)];
  const displayedTypes = listFilter === "Semua" ? Object.keys(groupedHandlings) : [listFilter];

  const filteredBridges = useMemo(() => {
    if (!bridges || !bridges.features) return [];
    if (!bridgeSearch.trim()) return bridges.features;
    return bridges.features.filter((b: any) => 
      b.properties.name?.toLowerCase().includes(bridgeSearch.toLowerCase()) ||
      b.properties.no?.toLowerCase().includes(bridgeSearch.toLowerCase())
    );
  }, [bridges, bridgeSearch]);

  const StatCard = ({ title, count, subtitle, colorClass, icon: Icon }: any) => {
    const [num, unit] = count.toString().split(' ');
    return (
      <div className={`bg-white p-3.5 rounded-2xl border shadow-sm transition-all hover:shadow-md flex flex-col ${colorClass}`}>
        <div className="flex justify-between items-start mb-2">
          <p className="text-[10px] font-black uppercase tracking-wider opacity-80 leading-tight pr-2">{title}</p>
          <div className="p-1.5 rounded-lg bg-current opacity-20 shrink-0">
            <Icon size={14} className="text-current" style={{ opacity: 1 }} />
          </div>
        </div>
        <div className="flex items-baseline gap-1 mt-auto">
          <p className="text-2xl font-black tracking-tight leading-none">{num}</p>
          {unit && <p className="text-xs font-bold opacity-80">{unit}</p>}
        </div>
        {subtitle && <p className="text-[10px] font-semibold opacity-60 mt-1.5">{subtitle}</p>}
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-slate-50 border-r border-slate-200 flex flex-col shadow-2xl relative">
      
      {/* Header */}
      <div className="p-5 bg-slate-900 text-white relative overflow-hidden hidden md:block shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
        <h1 className="text-2xl font-black tracking-tight">PETA PPK <span className="text-blue-400">1.4</span></h1>
        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">PPK 1.4 BBPJN Sumsel</p>
      </div>

      {/* Modern Pill Tabs */}
      <div className="px-4 pt-4 pb-2 bg-white md:bg-slate-50 shrink-0 shadow-sm md:shadow-none z-30">
        <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', icon: PieChart, label: 'Dash' },
            { id: 'list', icon: List, label: 'Daftar' },
            { id: 'search', icon: Search, label: 'Cari' },
            { id: 'settings', icon: Settings, label: 'Sistem' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`flex-1 flex items-center justify-center py-2 px-2 md:px-3 rounded-lg text-[10px] md:text-xs font-bold transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <tab.icon size={14} className="md:mr-1.5 mb-1 md:mb-0 block md:inline mx-auto" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50 relative">
        
        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="p-4 animate-in fade-in duration-300">
            
            {/* Main Road Length Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-md text-white mb-6 relative overflow-hidden">
              <Route className="absolute right-[-20px] bottom-[-20px] w-32 h-32 text-white opacity-10" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-1">Panjang Total Ruas Jalan</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black tracking-tight">{(totalBaseRoadLength / 1000).toFixed(2)}</span>
                <span className="text-lg font-bold text-blue-200">KM</span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center text-xs">
                <span className="font-medium text-blue-100">Sedang ditangani:</span>
                <span className="font-bold bg-white/20 px-2 py-0.5 rounded-full">{(lengthStats["Total Penanganan"] / 1000).toFixed(2)} KM ({(lengthStats["Total Penanganan"] / totalBaseRoadLength * 100).toFixed(1)}%)</span>
              </div>
            </div>

            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Rincian Infrastruktur</h2>
            <div className="grid grid-cols-2 gap-3 mb-8">
              <StatCard 
                title="Total Jembatan" 
                count={`${bridges?.features?.length || 0}`} 
                subtitle={`Total Panjang: ${totalBridgeLength.toFixed(1)} m`}
                colorClass="text-purple-600 border-purple-100" 
                icon={Route} 
              />
              <StatCard 
                title="Rekonstruksi" 
                count={`${(lengthStats["Rekonstruksi"] / 1000).toFixed(2)} KM`} 
                subtitle={`${groupedHandlings["Rekonstruksi"]?.length || 0} Lokasi`}
                colorClass="text-red-600 border-red-100" 
                icon={MapPin} 
              />
              <StatCard 
                title="Rehab Mayor" 
                count={`${(lengthStats["Rehab Mayor"] / 1000).toFixed(2)} KM`} 
                subtitle={`${groupedHandlings["Rehab Mayor"]?.length || 0} Lokasi`}
                colorClass="text-amber-500 border-amber-100" 
                icon={CheckCircle} 
              />
              <StatCard 
                title="Rehab Minor" 
                count={`${(lengthStats["Rehab Minor"] / 1000).toFixed(2)} KM`} 
                subtitle={`${groupedHandlings["Rehab Minor"]?.length || 0} Lokasi`}
                colorClass="text-emerald-600 border-emerald-100" 
                icon={Activity} 
              />
            </div>

            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Legenda Warna Peta</h2>
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center text-sm font-semibold text-slate-700"><div className="flex items-center justify-center w-4 h-4 rounded-[4px] bg-[#8b5cf6] mr-3 shadow-sm ring-2 ring-purple-100 text-white text-[8px] font-bold">J</div> Jembatan</div>
              <div className="flex items-center text-sm font-semibold text-slate-700"><div className="w-4 h-4 rounded-full bg-[#ff0000] mr-3 shadow-sm ring-2 ring-red-100"></div> Rekonstruksi</div>
              <div className="flex items-center text-sm font-semibold text-slate-700"><div className="w-4 h-4 rounded-full bg-[#ffff00] mr-3 shadow-sm ring-2 ring-yellow-100"></div> Rehab Mayor</div>
              <div className="flex items-center text-sm font-semibold text-slate-700"><div className="w-4 h-4 rounded-full bg-[#00ff00] mr-3 shadow-sm ring-2 ring-green-100"></div> Rehab Minor</div>
              <div className="flex items-center text-xs font-semibold text-slate-400 mt-3 pt-3 border-t border-slate-100"><div className="w-4 h-4 rounded-full bg-slate-400 mr-3 opacity-50 border-2 border-dashed border-slate-600"></div> Ruas Jalan Dasar (Panduan)</div>
            </div>
          </div>
        )}

        {/* LIST TAB */}
        {activeTab === "list" && (
          <div className="animate-in fade-in duration-300 relative">
            <div className="sticky top-0 bg-slate-50/95 backdrop-blur-md p-4 pb-4 z-20 border-b border-slate-200/60 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)]">
              
              {/* Segmented Control for Jalan vs Jembatan */}
              <div className="flex bg-slate-200/50 p-1 rounded-xl">
                <button 
                  onClick={() => setListMode("jalan")} 
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${listMode === "jalan" ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Penanganan Jalan
                </button>
                <button 
                  onClick={() => setListMode("jembatan")} 
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${listMode === "jembatan" ? "bg-white text-purple-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Infrastruktur Jembatan
                </button>
              </div>

              {listMode === "jalan" && (
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm mt-3">
                  <div className="pl-3 text-slate-400"><Filter size={16} /></div>
                  <select 
                    value={listFilter}
                    onChange={(e) => setListFilter(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-slate-700 py-2.5 px-3 focus:outline-none appearance-none cursor-pointer"
                  >
                    {availableTypes.map(t => (
                      <option key={t} value={t}>
                        {t === "Semua" ? "Tampilkan Semua Kelas" : `${t} (${groupedHandlings[t]?.length || 0})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {listMode === "jembatan" && (
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm mt-3 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-400 transition-all">
                  <div className="pl-3 text-slate-400"><Search size={16} /></div>
                  <input 
                    type="text" 
                    placeholder="Cari nama jembatan..." 
                    value={bridgeSearch}
                    onChange={(e) => setBridgeSearch(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-slate-700 py-2.5 px-3 focus:outline-none placeholder-slate-400"
                  />
                </div>
              )}
            </div>
            
            <div className="p-4 pt-2">
              {listMode === "jalan" && (
                <div className="space-y-6">
                  {displayedTypes.map(type => {
                    let borderColor = "border-slate-300";
                    let badgeColor = "bg-slate-100 text-slate-600";
                    if (type === "Rekonstruksi") { borderColor = "border-red-500"; badgeColor = "bg-red-50 text-red-700"; }
                    if (type === "Rehab Mayor") { borderColor = "border-amber-400"; badgeColor = "bg-amber-50 text-amber-700"; }
                    if (type === "Rehab Minor") { borderColor = "border-emerald-500"; badgeColor = "bg-emerald-50 text-emerald-700"; }
                    
                    return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{type}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                          {groupedHandlings[type]?.length || 0} Lokasi
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {groupedHandlings[type]?.map((h: any, idx: number) => {
                          const len = calculateFeatureLength(h);
                          let lat = 0, lng = 0;
                          if (h.geometry.coordinates.length > 0) {
                            const mid = Math.floor(h.geometry.coordinates.length / 2);
                            lat = h.geometry.coordinates[mid][1];
                            lng = h.geometry.coordinates[mid][0];
                          }
                          return (
                          <div 
                            key={idx} 
                            onClick={() => handleFeatureClick(h)}
                            className={`bg-white p-3.5 border-l-4 ${borderColor} border-y border-r border-slate-200 rounded-xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group`}
                          >
                            <div className="flex justify-between items-start">
                              <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors flex-1">{h.properties.name}</p>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md ml-2 shrink-0">{(len).toFixed(0)} meter</span>
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">{h.properties.description || 'Tidak ada deskripsi'}</p>
                            
                            {/* Navigation Link for Penanganan */}
                            {lat !== 0 && (
                              <div className="mt-2 text-right">
                                <a 
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                >
                                  <MapIcon size={12} className="mr-1.5" />
                                  Navigasi ke Lokasi
                                </a>
                              </div>
                            )}
                          </div>
                        )})}
                        {(!groupedHandlings[type] || groupedHandlings[type].length === 0) && (
                          <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center">
                            <p className="text-xs font-medium text-slate-400">Tidak ada data penanganan.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}

              {listMode === "jembatan" && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {bridgeSearch.trim() ? "Hasil Pencarian" : "Daftar Jembatan"}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700">
                        {filteredBridges.length} Unit
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {filteredBridges.map((b: any, idx: number) => {
                        const lat = b.geometry.coordinates[1];
                        const lng = b.geometry.coordinates[0];
                        return (
                        <div 
                          key={idx} 
                          onClick={() => handleFeatureClick(b)}
                          className="bg-white p-3.5 border-l-4 border-purple-500 border-y border-r border-slate-200 rounded-xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group relative overflow-hidden"
                        >
                          <div className="absolute right-[-10px] top-[-10px] opacity-5">
                            <Route size={64} />
                          </div>
                          <div className="flex justify-between items-start relative z-10">
                            <p className="font-bold text-slate-800 text-sm group-hover:text-purple-600 transition-colors flex-1">{b.properties.name}</p>
                            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded-md ml-2 shrink-0">{b.properties.panjang} m</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 relative z-10">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Nomor Jembatan</p>
                              <p className="text-xs font-semibold text-slate-700">{b.properties.no}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Dimensi Lebar</p>
                              <p className="text-xs font-semibold text-slate-700">{b.properties.lebar} meter</p>
                            </div>
                          </div>
                          {/* Navigation Link */}
                          <div className="mt-2 text-right relative z-10">
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center text-[10px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              <MapIcon size={12} className="mr-1.5" />
                              Navigasi ke Jembatan
                            </a>
                          </div>
                        </div>
                      )})}
                      {filteredBridges.length === 0 && (
                        <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center">
                          <p className="text-xs font-medium text-slate-400">Tidak ada jembatan yang cocok dengan "{bridgeSearch}".</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEARCH TAB */}
        {activeTab === "search" && (
          <div className="p-4 animate-in fade-in duration-300">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
              
              <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6">
                <button 
                  onClick={() => setSearchMode("gps")} 
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${searchMode === "gps" ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Koordinat GPS
                </button>
                <button 
                  onClick={() => setSearchMode("sta")} 
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${searchMode === "sta" ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Patok STA
                </button>
              </div>

              {searchMode === "gps" ? (
                <>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <Navigation size={20} />
                  </div>
                  <h2 className="text-lg font-black text-slate-800 mb-1">Lacak Koordinat</h2>
                  <p className="text-xs font-medium text-slate-500 mb-5 leading-relaxed">Masukkan titik Latitude & Longitude untuk melihat posisinya di peta dan mendeteksi penanganan.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Latitude (Y)</label>
                      <input type="number" value={latInput} onChange={(e) => setLatInput(e.target.value)} placeholder="-2.919" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Longitude (X)</label>
                      <input type="number" value={lngInput} onChange={(e) => setLngInput(e.target.value)} placeholder="103.463" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                    </div>
                    <button onClick={handleSearchGPS} className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all flex justify-center items-center text-sm mt-2">
                      <Search size={18} className="mr-2" /> Cari Koordinat
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                    <MapPin size={20} />
                  </div>
                  <h2 className="text-lg font-black text-slate-800 mb-1">Cari Patok STA</h2>
                  <p className="text-xs font-medium text-slate-500 mb-5 leading-relaxed">Masukkan angka STA (contoh: 120 atau 120+500) untuk menemukan lokasi perkiraannya di peta.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Pilih Ruas</label>
                      <select 
                        value={staRuasFilter}
                        onChange={(e) => setStaRuasFilter(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                      >
                        <option value="semua">Semua Ruas</option>
                        <option value="034">Ruas 034: Mangunjaya - Bts. Muba/Mura</option>
                        <option value="035">Ruas 035: Bts. Muba/Mura - Muara Beliti</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Nomor STA</label>
                      <div className="flex items-center">
                        <span className="bg-slate-100 border border-r-0 border-slate-200 px-3 py-3 rounded-l-xl text-sm font-bold text-slate-500">STA</span>
                        <input type="text" value={staInput} onChange={(e) => setStaInput(e.target.value)} placeholder="120+500" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-r-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
                      </div>
                    </div>
                    <button onClick={handleSearchSTA} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all flex justify-center items-center text-sm mt-2">
                      <Search size={18} className="mr-2" /> Temukan STA
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-start p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <Info size={16} className="text-blue-500 mr-2 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-blue-800 leading-relaxed">Pencarian patok STA ini akan mencari data koordinat terdekat dari titik yang diketik.</p>
            </div>
          </div>
        )}



        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="p-4 animate-in fade-in duration-300">
            
            {/* Map Layers Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <Layers size={16} />
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Filter Layer Peta</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Tampilkan Penanganan Jalan</span>
                  <button onClick={() => setShowRoads(!showRoads)} className={`p-1.5 rounded-lg transition-colors ${showRoads ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                    {showRoads ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Tampilkan Jembatan</span>
                  <button onClick={() => setShowBridges(!showBridges)} className={`p-1.5 rounded-lg transition-colors ${showBridges ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-400'}`}>
                    {showBridges ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Tampilkan Label STA</span>
                  <button onClick={() => setShowSta(!showSta)} className={`p-1.5 rounded-lg transition-colors ${showSta ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                    {showSta ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Tampilkan Jalan Panduan</span>
                  <button onClick={() => setShowBaseRoad(!showBaseRoad)} className={`p-1.5 rounded-lg transition-colors ${showBaseRoad ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
                    {showBaseRoad ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Database Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center mr-3">
                  <Database size={16} />
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Database Ruas</h2>
              </div>
              <select 
                value={activeDatabase}
                onChange={(e) => setActiveDatabase(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="db1">Mangunjaya - M. Beliti (2026)</option>
                <option value="db2">Sekayu - Mangunjaya (Contoh)</option>
                <option value="db3">M. Beliti - Lubuklinggau (Contoh)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
