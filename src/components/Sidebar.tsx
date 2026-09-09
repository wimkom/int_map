import { MapPin, Activity, CheckCircle, Clock, Search, Navigation, List, Settings, Database, PlusCircle, Filter, PieChart, Info, Camera, Route } from "lucide-react";
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
  onFeatureClick,
  activeDatabase,
  setActiveDatabase
}: { 
  onSearchCoord: (coord: [number, number]) => void,
  roadGeoJson: any,
  baseRoad: any,
  onFeatureClick: (coord: [number, number]) => void,
  activeDatabase: string,
  setActiveDatabase: (db: string) => void
}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [listFilter, setListFilter] = useState("Semua");

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

  const handleSearch = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng)) {
      onSearchCoord([lat, lng]);
    } else {
      alert("Masukkan koordinat yang valid (contoh: Lat -2.9, Lng 103.4)");
    }
  };

  const handleFeatureClick = (feature: any) => {
    if (feature.geometry.type === 'LineString' && feature.geometry.coordinates.length > 0) {
      const midIdx = Math.floor(feature.geometry.coordinates.length / 2);
      const coord = feature.geometry.coordinates[midIdx];
      onFeatureClick([coord[1], coord[0]]);
    }
  };

  const availableTypes = ["Semua", ...Object.keys(groupedHandlings)];
  const displayedTypes = listFilter === "Semua" ? Object.keys(groupedHandlings) : [listFilter];

  const StatCard = ({ title, count, subtitle, colorClass, icon: Icon }: any) => (
    <div className={`bg-white p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md ${colorClass}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="p-2.5 rounded-xl bg-current opacity-20">
          <Icon size={20} className="text-current" style={{ opacity: 1 }} />
        </div>
        <p className="text-2xl font-black">{count}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{title}</p>
        {subtitle && <p className="text-[10px] font-semibold opacity-60 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-slate-50 border-r border-slate-200 flex flex-col shadow-2xl relative">
      
      {/* Header */}
      <div className="p-5 bg-slate-900 text-white relative overflow-hidden hidden md:block shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
        <h1 className="text-2xl font-black tracking-tight">SI-MANTAP <span className="text-blue-400">1.4</span></h1>
        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">PPK 1.4 BBPJN Sumsel</p>
      </div>

      {/* Modern Pill Tabs */}
      <div className="px-4 pt-4 pb-2 bg-white md:bg-slate-50 shrink-0">
        <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', icon: PieChart, label: 'Dash' },
            { id: 'list', icon: List, label: 'Daftar' },
            { id: 'search', icon: Search, label: 'Cari' },
            { id: 'report', icon: PlusCircle, label: 'Laporan' },
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
      <div className="p-4 flex-1 overflow-y-auto no-scrollbar bg-slate-50">
        
        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in duration-300">
            
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

            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Rincian Penanganan</h2>
            <div className="grid grid-cols-2 gap-3 mb-8">
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
              <StatCard 
                title="Lainnya" 
                count={`${(lengthStats["Pemeliharaan Rutin / Lainnya"] / 1000).toFixed(2)} KM`} 
                subtitle={`${groupedHandlings["Pemeliharaan Rutin / Lainnya"]?.length || 0} Lokasi`}
                colorClass="text-blue-600 border-blue-100" 
                icon={Clock} 
              />
            </div>

            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Legenda Warna</h2>
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center text-sm font-semibold text-slate-700"><div className="w-4 h-4 rounded-full bg-[#ff0000] mr-3 shadow-sm ring-2 ring-red-100"></div> Rekonstruksi</div>
              <div className="flex items-center text-sm font-semibold text-slate-700"><div className="w-4 h-4 rounded-full bg-[#ffff00] mr-3 shadow-sm ring-2 ring-yellow-100"></div> Rehab Mayor</div>
              <div className="flex items-center text-sm font-semibold text-slate-700"><div className="w-4 h-4 rounded-full bg-[#00ff00] mr-3 shadow-sm ring-2 ring-green-100"></div> Rehab Minor</div>
              <div className="flex items-center text-sm font-semibold text-slate-700"><div className="w-4 h-4 rounded-full bg-[#0000ff] mr-3 shadow-sm ring-2 ring-blue-100"></div> Rutin / Lainnya</div>
              <div className="flex items-center text-xs font-semibold text-slate-400 mt-3 pt-3 border-t border-slate-100"><div className="w-4 h-4 rounded-full bg-slate-400 mr-3 opacity-50 border-2 border-dashed border-slate-600"></div> Ruas Jalan Dasar (Panduan)</div>
            </div>
          </div>
        )}

        {/* LIST TAB */}
        {activeTab === "list" && (
          <div className="animate-in fade-in duration-300">
            <div className="sticky top-0 bg-slate-50 pb-3 z-10">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <div className="pl-3 text-slate-400"><Filter size={16} /></div>
                <select 
                  value={listFilter}
                  onChange={(e) => setListFilter(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-slate-700 py-2.5 px-3 focus:outline-none appearance-none"
                >
                  {availableTypes.map(t => (
                    <option key={t} value={t}>
                      {t === "Semua" ? "Tampilkan Semua Kelas" : `${t} (${groupedHandlings[t]?.length || 0})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-6 mt-2">
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
          </div>
        )}

        {/* SEARCH TAB */}
        {activeTab === "search" && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Search size={24} />
              </div>
              <h2 className="text-lg font-black text-slate-800 mb-1">Lacak Koordinat</h2>
              <p className="text-xs font-medium text-slate-500 mb-5 leading-relaxed">Masukkan titik GPS untuk mendeteksi apakah lokasi tersebut masuk ke dalam area penanganan tahun ini.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Latitude (Y)</label>
                  <input type="number" value={latInput} onChange={(e) => setLatInput(e.target.value)} placeholder="-2.919" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Longitude (X)</label>
                  <input type="number" value={lngInput} onChange={(e) => setLngInput(e.target.value)} placeholder="103.463" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                </div>
                <button onClick={handleSearch} className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all flex justify-center items-center text-sm mt-2">
                  <Navigation size={18} className="mr-2" /> Pindai Lokasi
                </button>
              </div>
            </div>
            
            <div className="flex items-start p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <Info size={16} className="text-blue-500 mr-2 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-blue-800 leading-relaxed">Sistem mendeteksi radius 50 meter dari titik yang Anda masukkan untuk memvalidasi area kerja.</p>
            </div>
          </div>
        )}

        {/* REPORT TAB */}
        {activeTab === "report" && (
          <div className="animate-in fade-in duration-300">
            {/* Field Input Concept */}
            <div className="bg-gradient-to-b from-blue-600 to-blue-800 p-5 rounded-2xl shadow-lg text-white mb-6">
              <div className="flex items-center mb-3">
                <PlusCircle size={20} className="text-blue-200 mr-2" />
                <h2 className="text-sm font-black uppercase tracking-widest">Laporan Lapangan</h2>
              </div>
              <p className="text-[11px] font-medium text-blue-100 mb-5 leading-relaxed">Pembaruan progres atau pelaporan kerusakan jalan langsung dari titik lokasi.</p>
              
              <div className="space-y-3 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-blue-200 mb-1.5 block uppercase">STA Awal</label>
                    <input type="text" placeholder="120+200" className="w-full px-3 py-2.5 bg-white/90 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-blue-200 mb-1.5 block uppercase">STA Akhir</label>
                    <input type="text" placeholder="120+400" className="w-full px-3 py-2.5 bg-white/90 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none" />
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-blue-200 mb-1.5 block uppercase">Jenis Laporan</label>
                  <select className="w-full px-3 py-2.5 bg-white/90 rounded-lg text-xs font-bold text-slate-800 focus:outline-none appearance-none">
                    <option>Progres Pengaspalan</option>
                    <option>Laporan Lubang (Pothole)</option>
                    <option>Pekerjaan Pemeliharaan Rutin</option>
                    <option>Kendala Cuaca / Lapangan</option>
                  </select>
                </div>

                <div className="border-2 border-dashed border-blue-300/50 p-4 mt-2 text-center text-xs font-bold text-white rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2">
                  <Camera size={20} className="opacity-70" />
                  Ambil Foto Kondisi
                </div>

                <button className="w-full bg-white text-blue-700 text-sm py-3 rounded-xl font-black shadow-lg hover:bg-slate-50 transition-colors mt-3">
                  Kirim Laporan
                </button>
              </div>
            </div>
            
            <div className="flex items-start p-4 bg-slate-100 rounded-2xl border border-slate-200">
              <Info size={16} className="text-slate-500 mr-2 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-slate-600 leading-relaxed">Laporan akan otomatis disinkronkan ke database pusat dan muncul sebagai titik baru di peta (Fitur segera hadir).</p>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="animate-in fade-in duration-300">
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
