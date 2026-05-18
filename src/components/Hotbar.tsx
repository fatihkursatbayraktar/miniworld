"use client";
 
import React, { useState, useEffect, useRef } from "react";
import { Gift, Sparkles } from "lucide-react";
import { cozyAudio } from "@/utils/audio";
 
interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  image?: string;
  cssFilter?: string;
}
 
export default function Hotbar() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isCloseToPartner, setIsCloseToPartner] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
 
  // Poll Phaser registry state for real-time responsiveness
  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      // 1. Read inventory
      const phaserGame = (window as any).phaserGame;
      if (phaserGame) {
        const rawInv = phaserGame.registry.get("inventory") || [];
        setInventory(rawInv);
      }
 
      // 2. Read partner proximity
      const closeFlag = !!(window as any).isCloseToPartner;
      if (closeFlag !== isCloseToPartner) {
        setIsCloseToPartner(closeFlag);
      }
    }, 200);
 
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [isCloseToPartner]);
 
  // Sync selected index with activeHeldFlower global state for Player.ts to render
  const handleSelectSlot = (index: number, item: InventoryItem | null) => {
    cozyAudio.playClick();
    if (!item) {
      // Empty slot clicked -> clear selection
      setActiveIndex(null);
      (window as any).activeHeldFlower = null;
      return;
    }
 
    if (activeIndex === index) {
      // Toggle off
      setActiveIndex(null);
      (window as any).activeHeldFlower = null;
    } else {
      // Select slot
      setActiveIndex(index);
      (window as any).activeHeldFlower = item.id;
    }
  };
 
  const handleGiftHeldFlower = () => {
    if (activeIndex === null) return;
    const hotbarItems = Array.from({ length: 4 }).map((_, idx) => inventory[idx] || null);
    const item = hotbarItems[activeIndex];
    if (!item) return;
 
    cozyAudio.playGiftBell();
 
    const phaserGame = (window as any).phaserGame;
    if (phaserGame) {
      const mainScene = phaserGame.scene.getScene("MainScene");
      const interiorScene = phaserGame.scene.getScene("FloristInteriorScene");
      const activeScene = (mainScene && mainScene.scene.isActive())
        ? mainScene
        : ((interiorScene && interiorScene.scene.isActive()) ? interiorScene : null);
 
      if (activeScene) {
        // Standard interactive speech triggers
        (activeScene as any).player.displaySpeechBubble(`🎁 Al bakalım sevgilim, senin için aldım! 💖`);
 
        // Trigger local gift animation
        if (typeof (activeScene as any).triggerLocalGift === "function") {
          (activeScene as any).triggerLocalGift(item.id);
        }
 
        if (activeScene.registry.get("playMode") === "ai") {
          setTimeout(() => {
            (activeScene as any).partner.displaySpeechBubble(`Bana ${item.name} mi aldın? Dünyanın en mutlu partneriyim! 🥰`);
            (activeScene as any).partner.displayEmote("💖");
          }, 1400);
        }
      }
 
      // Remove item from Phaser registry
      const rawInv = phaserGame.registry.get("inventory") || [];
      const itemIndex = rawInv.findIndex((i: any) => i.id === item.id);
      if (itemIndex !== -1) {
        const newInv = [...rawInv];
        newInv.splice(itemIndex, 1);
        phaserGame.registry.set("inventory", newInv);
        setInventory(newInv);
      }
    }
 
    // Clear hotbar selection
    setActiveIndex(null);
    (window as any).activeHeldFlower = null;
  };
 
  // Generate 4 Minecraft-style slots
  const hotbarItems = Array.from({ length: 4 }).map((_, idx) => inventory[idx] || null);
  const activeItem = activeIndex !== null ? hotbarItems[activeIndex] : null;
  const showGiftButton = isCloseToPartner && activeItem !== null;
 
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[8000] flex flex-col items-center gap-4 select-none pointer-events-auto">
      
      {/* Floating Gift Button */}
      {showGiftButton && (
        <button
          onClick={handleGiftHeldFlower}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-bold text-xs tracking-widest uppercase cursor-pointer border-2 border-rose-300 shadow-lg shadow-rose-500/30 active:scale-95 transition-all animate-bounce-slow"
        >
          <Gift className="w-4 h-4 fill-white/10" />
          Hediye Et 💖
        </button>
      )}
 
      {/* Hotbar Container (Stardew/RPG Glassmorphic Panel) */}
      <div className="relative p-2.5 rounded-[22px] bg-[#1a0e0a]/90 backdrop-blur-sm border-4 border-[#5e3816] shadow-2xl flex items-center gap-3 outline outline-3 outline-[#1a0e0a]/50">
        
        {/* Metal corners */}
        <div className="absolute top-0.5 left-0.5 w-3 h-3 border-t-2 border-l-2 border-amber-400/60 rounded-tl-[4px]" />
        <div className="absolute top-0.5 right-0.5 w-3 h-3 border-t-2 border-r-2 border-amber-400/60 rounded-tr-[4px]" />
        <div className="absolute bottom-0.5 left-0.5 w-3 h-3 border-b-2 border-l-2 border-amber-400/60 rounded-bl-[4px]" />
        <div className="absolute bottom-0.5 right-0.5 w-3 h-3 border-b-2 border-r-2 border-amber-400/60 rounded-br-[4px]" />
 
        {/* Hotbar slots */}
        {hotbarItems.map((item, index) => {
          const isSelected = activeIndex === index;
          return (
            <div
              key={index}
              onClick={() => handleSelectSlot(index, item)}
              className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-3xl transition-all relative border-4 cursor-pointer select-none ${
                item
                  ? isSelected
                    ? "bg-[#e8d2aa] border-amber-400 scale-105 shadow-inner shadow-amber-500/20"
                    : "bg-[#e6d0a7] border-[#c8b287] hover:bg-[#e8d2aa] hover:border-amber-400/50 shadow-md"
                  : "bg-[#2b1810]/40 border-[#3e1f0e] border-dashed cursor-default"
              }`}
            >
              {item ? (
                item.image ? (
                   <div className="w-10 h-10 rounded-full bg-slate-50/90 shadow-inner flex items-center justify-center p-1 border border-slate-200/50">
                     <img 
                       src={item.image} 
                       alt={item.name} 
                       style={item.cssFilter ? { filter: item.cssFilter } : undefined}
                       className="w-full h-full object-contain mix-blend-multiply transform hover:scale-110 transition-transform select-none"
                     />
                   </div>
                ) : (
                   <span className="filter drop-shadow-md transform hover:scale-115 transition-transform select-none">
                     {item.icon}
                   </span>
                )
              ) : (
                <span className="text-[10px] font-bold text-[#5e3816]/30 uppercase select-none font-display">
                  {index + 1}
                </span>
              )}
 
              {/* Highlight Glow overlay */}
              {isSelected && (
                <div className="absolute inset-0 border-2 border-amber-200 rounded-[6px] pointer-events-none animate-pulse" />
              )}
 
              {/* Hotbar Index indicator */}
              <span className="absolute top-1 left-1.5 text-[8px] font-bold opacity-30 select-none text-[#3e1f0e]">
                {index + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
