"use client";
 
import React, { useState, useEffect } from "react";
import { X, Heart, Gift, Award } from "lucide-react";
import { cozyAudio } from "@/utils/audio";
 
interface InventoryItem {
  id: string;
  name: string;
  icon: string;
}
 
export default function BackpackInventory() {
  const [isOpen, setIsOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
 
  useEffect(() => {
    // Hook backpack open trigger globally
    (window as any).triggerBackpackOpen = () => {
      cozyAudio.playClick();
      
      // Read current Phaser inventory registry state on open
      const phaserGame = (window as any).phaserGame;
      if (phaserGame) {
        const rawInv = phaserGame.registry.get("inventory") || [];
        setInventory(rawInv);
      }
      
      setIsOpen(true);
      setSelectedIndex(null);
    };
 
    return () => {
      delete (window as any).triggerBackpackOpen;
    };
  }, []);
 
  const handleClose = () => {
    cozyAudio.playClick();
    setIsOpen(false);
  };
 
  const handleGiftItem = () => {
    if (selectedIndex === null || !inventory[selectedIndex]) return;
 
    const item = inventory[selectedIndex];
    cozyAudio.playGiftBell();
 
    const phaserGame = (window as any).phaserGame;
    if (phaserGame) {
      // 1. Trigger animation in either MainScene or FloristInteriorScene
      const mainScene = phaserGame.scene.getScene("MainScene");
      const interiorScene = phaserGame.scene.getScene("FloristInteriorScene");
      const activeScene = (mainScene && mainScene.scene.isActive()) 
        ? mainScene 
        : ((interiorScene && interiorScene.scene.isActive()) ? interiorScene : null);
 
      if (activeScene) {
        if (typeof (activeScene as any).triggerLocalGift === "function") {
          // Standard gift trigger callback
          (activeScene as any).triggerLocalGift(item.id);
        } else {
          // Custom indoor scene bubble trigger fallback
          (activeScene as any).player.displaySpeechBubble(`🎁 Al bakalım sevgilim, senin için aldım! 💖`);
          
          if (activeScene.registry.get("playMode") === "ai") {
            setTimeout(() => {
              (activeScene as any).partner.displaySpeechBubble(`Bana ${item.name} mi aldın? Dünyanın en mutlu partneriyim! 🥰`);
              (activeScene as any).partner.displayEmote("💖");
            }, 1400);
          }
        }
      }
 
      // 2. Remove the gifted item from Phaser inventory registry
      const newInv = inventory.filter((_, idx) => idx !== selectedIndex);
      phaserGame.registry.set("inventory", newInv);
      setInventory(newInv);
    }
 
    setSelectedIndex(null);
    setIsOpen(false);
  };

  const handleEatItem = (idx: number) => {
    if (idx === null || !inventory[idx]) return;
    const item = inventory[idx];
    cozyAudio.playGiftBell();

    const phaserGame = (window as any).phaserGame;
    if (phaserGame) {
      const mainScene = phaserGame.scene.getScene("MainScene");
      if (mainScene && mainScene.scene.isActive()) {
        if (mainScene.player) {
          mainScene.player.displaySpeechBubble(`😋 Mmm! Sıcak ve leziz ${item.name} yiyerek harika hissettim! ✨`);
          mainScene.player.displayEmote("❤️");
          if (typeof mainScene.spawnSeatLoveEmitter === "function") {
            mainScene.spawnSeatLoveEmitter(mainScene.player.x, mainScene.player.y);
          }
        }
      }
      
      const newInv = inventory.filter((_, i) => i !== idx);
      phaserGame.registry.set("inventory", newInv);
      setInventory(newInv);
    }
    setSelectedIndex(null);
    setIsOpen(false);
  };
 
  if (!isOpen) return null;
 
  // Custom flower descriptions
  const itemDescriptions: Record<string, string> = {
    rose: "Kırmızı taç yaprakları aşkın taze kokusunu yayan nefis bir gül.",
    hydrangea: "Berraflower seralarında sevgiyle büyütülen şirin pastel ortanca.",
    sunflower: "Göz alıcı sarı yapraklarıyla etrafına neşe saçan günebakan.",
    lavender: "Rahatlatıcı ve derin uyku getiren, rüya gibi mor bir lavanta demeti.",
    tulip: "Efsanevi peri yapraklarına sahip pembe parıltılı narin lale.",
    fish_cipura: "Nehirde taze yakalanmış gümüş pullu nefis Boğaz Çipurası. Mangalda pişirilebilir! 🐟",
    fish_lufer: "Nehir derinliklerinde süzülen nadide Haliç Lüferi. Mangalda pişirilebilir! 🐠",
    fish_alabalik: "Altın sarısı benekleri parıldayan tatlı su Altın Alabalığı. Mangalda pişirilebilir! 🐟",
    fish_kalkan: "Geniş gövdeli ve lezzetli, nehrin diplerinden gelen Kral Kalkan Balığı. Mangalda pişirilebilir! 🐠",
    fish_denizkizi: "Efsanelere konu olan, rüya pembesi pullara sahip Nadir Deniz Kızı Balığı! Çok değerlidir. 🧜‍♀️",
    fish_cipura_cooked: "Mangal ateşinde çıtır çıtır pişirilmiş, nefis tereyağlı Izgara Boğaz Çipurası. Afiyetle yenebilir! 🍽️😋",
    fish_lufer_cooked: "Közde nar gibi kızarmış, dumanı üstünde Izgara Haliç Lüferi. Afiyetle yenebilir! 🍽️😋",
    fish_alabalik_cooked: "Mis gibi kokan, çıtır derili Izgara Altın Alabalık. Afiyetle yenebilir! 🍽️😋",
    fish_kalkan_cooked: "Köz ateşinde yumuşacık pişmiş, efsanevi Izgara Kral Kalkan Balığı. Afiyetle yenebilir! 🍽️😋",
    fish_denizkizi_cooked: "Fırın ateşinde közlenmiş, etrafına pembe parıltılar saçan Fırınlanmış Deniz Kızı Balığı! 🍽️✨"
  };
 
  // Generate 12 fixed slots (3x4 grid) representing standard RPG inventory bags
  const totalSlots = 12;
  const displaySlots = Array.from({ length: totalSlots }).map((_, idx) => {
    return inventory[idx] || null;
  });
 
  const selectedItem = selectedIndex !== null ? inventory[selectedIndex] : null;
 
  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in pointer-events-auto select-none">
      
      {/* Tap outside to close */}
      <div className="absolute inset-0 cursor-pointer" onClick={handleClose} />
 
      {/* Stardew Valley Wooden Board Inventory Design */}
      <div className="relative w-full max-w-lg rounded-[28px] bg-[#2b1810] border-[5px] border-[#5e3816] shadow-2xl p-6 md:p-8 flex flex-col gap-6 text-[#fae8ff] overflow-hidden select-none outline outline-4 outline-[#1a0e0a]">
        
        {/* Metal RPG corner ornaments */}
        <div className="absolute top-1 left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-[8px] opacity-75" />
        <div className="absolute top-1 right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-[8px] opacity-75" />
        <div className="absolute bottom-1 left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-[8px] opacity-75" />
        <div className="absolute bottom-1 right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-[8px] opacity-75" />
 
        {/* Header Title */}
        <div className="flex items-center justify-between border-b-4 border-[#3e1f0e] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-md animate-bounce-slow">🎒</span>
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display tracking-wider text-amber-200 drop-shadow-md">
                Cozy Sırt Çantası
              </h2>
              <p className="text-[10px] text-emerald-300 font-sans uppercase tracking-widest font-bold">
                ENVANTER VE HEDİYELERİN
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[#1a0e0a] border border-[#5e3816] flex items-center justify-center hover:bg-red-950 hover:border-red-700 active:scale-95 transition-all text-slate-300 hover:text-white cursor-pointer shadow-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
 
        {/* Main Split Grid and Details Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch select-none">
          
          {/* Left Grid Panel (Inventory slots) */}
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider pl-1">
              ÇANTANIN İÇİNDEKİLER ({inventory.length} / {totalSlots})
            </div>
            
            <div className="grid grid-cols-4 gap-2.5 p-3 rounded-2xl bg-[#1a0e0a]/50 border-2 border-[#3e1f0e]">
              {displaySlots.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item) {
                      cozyAudio.playClick();
                      setSelectedIndex(index);
                    }
                  }}
                  className={`w-full aspect-square rounded-xl flex items-center justify-center text-3xl transition-all relative border-4 cursor-pointer select-none ${
                    item
                      ? selectedIndex === index
                        ? "bg-[#e8d2aa] border-amber-400 scale-[1.05] shadow-inner"
                        : "bg-[#e6d0a7] border-[#c8b287] hover:bg-[#e8d2aa] hover:border-amber-400/60 shadow-md"
                      : "bg-[#2b1810]/40 border-[#3e1f0e] border-dashed cursor-default hover:scale-100"
                  }`}
                >
                  {item && (
                    <span className="filter drop-shadow-md select-none transform hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                  )}
                  {/* Subtle index tag */}
                  <span className="absolute bottom-1 right-1.5 text-[8px] font-bold opacity-30 select-none text-[#3e1f0e]">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
 
          {/* Right Panel (Item Selection Detail View) */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#e6d0a7]/95 border-4 border-[#c8b287] text-[#3e1f0e] justify-between relative overflow-hidden select-none min-h-[175px]">
            {selectedItem ? (
              <div className="flex flex-col gap-2 select-none h-full justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-4xl filter drop-shadow-sm select-none">{selectedItem.icon}</span>
                    <div>
                      <h3 className="text-sm font-extrabold font-display text-[#2b1810] tracking-wide leading-tight">
                        {selectedItem.name}
                      </h3>
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300/30 uppercase tracking-widest">
                        Taze Toplanmış
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-[#5a3b2c] leading-relaxed pt-1.5">
                    {itemDescriptions[selectedItem.id] || "Vadi bahçelerinde aşkla büyütülmüş harika bir hediye eşyası."}
                  </p>
                </div>
 
                {selectedItem.id.endsWith("_cooked") ? (
                  <div className="flex flex-col gap-1.5 w-full">
                    <button
                      onClick={() => selectedIndex !== null && handleEatItem(selectedIndex)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 border border-amber-300 text-white font-bold text-xs tracking-wider transition-all cursor-pointer shadow-md active:scale-95 uppercase"
                    >
                      <span>😋</span>
                      BALIĞI AFİYETLE YE!
                    </button>
                    <button
                      onClick={handleGiftItem}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[#2b1810] hover:bg-[#3e1f0e] border border-[#5e3816] text-amber-200 font-bold text-[9px] tracking-widest transition-all cursor-pointer shadow-md active:scale-95 uppercase"
                    >
                      <Gift className="w-2.5 h-2.5" />
                      SEVGİLİNE HEDİYE ET
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGiftItem}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 border border-rose-400 text-white font-bold text-xs tracking-widest transition-all cursor-pointer shadow-md active:scale-95 uppercase"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    SEVGİLİNE TAKDİM ET 💖
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2.5 text-center h-full my-auto py-4 select-none">
                <span className="text-4xl filter grayscale opacity-60">🎒</span>
                <div>
                  <h3 className="text-xs font-bold text-[#5a3b2c] uppercase tracking-wider">
                    Eşya Seçilmedi
                  </h3>
                  <p className="text-[10px] text-[#7d6152] font-medium max-w-[150px] leading-relaxed pt-1">
                    Çantandaki bir çiçeğe tıklayarak detaylarını görebilir ve sevgiline hediye edebilirsin!
                  </p>
                </div>
              </div>
            )}
          </div>
 
        </div>
 
      </div>
    </div>
  );
}
