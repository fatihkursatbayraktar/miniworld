"use client";

import React, { useState, useEffect } from "react";
import { X, Utensils, Coffee, CreditCard, Sparkles } from "lucide-react";
import { cozyAudio } from "@/utils/audio";

// Ghalia Lounge Menu Items
const MENU_FOOD = [
  { id: "steak", name: "Bonfile Lokum (Köz Sebzeler İle)", price: 820, desc: "Ateş ızgarasında pişmiş, tereyağlı lokum bonfile dilimleri.", icon: "🥩" },
  { id: "lamb", name: "Tandır Kuzu Pirzola", price: 750, desc: "Ağır ateşte pişmiş, kekikli taze kuzu pirzola ve iç pilav.", icon: "🍗" },
  { id: "fish", name: "Izgara Ege Levreği", price: 680, desc: "Ege sularından taze levrek, roka, kırmızı soğan ve limon sosu.", icon: "🐟" }
];

const MENU_DRINK = [
  { id: "cocktail", name: "Premium Meyve Kokteyli", price: 180, desc: "Taze orman meyveleri ve tropikal tatların lüks harmanı.", icon: "🍹" },
  { id: "lemonade", name: "Ev Yapımı Nane Limonata", price: 120, desc: "Taze nane yaprakları ve ezilmiş organik limon ferahlığı.", icon: "🍋" }
];

export default function GhaliaLoungeMenu() {
  const [activeModal, setActiveModal] = useState<"none" | "menu" | "tea" | "bill">("none");
  const [selectedFood, setSelectedFood] = useState(MENU_FOOD[0]);
  const [selectedDrink, setSelectedDrink] = useState(MENU_DRINK[0]);

  useEffect(() => {
    // 1. Listen for Phaser menu triggers
    (window as any).triggerGhaliaMenuOpen = () => {
      cozyAudio.playCuteBubble();
      setActiveModal("menu");
    };

    (window as any).triggerGhaliaTeaModal = () => {
      cozyAudio.playCuteBubble();
      setActiveModal("tea");
    };

    (window as any).triggerGhaliaBillModal = () => {
      cozyAudio.playCuteBubble();
      setActiveModal("bill");
    };

    return () => {
      delete (window as any).triggerGhaliaMenuOpen;
      delete (window as any).triggerGhaliaTeaModal;
      delete (window as any).triggerGhaliaBillModal;
    };
  }, []);

  const handleOrder = () => {
    cozyAudio.playClick();
    setActiveModal("none");
    if ((window as any).triggerGhaliaOrder) {
      (window as any).triggerGhaliaOrder(selectedFood.name, selectedDrink.name);
    }
  };

  const handleTeaSelection = (wantsTea: boolean) => {
    cozyAudio.playClick();
    setActiveModal("none");
    if ((window as any).triggerGhaliaTeaResponse) {
      (window as any).triggerGhaliaTeaResponse(wantsTea);
    }
  };

  const handlePay = () => {
    cozyAudio.playClick();
    setActiveModal("none");
    if ((window as any).triggerGhaliaBillPaid) {
      (window as any).triggerGhaliaBillPaid();
    }
  };

  if (activeModal === "none") return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      {/* ── STAGE 1: ORDERING MENU ────────────────────────────────────────── */}
      {activeModal === "menu" && (
        <div className="w-full max-w-4xl bg-[#0f172a] rounded-2xl border-2 border-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.25)] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#d4af37]/30 bg-gradient-to-r from-[#1e293b] to-[#0f172a]">
            <div className="flex items-center gap-3">
              <span className="text-3xl filter drop-shadow-md">🍷</span>
              <div>
                <h2 className="text-2xl font-bold text-[#d4af37] font-display tracking-wide drop-shadow-md">
                  Ghalia Lounge
                </h2>
                <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider">
                  Boğaz Manzaralı Seçkin Akşam Menüsü
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                cozyAudio.playClick();
                setActiveModal("none");
              }}
              className="p-2 text-[#94a3b8] hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body content */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden p-6 gap-6 bg-[#0b0f19]">
            {/* Left: Food Section */}
            <div className="flex-1 flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-[#f8fafc] flex items-center gap-2 border-b border-slate-800 pb-2">
                <Utensils className="w-5 h-5 text-[#d4af37]" />
                Ana Yemek Seçimi (Çift Kişilik)
              </h3>
              <div className="flex flex-col gap-3">
                {MENU_FOOD.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => {
                      cozyAudio.playClick();
                      setSelectedFood(food);
                    }}
                    className={`p-4 rounded-xl border flex items-center gap-4 transition-all text-left ${
                      selectedFood.id === food.id
                        ? "bg-gradient-to-r from-[#d4af37]/15 to-transparent border-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.15)] scale-[1.01]"
                        : "bg-[#1e293b] border-slate-800 hover:border-[#d4af37]/50 hover:bg-[#1e293b]/70"
                    }`}
                  >
                    <span className="text-3xl bg-[#0f172a] p-3 rounded-lg border border-slate-800 shadow-inner">{food.icon}</span>
                    <div className="flex-1">
                      <p className="text-[#f8fafc] font-semibold text-sm">{food.name}</p>
                      <p className="text-[#94a3b8] text-xs mt-1 leading-relaxed">{food.desc}</p>
                    </div>
                    <p className="text-[#d4af37] font-bold text-sm">₺{food.price}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Drink Section */}
            <div className="w-full md:w-80 flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-[#f8fafc] flex items-center gap-2 border-b border-slate-800 pb-2">
                <Coffee className="w-5 h-5 text-[#d4af37]" />
                İçecek Seçimi
              </h3>
              <div className="flex flex-col gap-3">
                {MENU_DRINK.map((drink) => (
                  <button
                    key={drink.id}
                    onClick={() => {
                      cozyAudio.playClick();
                      setSelectedDrink(drink);
                    }}
                    className={`p-4 rounded-xl border flex items-center gap-4 transition-all text-left ${
                      selectedDrink.id === drink.id
                        ? "bg-gradient-to-r from-[#d4af37]/15 to-transparent border-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.15)] scale-[1.01]"
                        : "bg-[#1e293b] border-slate-800 hover:border-[#d4af37]/50 hover:bg-[#1e293b]/70"
                    }`}
                  >
                    <span className="text-2xl bg-[#0f172a] p-2.5 rounded-lg border border-slate-800">{drink.icon}</span>
                    <div className="flex-1">
                      <p className="text-[#f8fafc] font-semibold text-sm">{drink.name}</p>
                      <p className="text-[#d4af37] font-bold text-xs mt-0.5">₺{drink.price}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Order Box summary */}
              <div className="mt-auto bg-[#1e293b] border border-[#d4af37]/30 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs text-[#94a3b8]">
                  <span>2x {selectedFood.name}</span>
                  <span className="text-[#f8fafc]">₺{selectedFood.price * 2}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#94a3b8]">
                  <span>2x {selectedDrink.name}</span>
                  <span className="text-[#f8fafc]">₺{selectedDrink.price * 2}</span>
                </div>
                <div className="h-px bg-slate-800 my-1" />
                <div className="flex justify-between items-center font-bold">
                  <span className="text-[#f8fafc] text-sm">Toplam Sipariş</span>
                  <span className="text-[#d4af37] text-base">₺{(selectedFood.price + selectedDrink.price) * 2}</span>
                </div>
                <button
                  onClick={handleOrder}
                  className="w-full bg-[#d4af37] hover:bg-[#b4902c] text-[#0f172a] font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 shadow-[0_4px_12px_rgba(212,175,55,0.2)]"
                >
                  Siparişi Tamamla 🍽️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE 2: TEA & DESSERT OFFER MODAL ─────────────────────────────── */}
      {activeModal === "tea" && (
        <div className="w-full max-w-md bg-[#0f172a] rounded-2xl border-2 border-[#d4af37] shadow-[0_0_35px_rgba(212,175,55,0.3)] p-6 text-center animate-in zoom-in-95 duration-300">
          <span className="text-5xl filter drop-shadow-md block mb-4">☕🍰</span>
          <h2 className="text-xl font-bold text-[#d4af37] mb-2 font-display">Ghalia Lounge İkramı</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Yemeklerinizin ardından meşhur şerbetli fıstıklı baklavamız ve taze demlenmiş tavşan kanı Türk çayımız şefimizin ikramıdır. Kabul etmek ister misiniz?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleTeaSelection(true)}
              className="w-full bg-[#d4af37] hover:bg-[#b4902c] text-[#0f172a] font-bold py-3 rounded-xl transition-all shadow-[0_4px_12px_rgba(212,175,55,0.2)] flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Tabii ki, Çok İyi Olur! 😍
            </button>
            <button
              onClick={() => handleTeaSelection(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-all"
            >
              Hayır Teşekkürler, Hesabı Alalım.
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE 3: THE BILL / CHECKOUT ───────────────────────────────────── */}
      {activeModal === "bill" && (
        <div className="w-full max-w-sm bg-[#1a0e05] rounded-2xl border-2 border-[#d4af37] shadow-[0_0_40px_rgba(212,175,55,0.45)] overflow-hidden animate-in zoom-in-95 duration-300">
          {/* Header booklet style */}
          <div className="bg-[#2d1508] border-b border-[#d4af37]/40 p-4 text-center">
            <h3 className="text-[#d4af37] font-bold text-lg font-display tracking-widest uppercase">Ghalia Lounge</h3>
            <p className="text-[#a16207] text-xs font-semibold uppercase tracking-wider mt-0.5">Ödeme Klasörü</p>
          </div>

          <div className="p-6 bg-[#fffdfa] text-slate-800 font-mono text-sm flex flex-col gap-3 shadow-inner">
            <div className="text-center font-bold border-b-2 border-dashed border-slate-400 pb-2 mb-2 text-slate-900 uppercase">
              Hesap Dökümü
            </div>
            
            <div className="flex justify-between">
              <span>2x {selectedFood.name.split(" ")[0]}</span>
              <span>₺{selectedFood.price * 2}</span>
            </div>
            <div className="flex justify-between">
              <span>2x {selectedDrink.name.split(" ")[2]}</span>
              <span>₺{selectedDrink.price * 2}</span>
            </div>
            <div className="flex justify-between text-xs text-emerald-700 font-bold">
              <span>2x Şefin Çay & Baklava İkramı</span>
              <span>₺0</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Hizmet Bedeli (%8)</span>
              <span>₺150</span>
            </div>

            <div className="border-t-2 border-dashed border-slate-400 pt-3 mt-2 flex justify-between items-center font-bold text-base text-slate-950">
              <span>GENEL TOPLAM</span>
              <span>₺{(selectedFood.price + selectedDrink.price) * 2 + 150}</span>
            </div>

            <div className="text-center text-xs text-slate-500 mt-4 leading-normal">
              Bizi tercih ettiğiniz için teşekkür ederiz.<br />Ghalia Lounge - Istanbul Strait
            </div>
          </div>

          <div className="p-4 bg-[#2d1508] border-t border-[#d4af37]/30 flex flex-col gap-2">
            <button
              onClick={handlePay}
              className="w-full bg-[#d4af37] hover:bg-[#b4902c] text-[#0f172a] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(212,175,55,0.2)]"
            >
              <CreditCard className="w-5 h-5" />
              Hesabı Öde 💳
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
