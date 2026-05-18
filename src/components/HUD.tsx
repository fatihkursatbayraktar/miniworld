"use client";
 
import React, { useState, useEffect } from "react";
import { HelpCircle, Coffee, Compass, Gift, Heart } from "lucide-react";
import { cozyAudio } from "@/utils/audio";
 
export default function HUD() {
  const [isRaining, setIsRaining] = useState(true);
  const [atmosphere, setAtmosphere] = useState("rainy"); // "rainy" | "sunny" | "sunset"
  const [playMode, setPlayMode] = useState("ai");
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [clockTime, setClockTime] = useState({ hour: 12, minute: 0 });
 
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mode = (window as any).phaserGame?.registry?.get("playMode") || "ai";
      setPlayMode(mode);
 
      // Check partner connectivity periodically and update clockTime state
      const interval = setInterval(() => {
        const phaserGame = (window as any).phaserGame;
        if (phaserGame) {
          const mainScene = phaserGame.scene.getScene("MainScene");
          if (mainScene && mainScene.scene.isActive()) {
            if (mode === "network") {
              const active = mainScene.partner && (Date.now() - (mainScene.partner as any).lastActiveTime < 5000);
              setPartnerConnected(active);
            }
          }
        }
 
        const clock = (window as any).gameClock;
        if (clock) {
          setClockTime({ hour: clock.hour, minute: clock.minute });
        }
      }, 500);
 
      return () => clearInterval(interval);
    }
  }, []);
 
  // Toggle rainfall particle system
  const handleToggleRain = () => {
    cozyAudio.playClick();
    const nextRain = !isRaining;
    setIsRaining(nextRain);
 
    const phaserGame = (window as any).phaserGame;
    if (phaserGame) {
      const mainScene = phaserGame.scene.getScene("MainScene");
      if (mainScene && mainScene.scene.isActive()) {
        mainScene.weatherSystem.toggleRain();
      }
    }
  };
 
  const handleAtmosphereChange = (mode: string) => {
    cozyAudio.playClick();
    setAtmosphere(mode);
 
    const phaserGame = (window as any).phaserGame;
    if (phaserGame) {
      const mainScene = phaserGame.scene.getScene("MainScene");
      if (mainScene && mainScene.scene.isActive()) {
        if (typeof (mainScene as any).setCozyAtmosphere === "function") {
          (mainScene as any).setCozyAtmosphere(mode);
        }
      }
    }
  };
 
  // Tactile shortcuts for mobile/touch screen players
  const triggerMobileAction = (action: "sit" | "coffee" | "shop") => {
    cozyAudio.playClick();
    const phaserGame = (window as any).phaserGame;
    if (!phaserGame) return;
 
    const mainScene = phaserGame.scene.getScene("MainScene");
    if (mainScene && mainScene.scene.isActive()) {
      if (action === "sit") {
        mainScene.handleKeyboardAction("E");
      } else if (action === "coffee") {
        mainScene.triggerLocalCoffee();
      } else if (action === "shop") {
        // Open the flower shop interior or modal
        if ((window as any).triggerFlowerShopOpen) {
          (window as any).triggerFlowerShopOpen();
        } else {
          // If in MainScene, trigger F keyboard interaction for shop transition
          mainScene.handleKeyboardAction("F");
        }
      }
    }
  };
 
  return (
    <div className="fixed inset-0 z-[7000] pointer-events-none select-none flex flex-col justify-between p-4 md:p-6 text-[#ebeef5]">
      
      {/* Top Bar HUD */}
      <div className="w-full flex items-center justify-between pointer-events-auto">
        {/* Left Side: Dynamic Game Clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full glass border border-white/10 shadow-2xl backdrop-blur-md select-none">
            <span className="text-xl filter drop-shadow-sm leading-none animate-pulse">
              {clockTime.hour >= 6 && clockTime.hour < 8 ? "🌅" :
               clockTime.hour >= 8 && clockTime.hour < 17 ? "☀️" :
               clockTime.hour >= 17 && clockTime.hour < 20 ? "🌇" : "🌙"}
            </span>
            <span className="font-mono font-bold tracking-widest text-[#d4af37] text-sm filter drop-shadow-sm">
              {String(clockTime.hour).padStart(2, "0")}:{String(clockTime.minute).padStart(2, "0")}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-300 bg-white/5 px-2 py-0.5 rounded leading-none">
              {clockTime.hour >= 6 && clockTime.hour < 8 ? "Gün Doğumu" :
               clockTime.hour >= 8 && clockTime.hour < 17 ? "Gündüz" :
               clockTime.hour >= 17 && clockTime.hour < 20 ? "Gün Batımı" : "Gece"}
            </span>
          </div>
        </div>
 
        {/* Right Side: Help Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { cozyAudio.playClick(); setShowHelp(!showHelp); }}
            className="p-2.5 rounded-full glass hover:bg-white/10 active:scale-95 transition-all text-slate-300 hover:text-white cursor-pointer shadow-lg"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
 
      {/* Middle Content (Help Overlay card) */}
      {showHelp && (
        <div className="self-center pointer-events-auto w-full max-w-sm glass p-5 rounded-2xl border-white/10 shadow-2xl animate-float flex flex-col gap-3">
          <h3 className="font-semibold font-display text-violet-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-violet-400" />
            Sığınak Rehberi
          </h3>
          <div className="flex flex-col gap-2 text-xs text-slate-300">
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span>Yürüme</span>
              <span className="font-bold text-violet-300">WASD / Yön Tuşları</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span>Otur / Ayağa Kalk</span>
              <span className="font-bold text-violet-300">Koltuk yanında [E]'ye bas</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span>Çiçekçi</span>
              <span className="font-bold text-violet-300">Dükkan kapısında [F]'ye bas</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span>Mini Oyunlar (Bowling/Hokey)</span>
              <span className="font-bold text-violet-300">Kabin yanında [E]'ye bas</span>
            </div>
            <div className="flex justify-between pb-1">
              <span>Çok Oyunculu</span>
              <span className="font-bold text-violet-300">Sekmeleri yan yana aç!</span>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="w-full mt-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold tracking-wider cursor-pointer active:scale-98 transition-all"
          >
            Anlaşıldı
          </button>
        </div>
      )}
 
      {/* Bottom Bar: Atmosphere & Quick Actions */}
      <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4 pointer-events-auto">
        
        {/* Tactile Actions for mobile devices */}
        <div className="flex items-center justify-center gap-3 self-center md:self-end">
          
          {/* Fast-Forward Time Selection Deck */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-full glass border-white/5 shadow-lg select-none">
            <span className="text-[9px] font-extrabold text-slate-400 px-2.5 uppercase tracking-wider">Hızlı Zaman:</span>
            <button
              onClick={() => handleAtmosphereChange("sunny")}
              className="px-2.5 py-1.5 rounded-full text-[9px] font-extrabold bg-white/5 hover:bg-white/10 text-amber-300 transition-all cursor-pointer active:scale-95 shadow"
            >
              ☀️ Gündüz
            </button>
            <button
              onClick={() => handleAtmosphereChange("sunset")}
              className="px-2.5 py-1.5 rounded-full text-[9px] font-extrabold bg-white/5 hover:bg-white/10 text-rose-300 transition-all cursor-pointer active:scale-95 shadow"
            >
              🌅 Akşam
            </button>
            <button
              onClick={() => handleAtmosphereChange("rainy")}
              className="px-2.5 py-1.5 rounded-full text-[9px] font-extrabold bg-white/5 hover:bg-white/10 text-violet-300 transition-all cursor-pointer active:scale-95 shadow animate-pulse"
            >
              🌙 Gece
            </button>
          </div>
 
          {/* Quick Gift shop button */}
          <button
            onClick={() => triggerMobileAction("shop")}
            className="p-3 rounded-full border bg-white/5 border-white/5 hover:border-violet-400/30 text-slate-300 hover:text-white shadow-lg active:scale-95 transition-all cursor-pointer"
            title="Çiçekçi Dükkanı"
          >
            <Gift className="w-5 h-5" />
          </button>
 
          {/* Sırt Çantası (Backpack Inventory) Button */}
          <button
            onClick={() => {
              cozyAudio.playClick();
              if ((window as any).triggerBackpackOpen) {
                (window as any).triggerBackpackOpen();
              }
            }}
            className="p-3 rounded-full border bg-[#3e1f0e]/85 border-[#5e3816] hover:border-amber-400 text-amber-200 shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title="Sırt Çantası (Envanter) 🎒"
          >
            <span className="text-lg filter drop-shadow-sm leading-none">🎒</span>
          </button>
 
          {/* Drink Tea/Coffee button */}
          <button
            onClick={() => triggerMobileAction("coffee")}
            className="p-3 rounded-full border bg-white/5 border-white/5 hover:border-violet-400/30 text-slate-300 hover:text-white shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Coffee className="w-5 h-5" />
          </button>
 
          {/* Sitting down trigger */}
          <button
            onClick={() => triggerMobileAction("sit")}
            className="px-5 py-3.5 rounded-full border bg-gradient-to-r from-violet-500/80 to-fuchsia-500/80 border-violet-400/30 text-white font-semibold font-display tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            Otur / Kalk
          </button>
        </div>
 
      </div>
 
    </div>
  );
}
