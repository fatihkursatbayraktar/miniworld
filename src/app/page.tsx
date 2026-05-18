"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, User, Settings, ArrowRight, UserCheck } from "lucide-react";
import { cozyAudio } from "@/utils/audio";

export default function OnboardingPage() {
  const router = useRouter();

  // Avatar customization states
  const [nickname, setNickname] = useState("Sunny");
  const [gender, setGender] = useState("girl"); // "girl" | "boy"
  const [avatarColor, setAvatarColor] = useState("#fb7185"); // default pastel rose
  const [hairStyle, setHairStyle] = useState("short"); // girl: "short"|"long"|"spiky" boy: "messy"|"undercut"|"spiky"
  const [hairColor, setHairColor] = useState("#78350f"); // warm brown
  const [playMode, setPlayMode] = useState("network"); // Always network/multiplayer!
  const [roomCode, setRoomCode] = useState("1234");
  const [netAction, setNetAction] = useState<"create" | "join">("create");

  // Real-time Active Lobbies Directory
  const [activeLobbies, setActiveLobbies] = useState<Record<string, {
    roomCode: string;
    hostName: string;
    avatarColor: string;
    gender: string;
    lastActive: number;
  }>>({});

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pulseInterval: any = null;

    try {
      // Connect to a central lobby directory channel using the same free public broker
      ws = new WebSocket("wss://demo.piesocket.com/v3/together-cozy-world-lobby-directory?api_key=VCXCEJZvOyM643QC29X9wN663a8a3299a9a3b9&notify_self=0");

      ws.onopen = () => {
        // Send initial pulse if we are currently hosting
        if (netAction === "create") {
          try {
            ws?.send(JSON.stringify({
              type: "lobby_pulse",
              roomCode,
              hostName: nickname,
              avatarColor,
              gender,
              timestamp: Date.now()
            }));
          } catch (e) {}
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === "lobby_pulse" && data.roomCode) {
            setActiveLobbies((prev) => ({
              ...prev,
              [data.roomCode]: {
                roomCode: data.roomCode,
                hostName: data.hostName || "Gizemli Ev Sahibi",
                avatarColor: data.avatarColor || "#fb7185",
                gender: data.gender || "girl",
                lastActive: Date.now()
              }
            }));
          }
        } catch (e) {}
      };
    } catch (e) {
      console.warn("Lobby directory failed to initialize:", e);
    }

    // Periodically send pulses if hosting, and clear stale lobbies
    pulseInterval = setInterval(() => {
      if (netAction === "create" && ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: "lobby_pulse",
            roomCode,
            hostName: nickname,
            avatarColor,
            gender,
            timestamp: Date.now()
          }));
        } catch (e) {}
      }

      // Cleanup stale lobbies (no pulse received in the last 8 seconds)
      setActiveLobbies((prev) => {
        const next = { ...prev };
        let changed = false;
        const now = Date.now();
        Object.keys(next).forEach((key) => {
          if (now - next[key].lastActive > 8000) {
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 3000);

    return () => {
      if (ws) ws.close();
      if (pulseInterval) clearInterval(pulseInterval);
    };
  }, [netAction, roomCode, nickname, avatarColor, gender]);

  const sweaterColors = [
    { name: "Rose", hex: "#fb7185" },
    { name: "Lavender", hex: "#c084fc" },
    { name: "Amber", hex: "#fbbf24" },
    { name: "Mint", hex: "#34d399" },
    { name: "Sky", hex: "#60a5fa" },
  ];

  const hairColors = [
    { name: "Brown", hex: "#78350f" },
    { name: "Espresso", hex: "#1e293b" },
    { name: "Gold", hex: "#eab308" },
    { name: "Orchid", hex: "#ec4899" },
    { name: "Silver", hex: "#94a3b8" }
  ];

  useEffect(() => {
    // Fetch persisted settings from localStorage
    if (typeof window !== "undefined") {
      const savedNickname = localStorage.getItem("cozy_nickname");
      if (savedNickname) setNickname(savedNickname);
      
      const savedGender = localStorage.getItem("cozy_gender");
      if (savedGender) setGender(savedGender);
      
      const savedAvatarColor = localStorage.getItem("cozy_avatar_color");
      if (savedAvatarColor) setAvatarColor(savedAvatarColor);
      
      const savedHairStyle = localStorage.getItem("cozy_hair_style");
      if (savedHairStyle) setHairStyle(savedHairStyle);
      
      const savedHairColor = localStorage.getItem("cozy_hair_color");
      if (savedHairColor) setHairColor(savedHairColor);

      const savedRoomCode = localStorage.getItem("cozy_room_code");
      if (savedRoomCode) {
        setRoomCode(savedRoomCode);
        setNetAction("join"); // if they had a saved room code, they are likely joining/returning!
      } else {
        // Generate a random 4-digit code by default
        const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
        setRoomCode(randomCode);
      }
    }

    const handleFirstClick = () => {
      cozyAudio.init();
      cozyAudio.playChime();
      document.removeEventListener("click", handleFirstClick);
    };
    document.addEventListener("click", handleFirstClick);
    return () => document.removeEventListener("click", handleFirstClick);
  }, []);

  const handleEnterWorld = () => {
    cozyAudio.playGiftBell();

    // Persist customizations so page refresh preserves everything!
    if (typeof window !== "undefined") {
      localStorage.setItem("cozy_nickname", nickname);
      localStorage.setItem("cozy_gender", gender);
      localStorage.setItem("cozy_avatar_color", avatarColor);
      localStorage.setItem("cozy_hair_style", hairStyle);
      localStorage.setItem("cozy_hair_color", hairColor);
      localStorage.setItem("cozy_room_code", roomCode);
    }

    const params = new URLSearchParams({
      nickname,
      gender,
      avatarColor,
      hairStyle,
      hairColor,
      playMode: "network", // Always network/multiplayer!
      roomCode
    });

    router.push(`/game?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#15192c] via-[#0b0e17] to-[#04060b] flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      
      {/* Dynamic Background Twinkling stars */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-4xl rounded-3xl glass p-6 md:p-10 shadow-2xl border-white/5 glow-neon grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 text-[#ebeef5] relative overflow-hidden backdrop-blur-xl">
        
        {/* Abstract Corner Glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

        {/* LEFT PANEL: Chibi Live Previewer */}
        <div className="flex flex-col items-center justify-center gap-6 relative">
          
          <div className="text-center flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-bold font-display tracking-wider flex items-center justify-center gap-2">
              TOGETHER <Heart className="w-6 h-6 text-rose-500 fill-rose-500 animate-pulse" />
            </h1>
            <p className="text-xs text-violet-300 font-sans uppercase tracking-widest leading-relaxed">
              Çiftler İçin Huzurlu Dijital Yaşam Alanı
            </p>
          </div>

          {/* Interactive Chibi SVG Mockup Display */}
          <div className="relative w-48 h-48 rounded-full bg-slate-950/45 border border-white/10 flex items-center justify-center shadow-inner overflow-hidden shadow-violet-500/5 group">
            
            {/* Soft pulsing halo */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent animate-pulse-slow" />

            {/* Bouncing Chibi Figure */}
            <div className="relative w-28 h-36 flex flex-col items-center justify-end animate-float">
              
              {/* Drop Shadow */}
              <div className="w-16 h-3 bg-black/45 rounded-full filter blur-[1px] absolute bottom-1" />

              {/* Torso (Sweater) */}
              <div 
                style={{ backgroundColor: avatarColor }}
                className="w-10 h-12 rounded-t-xl rounded-b-md shadow-md border-t border-white/20 relative z-10"
              >
                {/* Collar */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-slate-950/20 rounded-b-full" />
                {/* Tiny buttons */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col gap-1">
                  <div className="w-1 h-1 rounded-full bg-white/40" />
                  <div className="w-1 h-1 rounded-full bg-white/40" />
                </div>
              </div>

              {/* Round Head */}
              <div className="w-12 h-12 rounded-full bg-[#ffe4e6] absolute bottom-9 z-20 flex flex-col justify-end p-2 relative shadow-inner">
                {/* Rosy blush cheeks */}
                <div className="absolute bottom-2.5 left-1 w-3 h-2 rounded-full bg-rose-400/40 blur-[1px]" />
                <div className="absolute bottom-2.5 right-1 w-3 h-2 rounded-full bg-rose-400/40 blur-[1px]" />
                
                {/* Shiny Cute Anime Eyes */}
                <div className="flex justify-between px-1 mb-1.5">
                  <div className="w-2.5 h-3.5 bg-slate-800 rounded-full flex items-start justify-start p-0.5 relative">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                  <div className="w-2.5 h-3.5 bg-slate-800 rounded-full flex items-start justify-start p-0.5 relative">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                </div>

                {/* Sweet smile */}
                <div className="w-2.5 h-1.5 border-b-2 border-slate-800 rounded-b-full absolute bottom-1.5 left-1/2 -translate-x-1/2" />
              </div>

              {/* Hairstyle Render */}
              <div 
                style={{ color: hairColor }}
                className="absolute z-30 bottom-16 w-14 h-8 flex items-end justify-center"
              >
                {gender === "girl" ? (
                  <>
                    {hairStyle === "short" && (
                      <div className="w-14 h-8 rounded-t-full bg-current relative">
                        {/* bangs */}
                        <div className="absolute top-7 left-1.5 w-3 h-2 bg-current rounded-b-lg" />
                        <div className="absolute top-7 right-1.5 w-3 h-2 bg-current rounded-b-lg" />
                      </div>
                    )}
                    {hairStyle === "long" && (
                      <div className="w-14 h-8 rounded-t-full bg-current relative">
                        {/* space buns */}
                        <div className="absolute -top-2.5 -left-1.5 w-6 h-6 rounded-full bg-current" />
                        <div className="absolute -top-2.5 -right-1.5 w-6 h-6 rounded-full bg-current" />
                        {/* bangs */}
                        <div className="absolute top-7 left-1.5 w-3 h-2 bg-current rounded-b-lg" />
                        <div className="absolute top-7 right-1.5 w-3 h-2 bg-current rounded-b-lg" />
                      </div>
                    )}
                    {hairStyle === "spiky" && (
                      <div className="w-14 h-8 rounded-t-full bg-current relative flex items-end">
                        {/* Spiky crown layers */}
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-current" />
                        <div className="absolute -top-1.5 left-2 w-3.5 h-3.5 rotate-12 bg-current" />
                        <div className="absolute -top-1.5 right-2 w-3.5 h-3.5 -rotate-12 bg-current" />
                        {/* Side fringe */}
                        <div className="absolute top-5 -left-1 w-2.5 h-4 bg-current rounded-b-md" />
                        <div className="absolute top-5 -right-1 w-2.5 h-4 bg-current rounded-b-md" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {hairStyle === "messy" && (
                      <div className="w-14 h-6 rounded-t-xl bg-current relative flex items-end">
                        {/* Messy bangs */}
                        <div className="absolute -top-2 left-1 w-4 h-3 rounded-full bg-current rotate-12" />
                        <div className="absolute -top-2.5 left-5 w-5 h-3.5 rounded-full bg-current -rotate-6" />
                        <div className="absolute -top-2 right-1 w-4 h-3 rounded-full bg-current -rotate-12" />
                        {/* Fringe */}
                        <div className="absolute top-4 left-1 w-2.5 h-2.5 bg-current rounded-b-md rotate-12" />
                        <div className="absolute top-4 left-5.5 w-3 h-3 bg-current rounded-b-md" />
                        <div className="absolute top-4 right-1 w-2.5 h-2.5 bg-current rounded-b-md -rotate-12" />
                      </div>
                    )}
                    {hairStyle === "undercut" && (
                      <div className="w-14 h-6 rounded-t-md bg-current relative">
                        {/* Shaved sides */}
                        <div className="absolute top-4 left-0 w-2.5 h-3 bg-current/25" />
                        <div className="absolute top-4 right-0 w-2.5 h-3 bg-current/25" />
                        {/* Swept top */}
                        <div className="absolute -top-3.5 left-2.5 w-9 h-7 rounded-t-full bg-current skew-x-6" />
                        <div className="absolute top-2 left-1.5 w-2.5 h-2.5 bg-current rounded-b-lg" />
                      </div>
                    )}
                    {hairStyle === "spiky" && (
                      <div className="w-14 h-6 rounded-t-lg bg-current relative">
                        {/* anime spiky top */}
                        <div className="absolute -top-3 left-2.5 w-3.5 h-3.5 rotate-45 bg-current" />
                        <div className="absolute -top-3.5 left-5 w-4 h-4 rotate-12 bg-current" />
                        <div className="absolute -top-3 right-2.5 w-3.5 h-3.5 -rotate-45 bg-current" />
                        {/* fringe spikes */}
                        <div className="absolute top-4 left-1.5 w-2 h-2 bg-current rounded-b-lg rotate-12" />
                        <div className="absolute top-4 right-1.5 w-2 h-2 bg-current rounded-b-lg -rotate-12" />
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          </div>

          <p className="text-xs text-slate-400 font-sans italic">
            "Prosedürel vektör grafikleri, 60fps akıcı hız."
          </p>
        </div>

        {/* RIGHT PANEL: Customization Menu panel */}
        <div className="flex flex-col gap-6 select-none pointer-events-auto">
          
          {/* Nickname */}
          {/* Character Style Selection (Gender) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Karakter Tarzı</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  cozyAudio.playClick();
                  setGender("girl");
                  setHairStyle("short");
                }}
                className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
                  gender === "girl"
                    ? "bg-rose-500/15 border-rose-400/50 text-rose-200"
                    : "bg-white/5 border-white/5 hover:border-white/10 text-slate-400"
                }`}
              >
                👧 Kız Karakter
              </button>
              <button
                onClick={() => {
                  cozyAudio.playClick();
                  setGender("boy");
                  setHairStyle("messy");
                }}
                className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
                  gender === "boy"
                    ? "bg-sky-500/15 border-sky-400/50 text-sky-200"
                    : "bg-white/5 border-white/5 hover:border-white/10 text-slate-400"
                }`}
              >
                👦 Erkek Karakter
              </button>
            </div>
          </div>

          {/* Nickname Input moved up for styling flow */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-violet-400" />
              Karakter Adı
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.substring(0, 12))}
              placeholder="Adını gir..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-white/10 focus:border-violet-400/50 focus:outline-none transition-all text-sm font-semibold tracking-wide font-display text-white"
            />
          </div>

          {/* Sweaters Color Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-violet-400" />
              Tatlı Kazak Rengi
            </label>
            <div className="flex gap-3">
              {sweaterColors.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => { cozyAudio.playClick(); setAvatarColor(c.hex); }}
                  style={{ backgroundColor: c.hex }}
                  className={`w-9 h-9 rounded-full cursor-pointer transition-all ${
                    avatarColor === c.hex
                      ? "ring-4 ring-violet-400/40 scale-110 shadow-lg"
                      : "hover:scale-105"
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Hairstyle Styling Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saç Stili</label>
            <div className="grid grid-cols-3 gap-3">
              {gender === "girl" ? (
                [
                  { id: "short", label: "Kısa Kesim" },
                  { id: "long", label: "Çift Topuz" },
                  { id: "spiky", label: "Dikenli Anime" }
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => { cozyAudio.playClick(); setHairStyle(style.id); }}
                    className={`py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                      hairStyle === style.id
                        ? "bg-violet-500/15 border-violet-400/50 text-violet-200"
                        : "bg-white/5 border-white/5 hover:border-white/10 text-slate-400"
                    }`}
                  >
                    {style.label}
                  </button>
                ))
              ) : (
                [
                  { id: "messy", label: "Dağınık Dalgalı" },
                  { id: "undercut", label: "Modern Tıraş" },
                  { id: "spiky", label: "Dikenli Anime" }
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => { cozyAudio.playClick(); setHairStyle(style.id); }}
                    className={`py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                      hairStyle === style.id
                        ? "bg-violet-500/15 border-violet-400/50 text-violet-200"
                        : "bg-white/5 border-white/5 hover:border-white/10 text-slate-400"
                    }`}
                  >
                    {style.label}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Hair Colors Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saç Tonu</label>
            <div className="flex gap-3">
              {hairColors.map((hc) => (
                <button
                  key={hc.hex}
                  onClick={() => { cozyAudio.playClick(); setHairColor(hc.hex); }}
                  style={{ backgroundColor: hc.hex }}
                  className={`w-8 h-8 rounded-full border border-white/10 cursor-pointer transition-all ${
                    hairColor === hc.hex
                      ? "ring-4 ring-violet-400/40 scale-110 shadow-lg"
                      : "hover:scale-105"
                  }`}
                  title={hc.name}
                />
              ))}
            </div>
          </div>

          {/* Connection Mode Options */}
          <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-violet-400" />
              Oyun Bağlantısı
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  cozyAudio.playClick();
                  setNetAction("create");
                  const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
                  setRoomCode(randomCode);
                }}
                className={`flex flex-col gap-1 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  netAction === "create"
                    ? "bg-violet-500/15 border-violet-400/50 shadow-md shadow-violet-500/5"
                    : "bg-white/5 border-white/5 hover:border-white/10"
                }`}
              >
                <span className="text-xs font-bold font-display text-violet-200">🏠 Oda Oluştur</span>
                <span className="text-[10px] text-slate-400">Yeni bir oda kodu aç ve sevgilini davet et.</span>
              </button>
  
              <button
                type="button"
                onClick={() => {
                  cozyAudio.playClick();
                  setNetAction("join");
                }}
                className={`flex flex-col gap-1 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  netAction === "join"
                    ? "bg-violet-500/15 border-violet-400/50 shadow-md shadow-violet-500/5"
                    : "bg-white/5 border-white/5 hover:border-white/10"
                }`}
              >
                <span className="text-xs font-bold font-display text-violet-200">🔑 Oda Koduyla Katıl</span>
                <span className="text-[10px] text-slate-400">Sevgilinin oluşturduğu oda kodunu girerek bağlan.</span>
              </button>
            </div>
          </div>

          {/* Conditional room details */}
          {netAction === "create" ? (
            <div className="flex flex-col gap-2 bg-slate-950/20 border border-white/5 p-3 rounded-xl mt-1 animate-fade-in text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Senin Oda Kodun</span>
              <div className="text-2xl font-bold font-display tracking-widest text-violet-300 bg-slate-900/60 py-2.5 rounded-lg border border-white/10 select-all">
                {roomCode}
              </div>
              <p className="text-[9px] text-slate-400">Bu kodu sevgiline gönder, farklı bir cihazdan katılsın!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 bg-slate-950/20 border border-white/5 p-3 rounded-xl mt-1 animate-fade-in">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Giriş Yapılacak Oda Kodu</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.replace(/[^0-9a-zA-Z]/g, "").substring(0, 6).toUpperCase())}
                placeholder="ODA KODUNU GİR..."
                className="w-full px-3 py-2.5 text-center rounded-lg bg-slate-900/60 border border-white/10 focus:border-violet-400 focus:outline-none text-sm font-bold uppercase tracking-widest text-violet-200"
              />
              <p className="text-[9px] text-slate-400 text-center">Bağlanmak istediğin oda kodunu yaz.</p>
            </div>
          )}

          {/* Active lobbies deck */}
          {Object.keys(activeLobbies).length > 0 && (
            <div className="flex flex-col gap-2 border-t border-white/10 pt-4 animate-fade-in">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Aktif Canlı Odalar (Lobi Listesi)
              </label>
              <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.values(activeLobbies).map((lobby) => (
                  <div 
                    key={lobby.roomCode}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/30 border border-white/5 hover:border-violet-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        style={{ backgroundColor: lobby.avatarColor }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] border border-white/10 text-white font-bold"
                      >
                        {lobby.gender === "girl" ? "👧" : "👦"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#ebeef5] group-hover:text-violet-200 transition-colors">
                          {lobby.hostName}'in Dünyası
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono tracking-wider">
                          Oda Kodu: #{lobby.roomCode}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        cozyAudio.playGiftBell();
                        setRoomCode(lobby.roomCode);
                        setNetAction("join");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-violet-600/60 hover:bg-violet-600 border border-white/10 text-[10px] font-bold text-violet-100 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Katıl ➡️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
 
          {/* ENTER BUTTON */}
          <button
            onClick={handleEnterWorld}
            className="w-full mt-2 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-rose-500 hover:from-violet-600 hover:to-rose-600 active:scale-98 border border-white/10 font-bold font-display tracking-wider text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-violet-500/25 transition-all text-white"
          >
            Huzurlu Dünyaya Giriş Yap
            <ArrowRight className="w-4 h-4" />
          </button>

        </div>

      </div>
    </div>
  );
}
