"use client";

import React, { useState } from "react";
import { Smile, X } from "lucide-react";
import { cozyAudio } from "@/utils/audio";

export default function EmojiSelector() {
  const [isOpen, setIsOpen] = useState(false);

  const emojis = ["💖", "🌸", "☕", "🌟", "🐱", "💤", "🎈", "☔"];

  const handleEmojiClick = (emoji: string) => {
    cozyAudio.playCuteBubble();
    
    // Bridge to active Phaser MainScene
    const phaserGame = (window as any).phaserGame;
    if (phaserGame) {
      const mainScene = phaserGame.scene.getScene("MainScene");
      if (mainScene && mainScene.scene.isActive()) {
        mainScene.triggerLocalEmote(emoji);
      }
    }

    setIsOpen(false);
  };

  const handleToggle = () => {
    cozyAudio.playClick();
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[8000] flex flex-col items-end pointer-events-none select-none">
      {/* Emojis Fan layout */}
      <div className={`relative flex items-center justify-center transition-all duration-300 ${
        isOpen ? "h-32 w-32 scale-100 opacity-100 mb-4" : "h-0 w-0 scale-75 opacity-0 mb-0"
      }`}>
        {/* Radial Layout coordinates */}
        {emojis.map((emoji, index) => {
          const angle = (index * Math.PI * 2) / emojis.length;
          const radius = 54; // radial fan radius px
          const tx = Math.cos(angle) * radius;
          const ty = Math.sin(angle) * radius;

          return (
            <button
              key={index}
              onClick={() => handleEmojiClick(emoji)}
              style={{
                transform: isOpen ? `translate(${tx}px, ${ty}px)` : "translate(0px, 0px)",
              }}
              className="absolute pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full border border-white/10 glass-light text-xl hover:scale-125 hover:bg-white/20 active:scale-95 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-violet-500/10"
            >
              {emoji}
            </button>
          );
        })}
      </div>

      {/* Main trigger button */}
      <button
        onClick={handleToggle}
        className="pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full shadow-lg border border-white/10 hover:border-violet-400/30 glass hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer text-violet-300 hover:text-white"
      >
        {isOpen ? <X className="w-6 h-6 animate-pulse" /> : <Smile className="w-6 h-6" />}
      </button>
    </div>
  );
}
