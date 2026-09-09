"use client";

import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

// Dynamically import map to avoid SSR issues with Leaflet
const MapWithNoSSR = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-semibold text-slate-500 tracking-wide">MEMUAT PETA LOKASI...</p>
    </div>
  )
});

export default function Home() {
  const [searchedCoord, setSearchedCoord] = useState<[number, number] | null>(null);
  const [focusedFeatureCoord, setFocusedFeatureCoord] = useState<[number, number] | null>(null);
  
  const [activeDatabase, setActiveDatabase] = useState("db1");
  const [roadGeoJson, setRoadGeoJson] = useState<any>(null);
  const [baseRoad, setBaseRoad] = useState<any>(null);
  const [staLabels, setStaLabels] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setRoadGeoJson(null);
    setBaseRoad(null);
    
    fetch('/base_road.geojson').then(res => res.json()).then(setBaseRoad).catch(console.error);
    fetch('/fixed_road_line.geojson').then(res => res.json()).then(setRoadGeoJson).catch(console.error);
    fetch('/sta_labels_full.geojson').then(res => res.json()).then(setStaLabels).catch(console.error);
  }, [activeDatabase]);

  return (
    <main className="flex h-[100dvh] w-full bg-slate-100 overflow-hidden relative font-sans">
      
      {/* Mobile Floating Header */}
      <div className="md:hidden absolute top-4 left-4 right-4 z-[400] flex justify-between items-center bg-white/90 backdrop-blur-md shadow-lg rounded-2xl p-3 border border-slate-200/50">
        <div>
          <h1 className="text-base font-black text-slate-800 tracking-tight">SI-MANTAP <span className="text-blue-600">1.4</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase">M. Beliti - Mangunjaya</p>
        </div>
        <button 
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="bg-blue-600 text-white p-2 rounded-xl shadow-md active:scale-95 transition-transform"
        >
          {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Container */}
      <div className={`
        absolute md:relative z-[500] md:z-10 h-full
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        transition-transform duration-300 ease-in-out
        w-[85%] sm:w-96 shrink-0
      `}>
        <Sidebar 
          onSearchCoord={(coord) => {
            setSearchedCoord(coord);
            if (window.innerWidth < 768) setIsMobileSidebarOpen(false);
          }} 
          roadGeoJson={roadGeoJson}
          onFeatureClick={(coord) => {
            setFocusedFeatureCoord(coord);
            if (window.innerWidth < 768) setIsMobileSidebarOpen(false);
          }}
          activeDatabase={activeDatabase}
          setActiveDatabase={setActiveDatabase}
        />
      </div>

      {/* Mobile Backdrop overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="md:hidden absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[450]"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Map Area */}
      <div className="flex-1 h-full relative z-0">
        <MapWithNoSSR 
          searchedCoord={searchedCoord} 
          focusedFeatureCoord={focusedFeatureCoord}
          roadGeoJson={roadGeoJson}
          baseRoad={baseRoad}
          staLabels={staLabels}
        />
      </div>

    </main>
  );
}
