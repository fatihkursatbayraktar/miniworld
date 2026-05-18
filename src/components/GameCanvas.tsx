"use client";
 
import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import BootScene from "@/game/scenes/BootScene";
import MainScene from "@/game/scenes/MainScene";
import FloristInteriorScene from "@/game/scenes/FloristInteriorScene";
import JewelerInteriorScene from "@/game/scenes/JewelerInteriorScene";
import RestaurantInteriorScene from "@/game/scenes/RestaurantInteriorScene";
import AirHockeyScene from "@/game/scenes/AirHockeyScene";
import BowlingScene from "@/game/scenes/BowlingScene";
import BilliardsScene from "@/game/scenes/BilliardsScene";
import GoKartScene from "@/game/scenes/GoKartScene";
 
interface GameCanvasProps {
  playMode: string;
  nickname: string;
  gender: string;
  avatarColor: string;
  hairStyle: string;
  hairColor: string;
  roomCode?: string;
}
 
export default function GameCanvas({
  playMode,
  nickname,
  gender,
  avatarColor,
  hairStyle,
  hairColor,
  roomCode = "1234"
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
 
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
 
    // Convert hex color strings into 0x hex numbers for Phaser tinting
    const parsedAvatarColor = parseInt(avatarColor.replace("#", "0x"), 16) || 0xfb7185;
    const parsedHairColor = parseInt(hairColor.replace("#", "0x"), 16) || 0x78350f;
 
    // Calculate responsive full viewport size
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
 
    // Phaser Game Config
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: viewportWidth,
      height: viewportHeight,
      backgroundColor: "#0b0e17",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false // Keep visually clean and polished
        }
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      antialias: true,
      pixelArt: false, // vector dynamic textures rendered, keep smoothing active
      scene: [BootScene, MainScene, FloristInteriorScene, JewelerInteriorScene, RestaurantInteriorScene, AirHockeyScene, BowlingScene, BilliardsScene, GoKartScene]
    };
 
    // Instantiate Phaser
    const game = new Phaser.Game(config);
    gameRef.current = game;
    (window as any).phaserGame = game;
 
    // Push initial user parameters into registry
    game.registry.set("playMode", playMode);
    game.registry.set("nickname", nickname);
    game.registry.set("gender", gender);
    game.registry.set("avatarColor", parsedAvatarColor);
    game.registry.set("hairStyle", hairStyle);
    game.registry.set("hairColor", parsedHairColor);
    game.registry.set("roomCode", roomCode);
 
    // Persist inventory state per room in localStorage
    let savedInventory = [];
    try {
      const stored = localStorage.getItem(`inventory_${roomCode}`);
      if (stored) savedInventory = JSON.parse(stored);
    } catch (e) {}
    game.registry.set("inventory", savedInventory);

    game.registry.events.on("changedata-inventory", (parent: any, value: any) => {
      try {
        localStorage.setItem(`inventory_${roomCode}`, JSON.stringify(value || []));
      } catch (e) {}
    });
 
    // Responsive window resizing listener
    const handleResize = () => {
      if (gameRef.current && containerRef.current) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        gameRef.current.scale.resize(w, h);
 
        const activeScene = gameRef.current.scene.getScene("MainScene");
        if (activeScene && activeScene.cameras.main) {
          activeScene.cameras.main.setSize(w, h);
        }
      }
    };
 
    window.addEventListener("resize", handleResize);
 
    return () => {
      window.removeEventListener("resize", handleResize);
      
      // Stop all procedural audio loops
      const { cozyAudio } = require("@/utils/audio");
      cozyAudio.stopRain();
      cozyAudio.stopRiver();
      cozyAudio.stopPiano();
      cozyAudio.stopAutoChimes();
 
      // Destroy Phaser Instance
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        delete (window as any).phaserGame;
      }
      console.log("Phaser cozy sandbox destroyed cleanly.");
    };
  }, [playMode, nickname, gender, avatarColor, hairStyle, hairColor, roomCode]);
 
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-screen bg-[#0b0e17] overflow-hidden select-none touch-none pointer-events-auto" 
    />
  );
}
