"use client";

import React, { useState, useEffect, useRef } from "react";

export default function VirtualJoystick() {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Initialize global velocity state
    (window as any).joystickVelocity = { x: 0, y: 0 };
    
    const interval = setInterval(() => {
      const isAnyModalOpen = !!document.querySelector('.fixed.inset-0[class*="backdrop-blur"]');
      setIsMenuOpen(isAnyModalOpen);
    }, 200);

    return () => {
      (window as any).joystickVelocity = { x: 0, y: 0 };
      clearInterval(interval);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setActive(true);
    handleTouchMove(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;

    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    
    // Joystick center point
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Displacement delta coordinates
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;

    const maxRadius = 50; // clamp radius of stick drift
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setPosition({ x: dx, y: dy });

    // Normalize velocity vector output between -1.0 and 1.0
    (window as any).joystickVelocity = {
      x: dx / maxRadius,
      y: dy / maxRadius
    };
  };

  const handleTouchEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    (window as any).joystickVelocity = { x: 0, y: 0 };
  };

  if (isMenuOpen) return null;
 
  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`fixed bottom-8 left-8 z-[8000] flex items-center justify-center w-28 h-28 rounded-full border border-white/10 transition-all duration-300 ${
        active ? "bg-slate-900/40 scale-105 border-violet-400/20" : "bg-slate-950/20"
      } backdrop-blur-md select-none touch-none pointer-events-auto md:hidden`}
    >
      {/* Outer Glow boundary */}
      <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
        active ? "shadow-[0_0_15px_rgba(139,92,246,0.15)] bg-violet-500/5" : ""
      }`} />

      {/* Center D-Pad hub */}
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
        className={`w-12 h-12 rounded-full shadow-lg transition-transform duration-75 cursor-grab active:cursor-grabbing flex items-center justify-center ${
          active 
            ? "bg-violet-400/80 shadow-violet-500/20 border border-violet-300/30" 
            : "bg-white/15 border border-white/10"
        }`}
      >
        {/* Core Thumb handle */}
        <div className={`w-4 h-4 rounded-full transition-all ${
          active ? "bg-white scale-75" : "bg-white/30"
        }`} />
      </div>
    </div>
  );
}
