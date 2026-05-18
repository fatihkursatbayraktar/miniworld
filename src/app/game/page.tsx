"use client";
 
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import HUD from "@/components/HUD";
import EmojiSelector from "@/components/EmojiSelector";
import BerraflowerShop from "@/components/BerraflowerShop";
import BackpackInventory from "@/components/BackpackInventory";
import Hotbar from "@/components/Hotbar";
import EcrinJewelShop from "@/components/EcrinJewelShop";
import CafeMenu from "@/components/CafeMenu";
import GhaliaLoungeMenu from "@/components/GhaliaLoungeMenu";
import VirtualJoystick from "@/components/VirtualJoystick";
 
// Dynamically import GameCanvas with SSR disabled since Phaser is a client-side library
const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-screen bg-[#0b0e17] flex flex-col items-center justify-center gap-4 text-[#ebeef5]">
      <div className="w-10 h-10 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
      <span className="font-display font-semibold text-sm tracking-wider animate-pulse">
        Creating Digital Sanctuary...
      </span>
    </div>
  ),
});
 
function GameContainer() {
  const searchParams = useSearchParams();
 
  // Read URL configurations (fallbacks to default onboarding)
  const nickname = searchParams.get("nickname") || "Sunny";
  const gender = searchParams.get("gender") || "girl";
  const avatarColor = searchParams.get("avatarColor") || "#fb7185";
  const hairStyle = searchParams.get("hairStyle") || "short";
  const hairColor = searchParams.get("hairColor") || "#78350f";
  const playMode = searchParams.get("playMode") || "ai";
  const roomCode = searchParams.get("roomCode") || "1234";
 
  return (
    <main className="w-full h-full min-h-screen bg-[#0b0e17] relative select-none touch-none overflow-hidden flex flex-col">
      {/* 1. Phaser Game Engine Canvas */}
      <GameCanvas
        playMode={playMode}
        nickname={nickname}
        gender={gender}
        avatarColor={avatarColor}
        hairStyle={hairStyle}
        hairColor={hairColor}
        roomCode={roomCode}
      />
 
      {/* 2. React Glassmorphic HUD */}
      <HUD />
 
      {/* 3. Radial Emoji Picker */}
      <EmojiSelector />
 
      {/* 4. Cozy Stardew Valley Berraflower Florist Shop Modal */}
      <BerraflowerShop />
 
      {/* 4.5. Sırt Çantası (Backpack Inventory) Modal */}
      <BackpackInventory />

      {/* 4.6. Minecraft-style Hotbar & Partner Gifting */}
      <Hotbar />

      {/* 6. Luxury Ecrin Jewel Shop Modal */}
      <EcrinJewelShop />
 
      {/* 7. Cozy Cafe & Restaurant Order Menu Modal */}
      <CafeMenu />
 
      {/* 7.5. Ghalia Lounge Luxury Bosphorus Restaurant Modal */}
      <GhaliaLoungeMenu />
 
      {/* 8. Virtual D-Pad Touch Joystick for Mobile screen sizes */}
      <VirtualJoystick />
    </main>
  );
}
 
export default function GamePage() {
  return (
    <Suspense 
      fallback={
        <div className="w-full h-full min-h-screen bg-[#0b0e17] flex flex-col items-center justify-center gap-4 text-[#ebeef5]">
          <div className="w-10 h-10 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
          <span className="font-display font-semibold text-sm tracking-wider animate-pulse">
            Aligning Space Timelines...
          </span>
        </div>
      }
    >
      <GameContainer />
    </Suspense>
  );
}
