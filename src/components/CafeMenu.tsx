"use client";
 
import React, { useState, useEffect } from "react";
import { Coffee, X, Utensils, Sparkles, Heart } from "lucide-react";
import { cozyAudio } from "@/utils/audio";
 
export default function CafeMenu() {
  const [isOpen, setIsOpen] = useState(false);
 
  useEffect(() => {
    // Expose window hook to open cafe menu from Phaser
    (window as any).triggerCafeMenuOpen = () => {
      cozyAudio.playClick();
      setIsOpen(true);
    };
 
    return () => {
      delete (window as any).triggerCafeMenuOpen;
    };
  }, []);
 
  const menuItems = [
    {
      id: "latte",
      name: "Cozy Latte",
      emoji: "☕",
      desc: "Üzerinde minik bir kalp motifi olan, sıcacık ve yumuşacık sütlü kahve.",
      price: "15 Sevgi Puanı"
    },
    {
      id: "cake",
      name: "Çilekli Pasta",
      emoji: "🍰",
      desc: "Taze toplanmış dağ çilekleri ve hafif krema ile hazırlanmış aşk dilimi.",
      price: "25 Sevgi Puanı"
    },
    {
      id: "bubbletea",
      name: "Matcha Bubble Tea",
      emoji: "🧋",
      desc: "Tapyoka incileriyle zenginleştirilmiş, soğuk ve tatlı yeşil çay keyfi.",
      price: "20 Sevgi Puanı"
    },
    {
      id: "pancake",
      name: "Çikolatalı Pankek",
      emoji: "🥞",
      desc: "Üzerinden ılık çikolata sosu süzülen, puf puf pişmiş tatlı pankek kulesi.",
      price: "30 Sevgi Puanı"
    },
    {
      id: "ramen",
      name: "Cozy Ramen Kasesi",
      emoji: "🍜",
      desc: "İki adet çubukla (chopsticks) birlikte gelen, sıcacık ve lezzetli paylaşım kasesi.",
      price: "35 Sevgi Puanı"
    }
  ];
 
  const handleOrder = (foodType: string) => {
    cozyAudio.playGiftBell();
    
    // Trigger order in Phaser MainScene
    if ((window as any).phaserGame) {
      const activeScene = (window as any).phaserGame.scene.getScene("MainScene");
      if (activeScene && typeof activeScene.triggerLocalOrder === "function") {
        activeScene.triggerLocalOrder(foodType);
      }
    }
 
    setIsOpen(false);
  };
 
  if (!isOpen) return null;
 
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none">
      
      {/* Overlay background close click */}
      <div className="absolute inset-0 cursor-pointer" onClick={() => setIsOpen(false)} />
 
      {/* Menu Card Container */}
      <div className="relative w-full max-w-xl rounded-3xl glass border border-white/10 p-6 md:p-8 shadow-2xl bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-purple-950/40 glow-neon text-[#ebeef5] flex flex-col gap-6 overflow-hidden">
        
        {/* Abstract Glow circles */}
        <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />
 
        {/* Header Section */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <Coffee className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold font-display tracking-wide flex items-center gap-1.5">
                Cozy Café & Restoran <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
              </h2>
              <p className="text-[10px] text-violet-300 font-sans uppercase tracking-widest">
                PAYLAŞILAN LEZZETLER, SICACIK ANLAR
              </p>
            </div>
          </div>
          <button 
            onClick={() => { cozyAudio.playClick(); setIsOpen(false); }}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
 
        {/* Info label */}
        <p className="text-xs text-slate-300 leading-relaxed font-sans italic">
          "Bir lezzet seçip partnerine ikram et! Siparişiniz başınızın üstünde belirecek ve sıcacık lofi müziklerin keyfini çıkaracaksınız."
        </p>
 
        {/* Scrollable menu items list */}
        <div className="flex flex-col gap-3.5 max-h-[380px] overflow-y-auto pr-1 select-none custom-scrollbar">
          {menuItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOrder(item.id)}
              className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-rose-400/40 hover:bg-rose-500/5 transition-all duration-300 cursor-pointer group relative overflow-hidden"
            >
              {/* Giant icon */}
              <span className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-all duration-300 select-none">
                {item.emoji}
              </span>
 
              {/* Details */}
              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold tracking-wide group-hover:text-rose-200 transition-colors">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-semibold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full">
                    {item.price}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  {item.desc}
                </span>
              </div>
 
              {/* Micro arrow indicator on hover */}
              <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-spin-slow" />
              </div>
            </div>
          ))}
        </div>
 
        {/* Footer info */}
        <div className="flex items-center gap-1.5 justify-center text-[10px] text-slate-400 border-t border-white/5 pt-3">
          <Utensils className="w-3.5 h-3.5 text-violet-400" />
          <span>Sipariş verdiğiniz an partnerinizin ekranında da senkronize görünür.</span>
        </div>
 
      </div>
    </div>
  );
}
