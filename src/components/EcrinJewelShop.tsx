"use client";
 
import React, { useState, useEffect } from "react";
import { X, Sparkles, ShoppingBag } from "lucide-react";
import { cozyAudio } from "@/utils/audio";
 
interface JewelItem {
  id: string;
  name: string;
  icon: string; // Emoji fallback
  image?: string; // New 2D Asset
  cssFilter?: string; // For Gold/Rose Gold variations
  price: number;
  desc: string;
}
 
// CSS Filters for coloring silver base assets
const filterGold = "sepia(1) hue-rotate(-15deg) saturate(3) brightness(1.1) contrast(1.1)";
const filterRoseGold = "sepia(1) hue-rotate(-45deg) saturate(4) brightness(0.9)";
const filterRuby = "hue-rotate(150deg) saturate(2)";
const filterSapphire = "hue-rotate(200deg) saturate(1.5)";
 
const JEWEL_ITEMS: JewelItem[] = [
  { id: "j_diamond_ring", name: "Elmas Tektaş", icon: "💍", image: "/assets/silver_ring.png", price: 2500, desc: "Sonsuz sevginin en parlak sembolü." },
  { id: "j_emerald_ring", name: "Zümrüt Yüzük", icon: "💍", image: "/assets/silver_ring.png", cssFilter: filterSapphire, price: 1800, desc: "Doğanın en asil tonu." },
  { id: "j_ruby_ring", name: "Yakut Kalp Yüzük", icon: "💍", image: "/assets/silver_ring.png", cssFilter: filterRuby, price: 2100, desc: "Tutkunun ve aşkın rengi." },
  { id: "j_gold_ring", name: "Altın Yüzük", icon: "💍", image: "/assets/silver_ring.png", cssFilter: filterGold, price: 1950, desc: "Klasik altın zarafeti." },
  { id: "j_meteor_ring", name: "Kozmik Yüzük", icon: "💍", image: "/assets/silver_ring.png", cssFilter: filterRoseGold, price: 5000, desc: "Rose Gold ihtişamı." },
  
  { id: "j_pearl_neck", name: "Gümüş Kolye", icon: "📿", image: "/assets/silver_necklace.png", price: 1200, desc: "Zarafetin en klasik hali." },
  { id: "j_emerald_neck", name: "Yakut Kolye", icon: "📿", image: "/assets/silver_necklace.png", cssFilter: filterRuby, price: 2300, desc: "Göz alıcı bir asalete sahip." },
  { id: "j_diamond_neck", name: "Elmas Kolye", icon: "📿", image: "/assets/silver_necklace.png", price: 3500, desc: "Gözleri kamaştıran bir parlaklık." },
  { id: "j_gold_chain", name: "Altın Zincir", icon: "📿", image: "/assets/silver_necklace.png", cssFilter: filterGold, price: 900, desc: "Sade ve şık altın kolye." },
  { id: "j_rose_neck", name: "Rose Kolye", icon: "📿", image: "/assets/silver_necklace.png", cssFilter: filterRoseGold, price: 2400, desc: "Kalp atışlarını hızlandıran tasarım." },
  
  { id: "j_royal_crown", name: "Kraliyet Tacı", icon: "👑", image: "/assets/silver_crown.png", price: 8500, desc: "Sadece gerçek kraliçeler için." },
  { id: "j_princess_crown", name: "Altın Taç", icon: "👑", image: "/assets/silver_crown.png", cssFilter: filterGold, price: 6000, desc: "Peri masallarından fırlamış gibi." },
  
  { id: "j_diamond_ear", name: "Gümüş Küpe", icon: "💎", image: "/assets/silver_earring.png", price: 1600, desc: "Işıltısıyla geceyi aydınlatır." },
  { id: "j_sapphire_ear", name: "Safir Küpe", icon: "💎", image: "/assets/silver_earring.png", cssFilter: filterSapphire, price: 1400, desc: "Göz alıcı bir mizaç için." },
  { id: "j_gold_ear", name: "Altın Küpe", icon: "💎", image: "/assets/silver_earring.png", cssFilter: filterGold, price: 800, desc: "Her anınıza uyum sağlayan zarafet." },
  { id: "j_raw_diamond", name: "Yakut Küpe", icon: "💎", image: "/assets/silver_earring.png", cssFilter: filterRuby, price: 10000, desc: "Kırmızı lüks ve ihtişam." },
  
  { id: "j_silver_bracelet", name: "Gümüş Bilezik", icon: "📿", image: "/assets/silver_bracelet.png", price: 1100, desc: "Bileğinde lüksün ağırlığı." },
  { id: "j_gold_bracelet", name: "Altın Bilezik", icon: "📿", image: "/assets/silver_bracelet.png", cssFilter: filterGold, price: 1450, desc: "Saf altın parıltısı." },
  
  { id: "j_diamond_watch", name: "Safir Bilezik", icon: "⌚", image: "/assets/silver_bracelet.png", cssFilter: filterSapphire, price: 4200, desc: "Zamanın en değerli hali." },
  { id: "j_rose_bracelet", name: "Rose Bilezik", icon: "⌚", image: "/assets/silver_bracelet.png", cssFilter: filterRoseGold, price: 2800, desc: "Klasik bir rose gold göstergesi." }
];
 
export default function EcrinJewelShop() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<JewelItem | null>(null);
 
  useEffect(() => {
    (window as any).triggerEcrinShopOpen = () => {
      setIsOpen(true);
      cozyAudio.playClick();
    };
  }, []);
 
  if (!isOpen) return null;
 
  const handleBuy = () => {
    if (!selectedItem) return;
 
    cozyAudio.playChime();
 
    // Add item to Phaser global inventory registry
    const phaserGame = (window as any).phaserGame;
    if (phaserGame) {
      const currentInv = phaserGame.registry.get("inventory") || [];
      const newInv = [...currentInv, selectedItem];
      phaserGame.registry.set("inventory", newInv);
 
      // Play local visual sparkles on player
      const interiorScene = phaserGame.scene.getScene("JewelerInteriorScene");
      if (interiorScene && typeof (interiorScene as any).triggerLocalGift === "function") {
        (interiorScene as any).triggerLocalGift(selectedItem.id);
      }
    }
 
    // Close modal after purchase
    setIsOpen(false);
    setSelectedItem(null);
  };
 
  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-300 pointer-events-auto">
      {/* Outer Golden/Marble Frame */}
      <div className="w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] bg-[#0f172a] rounded-2xl shadow-2xl shadow-amber-500/20 border-2 border-[#fcd34d] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-[#fcd34d]/30 bg-gradient-to-r from-[#1e293b] to-[#0f172a]">
          <div className="flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-md">💎</span>
            <div>
              <h2 className="text-2xl font-bold text-[#fcd34d] font-display tracking-wide drop-shadow-md">
                Zen Pırlanta
              </h2>
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider">
                Seçkin & Lüks Mücevherat
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              cozyAudio.playClick();
              setIsOpen(false);
            }}
            className="p-2 text-[#94a3b8] hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
 
        {/* Main Content Grid */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
          
          {/* Left: Product Grid */}
          <div className="flex-1 md:overflow-y-auto p-4 md:p-5 custom-scrollbar bg-[#0b0f19]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {JEWEL_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    cozyAudio.playClick();
                    setSelectedItem(item);
                  }}
                  className={`relative p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                    selectedItem?.id === item.id
                      ? "bg-gradient-to-br from-[#fcd34d]/20 to-transparent border-[#fcd34d] shadow-[0_0_15px_rgba(252,211,77,0.3)] scale-[1.02]"
                      : "bg-[#1e293b] border-[#334155] hover:border-[#fcd34d]/50 hover:bg-[#1e293b]/80"
                  }`}
                >
                  {item.image ? (
                    <div className="w-16 h-16 rounded-full bg-slate-50 shadow-inner flex items-center justify-center p-2 border border-slate-200/50 mb-1">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        style={item.cssFilter ? { filter: item.cssFilter } : undefined}
                        className="w-full h-full object-contain mix-blend-multiply transform transition-transform group-hover:scale-110"
                      />
                    </div>
                  ) : (
                    <span className="text-4xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transform transition-transform group-hover:scale-110 mb-1">
                      {item.icon}
                    </span>
                  )}
                  <div className="text-center w-full">
                    <p className="text-[#f8fafc] font-medium text-sm truncate">{item.name}</p>
                    <p className="text-[#fcd34d] font-bold text-xs mt-1">₺{item.price.toLocaleString()}</p>
                  </div>
                  {selectedItem?.id === item.id && (
                    <Sparkles className="absolute top-2 right-2 w-4 h-4 text-[#fcd34d] animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
 
          {/* Right: Checkout Sidebar */}
          <div className="w-full md:w-80 bg-[#1e293b] border-t md:border-t-0 md:border-l border-[#fcd34d]/30 p-6 flex flex-col relative z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] md:shadow-[-10px_0_20px_rgba(0,0,0,0.3)]">
            <h3 className="text-[#f8fafc] font-semibold text-lg mb-6 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#fcd34d]" />
              Seçilen Mücevher
            </h3>
 
            {selectedItem ? (
              <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-300">
                <div className="w-full aspect-square bg-gradient-to-b from-[#0f172a] to-[#020617] rounded-2xl border border-[#fcd34d]/50 flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#fcd34d]/20 via-transparent to-transparent opacity-50" />
                  {selectedItem.image ? (
                    <div className="w-3/4 h-3/4 rounded-full bg-slate-50 flex items-center justify-center p-4 shadow-[0_0_30px_rgba(252,211,77,0.3)] animate-bounce-slow z-10 relative">
                       <img 
                          src={selectedItem.image} 
                          alt={selectedItem.name}
                          style={selectedItem.cssFilter ? { filter: selectedItem.cssFilter } : undefined}
                          className="w-full h-full object-contain mix-blend-multiply"
                       />
                       <div className="absolute inset-0 rounded-full border border-slate-200/50 shadow-inner pointer-events-none" />
                    </div>
                  ) : (
                    <span className="text-7xl filter drop-shadow-[0_0_20px_rgba(252,211,77,0.4)] animate-bounce-slow z-10">
                      {selectedItem.icon}
                    </span>
                  )}
                </div>
                
                <h4 className="text-xl font-bold text-[#fcd34d] mb-2">{selectedItem.name}</h4>
                <p className="text-[#cbd5e1] text-sm leading-relaxed mb-auto italic">
                  "{selectedItem.desc}"
                </p>
 
                <div className="mt-8 pt-6 border-t border-[#334155]">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[#94a3b8] font-medium">Toplam Tutar:</span>
                    <span className="text-2xl font-bold text-[#fcd34d]">₺{selectedItem.price.toLocaleString()}</span>
                  </div>
                  
                  <button
                    onClick={handleBuy}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#f59e0b] hover:to-[#d97706] text-white font-bold text-lg tracking-wide shadow-[0_0_20px_rgba(217,119,6,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Satın Al <Sparkles className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 opacity-50">
                <span className="text-5xl mb-4 grayscale">💎</span>
                <p className="text-[#cbd5e1] font-medium">İncelemek için bir mücevher seçin.</p>
              </div>
            )}
          </div>
 
        </div>
      </div>
    </div>
  );
}
