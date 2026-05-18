"use client";
 
import React, { useState, useEffect } from "react";
import { X, Heart, Sparkles, Send } from "lucide-react";
import { cozyAudio } from "@/utils/audio";
 
export default function BerraflowerShop() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFlower, setSelectedFlower] = useState<string>("rose");
  const [message, setMessage] = useState("");
 
  useEffect(() => {
    // Hook standard global trigger for Phaser scenes
    (window as any).triggerFlowerShopOpen = () => {
      cozyAudio.playClick();
      setIsOpen(true);
    };
 
    return () => {
      delete (window as any).triggerFlowerShopOpen;
    };
  }, []);
 
  const flowersList = [
    {
      id: "rose",
      name: "Tatlı Aşk Gülü",
      icon: "🌹",
      desc: "Romantik aşkın zamansız simgesi. Kırmızı taç yaprakları aşkla parıldıyor.",
      price: "15 Sevgi",
      color: "text-rose-600"
    },
    {
      id: "hydrangea",
      name: "Bahar Ortancası",
      icon: "🌸",
      desc: "Berraflower seralarında özel yetiştirilmiş, pastel tonlarında şirin bir çiçek.",
      price: "25 Sevgi",
      color: "text-pink-600"
    },
    {
      id: "sunflower",
      name: "Altın Günebakan",
      icon: "🌻",
      desc: "Tıpkı tatlı partnerin gibi etrafına pozitif enerji saçan altın sarısı yapraklar.",
      price: "20 Sevgi",
      color: "text-amber-600"
    },
    {
      id: "lavender",
      name: "Yıldızlı Lavanta",
      icon: "🪻",
      desc: "Gece serinliğinde toplanan, yatağa konulduğunda en huzurlu rüyaları getiren lavanta.",
      price: "30 Sevgi",
      color: "text-purple-600"
    },
    {
      id: "tulip",
      name: "Peri Lalesi",
      icon: "🌷",
      desc: "Efsaneye göre vadideki perilerin yapraklarında dinlendiği, parıltılı pembe lale.",
      price: "35 Sevgi",
      color: "text-rose-500"
    }
  ];
 
  const handleSendGift = () => {
    if (!selectedFlower) return;
    
    cozyAudio.playGiftBell();
 
    const phaserGame = (window as any).phaserGame;
    const isInterior = phaserGame && phaserGame.scene.isActive("FloristInteriorScene");
 
    if (isInterior) {
      // Add flower to cart selection instead of sending immediately!
      (window as any).selectedCartFlower = selectedFlower;
      
        const interiorScene = phaserGame.scene.getScene("FloristInteriorScene");
        if (interiorScene) {
          (interiorScene as any).player.displaySpeechBubble("🛒 Çiçek sepetime eklendi! Şimdi kasadaki Yüsra'ya gidip ödeyebilirim! 💰");
        }
      setIsOpen(false);
      return;
    }
 
    // Trigger phaser animations on partner character
    if (phaserGame) {
      const mainScene = phaserGame.scene.getScene("MainScene");
      if (mainScene && mainScene.scene.isActive()) {
        mainScene.triggerLocalGift(selectedFlower);
        
        // Show a custom speech bubble saying the message if entered
        if (message.trim()) {
          setTimeout(() => {
            mainScene.player.displaySpeechBubble(`💌 "${message}"`);
          }, 600);
        }
      }
    }
 
    setIsOpen(false);
    setMessage("");
  };
 
  const handleClose = () => {
    cozyAudio.playClick();
    setIsOpen(false);
  };
 
  if (!isOpen) return null;
 
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in pointer-events-auto select-none">
      
      {/* Click outside to close */}
      <div className="absolute inset-0 cursor-pointer" onClick={handleClose} />
 
      {/* Stardew Valley Wooden Board Container */}
      <div className="relative w-full max-w-lg rounded-[28px] bg-[#2b1810] border-[5px] border-[#5e3816] shadow-2xl p-6 md:p-8 flex flex-col gap-6 text-[#fae8ff] overflow-hidden select-none outline outline-4 outline-[#1a0e0a]">
        
        {/* Gold Metal Corner Braces (Retro pixel RPG theme) */}
        <div className="absolute top-1 left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-[8px] opacity-75" />
        <div className="absolute top-1 right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-[8px] opacity-75" />
        <div className="absolute bottom-1 left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-[8px] opacity-75" />
        <div className="absolute bottom-1 right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-[8px] opacity-75" />
 
        {/* Header - Rustic Wooden Board style */}
        <div className="flex items-center justify-between border-b-4 border-[#3e1f0e] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-md animate-bounce-slow">🌸</span>
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display tracking-wider text-amber-200 drop-shadow-md flex items-center gap-1.5">
                berraflower <Heart className="w-4.5 h-4.5 text-rose-500 fill-rose-500 animate-pulse" />
              </h2>
              <p className="text-[10px] text-emerald-300 font-sans uppercase tracking-widest font-bold">
                VADİNİN EN COZY ÇİÇEK KULÜBESİ
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
 
        {/* Shop Description */}
        <p className="text-xs text-[#fae8ff] leading-relaxed font-sans italic opacity-90 px-1">
          "Berraflower seralarından taze toplanmış büyüleyici çiçekler! Bir tanesini seçip sevgiline ikram et, vadi rüzgarları aşkınızı taçlandırsın!"
        </p>
 
        {/* Scrollable Flower Catalog - Parchment Paper styled cards */}
        <div className="flex flex-col gap-3.5 max-h-[290px] overflow-y-auto pr-1.5 custom-scrollbar select-none">
          {flowersList.map((flower) => (
            <div
              key={flower.id}
              onClick={() => {
                cozyAudio.playClick();
                setSelectedFlower(flower.id);
              }}
              className={`flex items-center gap-4 p-3 rounded-2xl border-4 transition-all duration-200 cursor-pointer relative overflow-hidden select-none ${
                selectedFlower === flower.id
                  ? "bg-[#e8d2aa] border-amber-400 shadow-md shadow-black/30 scale-[1.01]"
                  : "bg-[#e6d0a7]/85 border-[#c8b287] hover:bg-[#e8d2aa] hover:border-amber-500/50"
              }`}
            >
              {/* Giant icon */}
              <span className="text-4xl filter drop-shadow-md transform hover:scale-110 transition-transform select-none">
                {flower.icon}
              </span>
 
              {/* Details (Chocolate brown text for parchment paper look) */}
              <div className="flex-1 flex flex-col gap-0.5 select-none">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-extrabold font-display text-[#3e1f0e] tracking-wide">
                    {flower.name}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300/30 px-2 py-0.5 rounded-md shadow-sm">
                    {flower.price}
                  </span>
                </div>
                <span className="text-[11px] text-[#5a3b2c] font-sans font-medium leading-tight">
                  {flower.desc}
                </span>
              </div>
 
              {/* Gold heart overlay selector */}
              {selectedFlower === flower.id && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin-slow" />
                </div>
              )}
            </div>
          ))}
        </div>
 
        {/* Message Input - Parchment Envelope style */}
        <div className="flex flex-col gap-2 bg-[#1a0e0a]/40 p-3.5 rounded-2xl border-2 border-[#3e1f0e]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
            💌 Hediye Mektubu Ekle (İsteğe bağlı)
          </label>
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={40}
              placeholder="Çiçeğin yanına şirin bir not yaz..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#e6d0a7] border-2 border-[#c8b287] focus:border-amber-400 focus:outline-none transition-all text-xs font-sans font-bold text-[#3e1f0e] placeholder-[#7d6152] shadow-inner"
            />
          </div>
        </div>
 
        {/* Action Button - SV Spring Colors */}
        <button
          onClick={handleSendGift}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-2 border-emerald-400/40 hover:border-emerald-300 active:scale-98 font-bold font-display tracking-widest text-sm cursor-pointer shadow-lg hover:shadow-emerald-500/10 transition-all text-white outline outline-3 outline-[#1a0e0a]"
        >
          <Send className="w-4.5 h-4.5" />
          {typeof window !== "undefined" && (window as any).phaserGame?.scene.isActive("FloristInteriorScene")
            ? "ÇİÇEĞİ SEPETE EKLE 🛒"
            : "BERRAFLOWER HEDİYESİNİ GÖNDER"}
        </button>
 
      </div>
    </div>
  );
}
