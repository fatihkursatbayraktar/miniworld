import Phaser from "phaser";
import Player from "../entities/Player";
import Partner from "../entities/Partner";
import WeatherSystem from "../systems/WeatherSystem";
import { NetworkSystem, NetworkMessage } from "../systems/NetworkSystem";
import { cozyAudio } from "@/utils/audio";

export default class MainScene extends Phaser.Scene {
  // Systems
  private weatherSystem!: WeatherSystem;
  private networkSystem: NetworkSystem | null = null;

  // Entities
  public player!: Player;
  public partner!: Partner;

  // Physics Groups
  private colliders!: Phaser.Physics.Arcade.StaticGroup;
  public seats: Array<{
    x: number;
    y: number;
    type: "river" | "cafe" | "cinema" | "bench";
    zoneId: string;
    occupied: boolean;
    parentObject: any;
  }> = [];

  // Interaction markers
  private promptKeyLabel: Phaser.GameObjects.Text | null = null;
  private activeSeatInRange: any = null;
  private activeArcadeInRange: "hockey" | "bowling" | "billiards" | "gokart" | "flower" | "cafe" | "jeweler" | null = null;
  private activeParkInRange: "fishing" | "mangal" | null = null;
  private isFishing = false;
  private isCooking = false;
  private outdoorFoodGraphics: Array<Phaser.GameObjects.Graphics> = [];

  // Custom configuration keys
  private playMode = "ai"; // "ai" or "network"
  private nickname = "Player";
  private avatarColor = 0xfb7185;
  private hairStyle = "short";
  private hairColor = 0x78350f;

  private spawnX: number = 760;
  private spawnY: number = 480;
 
  constructor() {
    super("MainScene");
  }
 
  public init(data: any) {
    if (data && typeof data.spawnX === "number") {
      this.spawnX = data.spawnX;
      this.spawnY = data.spawnY;
    } else {
      this.spawnX = 760;
      this.spawnY = 480;
    }
  }

  create() {
    // 1. Fetch user customizations from Phaser Registry (set on onboarding)
    this.playMode = this.registry.get("playMode") || "ai";
    this.nickname = this.registry.get("nickname") || "Sunny";
    this.avatarColor = this.registry.get("avatarColor") || 0xfb7185;
    this.hairStyle = this.registry.get("hairStyle") || "short";
    this.hairColor = this.registry.get("hairColor") || 0x78350f;

    // 2. Set World Boundaries
    this.physics.world.setBounds(0, 0, 1600, 900);
    this.cameras.main.setBounds(0, 0, 1600, 900);

    // 3. Draw Map Background (Cobblestone pathway grid and cozy zones)
    this.drawWorldBackground();

    // 4. Initialize Static Colliders
    this.colliders = this.physics.add.staticGroup();
    this.setupStaticWorldColliders();

    // 5. Initialize Interactive Benches & Café Chairs
    this.setupInteractiveSeats();
    this.setupCozyRiversidePark();

    // 6. Spawn Player
    this.player = new Player(
      this,
      this.spawnX,
      this.spawnY, // Start near the bridge center
      this.nickname,
      this.avatarColor,
      this.hairStyle,
      this.hairColor
    );

    // 7. Spawn Partner (Simulated AI Companion or Real Multiplayer synchronization)
    const isAISimulation = this.playMode === "ai";
    const partnerName = isAISimulation ? "Luna" : "Partner";
    const partnerColor = isAISimulation ? 0xa78bfa : 0xf472b6; // soft purple / rose
    
    this.partner = new Partner(
      this,
      this.spawnX + 60,
      this.spawnY,
      partnerName,
      partnerColor,
      isAISimulation ? "long" : "spiky",
      isAISimulation ? 0xd97706 : 0x1e293b,
      isAISimulation
    );

    if (this.playMode === "network") {
      this.partner.setVisible(false); // start invisible in network mode until peer handshakes!
    }

    // Bind collision bounds between characters and solid trees/structures
    this.physics.add.collider(this.player, this.colliders);
    this.physics.add.collider(this.partner, this.colliders);
    this.physics.add.collider(this.player, this.partner);

    // 8. Initialize Weather System (Rain drops, wind chimes LFO, night lights)
    this.weatherSystem = new WeatherSystem(this);
    this.weatherSystem.init();

    // 9. Networking Integration
    if (this.playMode === "network") {
      this.initializeNetworkSync();
    }

    // 10. Floating Interactive Trigger Key prompt Overlay
    this.promptKeyLabel = this.add.text(0, 0, "Oturmak için [E]'ye bas", {
      font: "bold 13px Outfit, Inter, Arial",
      color: "#0f172a",
      backgroundColor: "#fbbf24", // gold glowing warning
      padding: { x: 8, y: 4 },
    });
    this.promptKeyLabel.setOrigin(0.5, 0.5);
    this.promptKeyLabel.setAlpha(0);
    this.promptKeyLabel.setDepth(9999);

    // Bind keyboard event triggers (E for Sitting / Arcade, F for Gift Shop)
    this.input.keyboard?.on("keydown-E", () => this.handleKeyboardAction("E"));
    this.input.keyboard?.on("keydown-F", () => this.handleKeyboardAction("F"));

    // Camera locks on player
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.1);

    // Start background lo-fi audio engines automatically
    cozyAudio.startRain();
    cozyAudio.startRiver();
    cozyAudio.startPiano();
    cozyAudio.activateAutoChimes();
  }

  update(time: number, delta: number) {
    // Initialize global clock if not already set
    if (!(window as any).gameClock) {
      (window as any).gameClock = {
        hour: 12,
        minute: 0,
        lastTick: Date.now()
      };
    }

    // Tick the global game clock!
    // 1 game minute = 1000ms of real-world time.
    const clock = (window as any).gameClock;
    if (clock) {
      const now = Date.now();
      const elapsed = now - clock.lastTick;
      if (elapsed >= 1000) {
        const mins = Math.floor(elapsed / 1000);
        clock.minute += mins;
        clock.lastTick = now - (elapsed % 1000);

        if (clock.minute >= 60) {
          clock.hour = (clock.hour + Math.floor(clock.minute / 60)) % 24;
          clock.minute = clock.minute % 60;
        }
      }
    }

    // 1. Update Game entity walk loops
    // In React overlay UI, we bind a virtual joystick that publishes joystickVelocity
    const joystickVel = (window as any).joystickVelocity;
    this.player.update(time, delta, joystickVel);
    this.partner.update(time, delta, this.player);

    // 2. Update Weather raindrop splatters and dynamic clouds drift
    this.weatherSystem.update(time, delta);

    // 3. Scan for nearby interactive seats or arcade spots
    this.scanForInteractivePrompts();

    // 4. If networking is active, sync client coordinates to other tab
    if (this.playMode === "network" && this.networkSystem && !this.player.isSitting) {
      const pBody = this.player.body as Phaser.Physics.Arcade.Body;
      if (Math.abs(pBody.velocity.x) > 1 || Math.abs(pBody.velocity.y) > 1) {
        this.networkSystem.send("move", {
          x: this.player.x,
          y: this.player.y,
        });
      }
    }
  }

  private drawWorldBackground() {
    const bg = this.add.graphics();

    // Base late-night background (Dark warm grey-blue grass)
    bg.fillStyle(0x0f121d, 1.0);
    bg.fillRect(0, 0, 1600, 900);

    // Cobblestone street path connecting zones (Top-left down to Arcade)
    bg.fillStyle(0x1e2230, 1.0);
    bg.fillRect(200, 0, 120, 900); // vertical pathway
    bg.fillRect(0, 300, 1600, 120); // horizontal avenue

    // Draw grid cobblestones details
    bg.lineStyle(1.5, 0x2e354f, 0.35);
    for (let x = 0; x < 1600; x += 32) {
      bg.moveTo(x, 300);
      bg.lineTo(x, 420);
    }
    for (let y = 0; y < 900; y += 32) {
      bg.moveTo(200, y);
      bg.lineTo(320, y);
    }
    bg.stroke();

    // River Water body (Segmented polygonal visual stream at bottom-left corner)
    bg.fillStyle(0x08172c, 1.0); // deep night water
    bg.beginPath();
    bg.moveTo(0, 500);
    bg.lineTo(120, 505);
    bg.lineTo(240, 530);
    bg.lineTo(310, 600);
    bg.lineTo(350, 720);
    bg.lineTo(350, 900);
    bg.lineTo(0, 900);
    bg.closePath();
    bg.fill();

    // ── COZY RIVERSIDE PARK SQUARE & PATHWAY ────────────────────────
    // Terracotta brick patio flooring
    bg.fillStyle(0x7c2d12, 1.0); // warm terracotta brick base
    bg.fillRoundedRect(360, 680, 240, 190, 16);
    bg.lineStyle(3, 0xd97706, 0.7); // rustic orange border
    bg.strokeRoundedRect(360, 680, 240, 190, 16);

    // Decorative herringbone brick tiles pattern inside patio
    bg.lineStyle(1.5, 0x451a03, 0.3);
    for (let px = 360; px < 600; px += 24) {
      bg.lineBetween(px, 680, px, 870);
    }
    for (let py = 680; py < 870; py += 24) {
      bg.lineBetween(360, py, 600, py);
    }

    // Cobblestone pathway connecting the main road to the park square
    bg.fillStyle(0x1e2230, 1.0);
    bg.fillRect(320, 730, 40, 48);
    bg.lineStyle(1.5, 0x2e354f, 0.35);
    bg.lineBetween(320, 730, 360, 730);
    bg.lineBetween(320, 778, 360, 778);

    // ── RUSTIC WOODEN FISHING DOCK jutting into the river ──────────
    // Wooden pier walkway spanning from park square bank across the riverbank
    bg.fillStyle(0x451a03, 1.0); // deep mahogany wood deck
    bg.fillRect(150, 725, 210, 38);
    bg.lineStyle(2.5, 0xd97706, 0.9); // golden oak handrail / borders
    bg.strokeRect(150, 725, 210, 38);

    // Deck wood plank lines
    bg.lineStyle(1.5, 0x271001, 0.5);
    for (let wx = 160; wx < 360; wx += 16) {
      bg.lineBetween(wx, 725, wx, 763);
    }

    // Pier support piles/pillars in the river water
    bg.fillStyle(0x1e1b18, 1.05); // heavy wood shadow poles
    bg.fillRect(150, 720, 8, 48);
    bg.fillRect(200, 720, 8, 48);
    bg.fillStyle(0x451a03, 1.0);
    bg.fillRect(150, 723, 6, 42);
    bg.fillRect(200, 723, 6, 42);

    // Soft glowing water ripples graphic lines
    bg.lineStyle(3, 0x1d4ed8, 0.25);
    bg.beginPath();
    bg.moveTo(0, 540);
    bg.lineTo(110, 545);
    bg.lineTo(220, 570);
    bg.lineTo(280, 630);
    bg.lineTo(320, 740);
    bg.lineTo(320, 900);

    bg.moveTo(0, 600);
    bg.lineTo(90, 605);
    bg.lineTo(180, 630);
    bg.lineTo(240, 690);
    bg.lineTo(280, 800);
    bg.lineTo(280, 900);
    bg.stroke();

    // Arched Bridge top-walk base (Wooden floor spanning riverbank)
    bg.fillStyle(0x451a03, 1.0); // rustic dark wood
    bg.fillRect(180, 520, 150, 48);
    bg.lineStyle(4, 0xd97706, 0.85); // gold wood arches
    bg.strokeRect(180, 520, 150, 48);

    // ── Ghalia Lounge Restaurant Exterior Facade & Pavement ─────────────────────────
    // 1. Polished Cream/White Marble Terrace Pavement (for outdoor seating)
    bg.fillStyle(0xf8fafc, 1.0); 
    bg.fillRect(940, 110, 620, 130);
    
    // Elegant Gold grout grids
    bg.lineStyle(1.5, 0xd4af37, 0.25);
    for (let tx = 940; tx <= 1560; tx += 40) {
      bg.lineBetween(tx, 110, tx, 240);
    }
    for (let ty = 110; ty <= 240; ty += 40) {
      bg.lineBetween(940, ty, 1560, ty);
    }
    bg.stroke();
    
    // Luxury gold trim outer border
    bg.lineStyle(3, 0xd4af37, 0.85);
    bg.strokeRect(940, 110, 620, 130);

    // 2. Slate-Black Marble Building Front Wall
    bg.fillStyle(0x0f172a, 1.0); 
    bg.fillRect(940, 40, 620, 70);
    
    // Horizontal Gold crown moldings
    bg.lineStyle(3, 0xd4af37, 1.0);
    bg.lineBetween(940, 40, 1560, 40);
    bg.lineBetween(940, 110, 1560, 110);
    bg.stroke();

    // 3. Elegant Gold-framed Showroom Windows (Left & Right)
    bg.fillStyle(0x1e3a8a, 0.85); // dark tinted blue glass
    bg.fillRect(970, 50, 180, 50); // Left Window
    bg.fillRect(1290, 50, 240, 50); // Right Window
    
    bg.lineStyle(2.5, 0xd4af37, 1.0); // Gold borders
    bg.strokeRect(970, 50, 180, 50);
    bg.strokeRect(1290, 50, 240, 50);

    // Soft warm interior lighting glow/silhouette inside windows
    bg.fillStyle(0xfcd34d, 0.12);
    bg.fillCircle(1060, 75, 22);
    bg.fillCircle(1410, 75, 22);

    // 4. Crimson Velvet Red Carpet Runner
    bg.fillStyle(0x991b1b, 1.0);
    bg.fillRect(1185, 110, 70, 110);
    bg.lineStyle(2, 0xd4af37, 1.0); // golden side runner rods
    bg.lineBetween(1185, 110, 1185, 220);
    bg.lineBetween(1255, 110, 1255, 220);
    bg.stroke();

    // Arcade Room layout floor (Bottom-Right)
    bg.fillStyle(0x0a0a0f, 1.0); // dark neon synth floor
    bg.fillRect(1150, 500, 400, 350);
    bg.lineStyle(3.5, 0xec4899, 0.7); // hot pink glow border
    bg.strokeRect(1150, 500, 400, 350);

    // Dynamic neon grid floor lines inside Play Room
    bg.lineStyle(1.0, 0x06b6d4, 0.15); // soft cyan grid lines
    for (let gx = 1180; gx < 1550; gx += 40) {
      bg.lineBetween(gx, 500, gx, 850);
    }
    for (let gy = 530; gy < 850; gy += 40) {
      bg.lineBetween(1150, gy, 1550, gy);
    }

    // DRAW MINIATIVE PROPS TO BEAUTIFY THE GAME ROOM
    // Mini Green Billiards felt table decoration
    bg.fillStyle(0x78350f, 1.0); // mahogany bumpers
    bg.fillRoundedRect(1230, 770, 60, 40, 4);
    bg.fillStyle(0x047857, 1.0); // green felt
    bg.fillRect(1235, 775, 50, 30);
    // Draw 6 tiny golden pocket circles
    bg.fillStyle(0xd4af37, 1.0);
    bg.fillCircle(1235, 775, 2.5);
    bg.fillCircle(1285, 775, 2.5);
    bg.fillCircle(1235, 805, 2.5);
    bg.fillCircle(1285, 805, 2.5);
    bg.fillCircle(1260, 775, 2.5);
    bg.fillCircle(1260, 805, 2.5);

    // Mini Go-Kart Racing Tires decoration
    bg.fillStyle(0x0f172a, 1.0); // Slate dark rubber tires stacked
    bg.fillCircle(1390, 785, 9);
    bg.fillCircle(1410, 785, 9);
    bg.fillCircle(1400, 774, 9);
    bg.fillStyle(0xef4444, 1.0); // red center caps
    bg.fillCircle(1390, 785, 3);
    bg.fillCircle(1410, 785, 3);
    bg.fillCircle(1400, 774, 3);

    // Flower Shop Area Base
    bg.fillStyle(0x14532d, 0.3); // deeper grass outline
    bg.fillRect(20, 20, 150, 250);
 
    // Sakura Pink Cobblestone Entrance Path for Berraflower
    bg.fillStyle(0xfbcfe8, 0.85); // soft sakura pink stone color
    bg.fillRect(85, 115, 45, 60); // path from door downwards
    bg.lineStyle(2, 0xf472b6, 0.6); // darker pink stone breaks
    for(let py = 125; py < 175; py += 12) {
      bg.beginPath();
      bg.moveTo(85, py);
      bg.lineTo(130, py + (Math.random() * 4 - 2));
      bg.strokePath();
    }

    // Ecrin's Luxury Jeweler Building (Top Middle) replacing Cinema
    const jewelX = 400;
    const jewelY = 30;
    const jewelW = 240;
    const jewelH = 110;
    
    // Marble foundation/building block
    bg.fillStyle(0xf1f5f9, 1.0); // white polished marble
    bg.fillRect(jewelX, jewelY, jewelW, jewelH);
    
    // Gold trims and borders
    bg.lineStyle(4, 0xfcd34d, 1.0); // luxury gold
    bg.strokeRect(jewelX, jewelY, jewelW, jewelH);
    bg.strokeRect(jewelX + 10, jewelY + 10, jewelW - 20, jewelH - 20); // inner gold trim
 
    // Elegant glass display windows (left and right)
    bg.fillStyle(0xe0f2fe, 0.6); // light blue tinted glass
    bg.fillRect(jewelX + 20, jewelY + 40, 60, 60); // left window
    bg.fillRect(jewelX + jewelW - 80, jewelY + 40, 60, 60); // right window
    
    // Gold borders for windows
    bg.lineStyle(2, 0xf59e0b, 1.0);
    bg.strokeRect(jewelX + 20, jewelY + 40, 60, 60);
    bg.strokeRect(jewelX + jewelW - 80, jewelY + 40, 60, 60);
 
    // Dark double doors in the center
    bg.fillStyle(0x1e293b, 1.0); // slate dark doors
    bg.fillRect(jewelX + 100, jewelY + 50, 40, 60);
    bg.lineStyle(2, 0xd97706, 1.0);
    bg.strokeRect(jewelX + 100, jewelY + 50, 40, 60);
    // Gold door handles
    bg.fillStyle(0xfcd34d, 1.0);
    bg.fillRect(jewelX + 115, jewelY + 80, 2, 10);
    bg.fillRect(jewelX + 123, jewelY + 80, 2, 10);
 
    // Marble entrance path/steps
    bg.fillStyle(0xe2e8f0, 1.0);
    bg.fillRect(jewelX + 80, jewelY + 110, 80, 25);
    bg.lineStyle(1, 0xcbd5e1, 1.0);
    bg.strokeRect(jewelX + 80, jewelY + 110, 80, 25);
  }

  private setupStaticWorldColliders() {
    // 1. Solid Weeping Willow Trees (Trunks acting as solid circles)
    const treeCoords = [
      { x: 620, y: 720 },
      { x: 1050, y: 780 }
    ];

    treeCoords.forEach((coord) => {
      // Spawn Tree sprite
      const tree = this.add.sprite(coord.x, coord.y, "prop_tree");
      tree.setOrigin(0.5, 0.9); // pivot near baseline trunk
      tree.setDepth(coord.y);

      // circular collider at core root base
      const col = this.colliders.create(coord.x, coord.y - 12, undefined, undefined, false);
      col.setSize(28, 20);
      col.setVisible(false);
      this.physics.add.existing(col, true);
    });

    // 2. River Bank colliders (prevent falling in, except bridge)
    // Left bank top wall
    const bank1 = this.colliders.create(100, 500, undefined, undefined, false);
    bank1.setSize(200, 24);
    
    // Right bank bottom wall split to allow walking onto the fishing dock at y: 725-763
    // Above dock
    const bank2A = this.colliders.create(342, 650, undefined, undefined, false);
    bank2A.setSize(24, 130);
    // Below dock
    const bank2B = this.colliders.create(342, 820, undefined, undefined, false);
    bank2B.setSize(24, 150);

    // 3. Café Wall Colliders
    const cafeWall = this.colliders.create(940, 160, undefined, undefined, false);
    cafeWall.setSize(12, 240);

    // Force updates
    this.colliders.refresh();
  }

  private setupInteractiveSeats() {
    // Benches / Chairs that players can sit on
    // 1. River Side Bench prop
    const riverBench = this.add.sprite(450, 580, "prop_bench");
    riverBench.setOrigin(0.5, 0.5);
    riverBench.setDepth(580);
    // Attach trigger cozy glow emitter
    (riverBench as any).triggerCozyGlow = () => this.spawnSeatLoveEmitter(450, 580);

    // Register bench seats: left and right spots
    this.seats.push(
      { x: 420, y: 574, type: "river", zoneId: "river_bench_left", occupied: false, parentObject: riverBench },
      { x: 480, y: 574, type: "river", zoneId: "river_bench_right", occupied: false, parentObject: riverBench }
    );

    // 2. Café Tables and chairs props
    const table1 = this.add.sprite(1100, 160, "prop_cafe_table");
    table1.setOrigin(0.5, 0.5);
    table1.setDepth(160);

    const chairLeft = this.add.sprite(1060, 160, "prop_cafe_chair");
    chairLeft.setOrigin(0.5, 0.5);
    chairLeft.setDepth(160);
    chairLeft.scaleX = -1; // face table

    const chairRight = this.add.sprite(1140, 160, "prop_cafe_chair");
    chairRight.setOrigin(0.5, 0.5);
    chairRight.setDepth(160);

    this.seats.push(
      { x: 1060, y: 154, type: "cafe", zoneId: "cafe_t1_left", occupied: false, parentObject: table1 },
      { x: 1140, y: 154, type: "cafe", zoneId: "cafe_t1_right", occupied: false, parentObject: table1 }
    );

    // 3. Stardew Valley Style "berraflower" Wooden Cabin (Top Left)
    // We will draw it programmatically to ensure rich colors and exact Stardew Valley textures!
    const cabinGraphics = this.add.graphics();
    cabinGraphics.setDepth(95);

    // Deep wood shadow
    cabinGraphics.fillStyle(0x1a0e0a, 0.6);
    cabinGraphics.fillRect(20, 45, 140, 75);

    // Main Wooden Log Walls (Deep warm chocolate brown)
    cabinGraphics.fillStyle(0x3e1f0e, 1.0);
    cabinGraphics.fillRect(25, 50, 130, 65);

    // Log horizontal panel lines for Stardew Valley texture
    cabinGraphics.fillStyle(0x2d1508, 1.0);
    cabinGraphics.fillRect(25, 62, 130, 3);
    cabinGraphics.fillRect(25, 75, 130, 3);
    cabinGraphics.fillRect(25, 88, 130, 3);
    cabinGraphics.fillRect(25, 101, 130, 3);

    // Slanted Cozy Roof (Warm Terracotta / Autumn Red)
    cabinGraphics.fillStyle(0x8a2b1a, 1.0);
    // Draw polygon for roof overhang
    cabinGraphics.fillTriangle(15, 50, 90, 25, 165, 50);
    
    // Roof trim highlight
    cabinGraphics.lineStyle(3, 0xb83a25, 1.0);
    cabinGraphics.strokeLineShape(new Phaser.Geom.Line(15, 50, 90, 25));
    cabinGraphics.strokeLineShape(new Phaser.Geom.Line(90, 25, 165, 50));

    // Cozy Glowing Window (Warm Golden Light)
    cabinGraphics.fillStyle(0xf59e0b, 0.95);
    cabinGraphics.fillRect(40, 65, 30, 25);
    // Window wood panes
    cabinGraphics.lineStyle(2, 0x2d1508, 1.0);
    cabinGraphics.strokeRect(40, 65, 30, 25);
    cabinGraphics.strokeLineShape(new Phaser.Geom.Line(55, 65, 55, 90));
    cabinGraphics.strokeLineShape(new Phaser.Geom.Line(40, 77, 70, 77));
    // Warm light bloom/glow
    const windowGlow = this.add.particles(55, 77, "part_firefly", {
      scale: { start: 0.4, end: 0.8 },
      alpha: { start: 0.4, end: 0 },
      tint: 0xf59e0b,
      lifespan: 1200,
      frequency: 250,
    });
    windowGlow.setDepth(96);

    // Wooden shop door (Deep oak brown)
    cabinGraphics.fillStyle(0x5a3118, 1.0);
    cabinGraphics.fillRect(95, 65, 25, 50);
    // Door border and knob
    cabinGraphics.lineStyle(1.5, 0x2d1508, 1.0);
    cabinGraphics.strokeRect(95, 65, 25, 50);
    // Door handle (Brass gold)
    cabinGraphics.fillStyle(0xd97706, 1.0);
    cabinGraphics.fillCircle(115, 90, 2.5);

    // Outside Wooden Flower Stand Display shelf
    cabinGraphics.fillStyle(0x5c3d24, 1.0);
    cabinGraphics.fillRect(35, 98, 45, 14);
    cabinGraphics.lineStyle(1.5, 0x2d1508, 1.0);
    cabinGraphics.strokeRect(35, 98, 45, 14);
    
    // Colorful potted plants on the shelf (tulips/roses emojis as tiny sprites)
    const shelfPlant1 = this.add.text(42, 94, "🌹", { font: "11px Arial" });
    shelfPlant1.setDepth(100);
    const shelfPlant2 = this.add.text(54, 94, "🌷", { font: "11px Arial" });
    shelfPlant2.setDepth(100);
    const shelfPlant3 = this.add.text(66, 94, "🌻", { font: "11px Arial" });
    shelfPlant3.setDepth(100);

    // Hanging Ivy / Vines from the roof
    const ivy1 = this.add.text(25, 48, "🌿", { font: "12px Arial" }).setTint(0x22c55e);
    ivy1.setDepth(100);
    const ivy2 = this.add.text(140, 48, "🌿", { font: "12px Arial" }).setTint(0x22c55e);
    ivy2.setDepth(100);

    // Custom Gold-themed Board Sign: "berraflower"
    const signBoardBg = this.add.graphics();
    signBoardBg.setDepth(101);
    signBoardBg.fillStyle(0x1e293b, 0.9); // dark sign
    signBoardBg.lineStyle(2, 0xd97706, 1.0); // gold frame
    signBoardBg.fillRoundedRect(42, 28, 96, 18, 4);
    signBoardBg.strokeRoundedRect(42, 28, 96, 18, 4);

    const signText = this.add.text(90, 37, "berraflower", {
      font: "bold 9px Outfit, Arial",
      color: "#fef08a", // soft glowing gold
    });
    signText.setOrigin(0.5, 0.5);
    signText.setDepth(102);

    // Store collision boundary object
    const flowerCabinCollider = this.colliders.create(90, 80, undefined, undefined, false);
    flowerCabinCollider.setSize(130, 60);
    this.colliders.refresh();
 
    // 🌸 Beautiful Sakura & Flower decor on the ground near the entrance
    const groundDecorList = [
      { x: 65, y: 120, txt: "🌸", s: 1.2 },
      { x: 135, y: 118, txt: "🌸", s: 1.1 },
      { x: 55, y: 140, txt: "🌷", s: 0.9 },
      { x: 145, y: 135, txt: "🌹", s: 1.0 },
      { x: 75, y: 155, txt: "🌸", s: 1.3 },
      { x: 125, y: 160, txt: "🌸", s: 1.1 },
      { x: 45, y: 125, txt: "🪴", s: 1.4 },
      { x: 155, y: 125, txt: "🪴", s: 1.4 },
    ];
    groundDecorList.forEach(decor => {
      const gDecor = this.add.text(decor.x, decor.y, decor.txt, { font: "14px Arial" });
      gDecor.setOrigin(0.5);
      gDecor.setScale(decor.s);
      gDecor.setDepth(decor.y); // depth sort so player walks over/behind them correctly
    });



    // Beautiful Arched Double Glass Doors & Entrance Sconces
    const doorGfx = this.add.graphics();
    doorGfx.setDepth(100);

    // Arched Slate double door frame
    doorGfx.lineStyle(3.5, 0xd4af37, 1.0); // Luxury Gold frame
    doorGfx.fillStyle(0x1e293b, 1.0); // Sleek slate door
    doorGfx.fillRect(1185, 55, 70, 55);
    doorGfx.strokeRect(1185, 55, 70, 55);
    doorGfx.lineBetween(1220, 55, 1220, 110); // split line
    doorGfx.stroke();

    // Arched gold transom top glass
    doorGfx.fillStyle(0x1e293b, 1.0);
    doorGfx.beginPath();
    doorGfx.arc(1220, 55, 35, Math.PI, 0, false);
    doorGfx.fill();
    doorGfx.stroke();

    // Warm welcoming light cast beam reflecting on the red carpet
    doorGfx.fillStyle(0xfcd34d, 0.18);
    doorGfx.beginPath();
    doorGfx.moveTo(1195, 110);
    doorGfx.lineTo(1245, 110);
    doorGfx.lineTo(1280, 210);
    doorGfx.lineTo(1160, 210);
    doorGfx.closePath();
    doorGfx.fillPath();

    // Gold door handles
    doorGfx.fillStyle(0xd4af37, 1.0);
    doorGfx.fillCircle(1217, 85, 2.5);
    doorGfx.fillCircle(1223, 85, 2.5);

    // Elegant exterior wall lamps next to the door
    doorGfx.fillStyle(0x0f172a, 1.0);
    doorGfx.fillRect(1170, 65, 8, 14); // left lamp
    doorGfx.fillRect(1262, 65, 8, 14); // right lamp
    doorGfx.lineStyle(1.5, 0xd4af37, 1.0);
    doorGfx.strokeRect(1170, 65, 8, 14);
    doorGfx.strokeRect(1262, 65, 8, 14);

    // Small warm light cones shining downwards from wall lamps
    doorGfx.fillStyle(0xfcd34d, 0.25);
    doorGfx.beginPath();
    doorGfx.moveTo(1174, 79);
    doorGfx.lineTo(1160, 110);
    doorGfx.lineTo(1188, 110);
    doorGfx.closePath();
    doorGfx.fillPath();

    doorGfx.beginPath();
    doorGfx.moveTo(1266, 79);
    doorGfx.lineTo(1252, 110);
    doorGfx.lineTo(1280, 110);
    doorGfx.closePath();
    doorGfx.fillPath();

    // 🌿 Lush Green garden hedges lining the restaurant front walls
    for (let hx = 945; hx < 1175; hx += 18) {
      this.add.text(hx, 102, "🌿", { font: "12px Arial" }).setDepth(100).setTint(0x15803d);
    }
    for (let hx = 1265; hx < 1555; hx += 18) {
      this.add.text(hx, 102, "🌿", { font: "12px Arial" }).setDepth(100).setTint(0x15803d);
    }
    // Beautiful colorful roses popping out of the hedges
    const facadeRoses = [960, 1010, 1070, 1130, 1285, 1345, 1405, 1465, 1525];
    facadeRoses.forEach(rx => {
      this.add.text(rx, 105, "🌹", { font: "11px Arial" }).setDepth(101);
    });

    // Custom Elegant Gold-trimmed Ghalia Lounge signboard
    const loungeSignBg = this.add.graphics();
    loungeSignBg.setDepth(101);
    loungeSignBg.fillStyle(0x0f172a, 0.95); // slate body
    loungeSignBg.lineStyle(2, 0xd4af37, 1.0); // gold frame
    loungeSignBg.fillRoundedRect(1150, 20, 140, 22, 4);
    loungeSignBg.strokeRoundedRect(1150, 20, 140, 22, 4);

    const loungeSignText = this.add.text(1220, 31, "🍷 Ghalia Lounge", {
      font: "bold 11px Outfit, Arial",
      color: "#d4af37", // bright gold
    });
    loungeSignText.setOrigin(0.5, 0.5);
    loungeSignText.setDepth(102);

    // 3.5. Ecrin Jewelry Exterior Setup
    // Store collision boundary object for Jeweler building
    const jewelCollider = this.colliders.create(520, 85, undefined, undefined, false);
    jewelCollider.setSize(240, 110);
    this.colliders.refresh();
 
    // ── Zen Pırlanta: Luxury Exterior Area ─────────────────────────────────

    // === SIDEWALK / PAVEMENT STRIP ===
    const sidewalk = this.add.graphics();
    sidewalk.setDepth(5);
    // Cream marble pavement in front of the whole jeweler
    sidewalk.fillStyle(0xe8e0d0, 1.0);
    sidewalk.fillRect(390, 145, 380, 70);
    // Dark stone border
    sidewalk.lineStyle(2, 0xb8a88a, 1.0);
    sidewalk.strokeRect(390, 145, 380, 70);
    // Subtle pavement tile lines
    sidewalk.lineStyle(1, 0xd4c8b0, 0.6);
    for (let tx = 390; tx < 770; tx += 40) {
      sidewalk.lineBetween(tx, 145, tx, 215);
    }
    for (let ty = 145; ty < 215; ty += 35) {
      sidewalk.lineBetween(390, ty, 770, ty);
    }

    // === BIGGER, FANCIER SIGN ===
    const jewelSignBg = this.add.graphics();
    jewelSignBg.setDepth(101);
    // Shadow
    jewelSignBg.fillStyle(0x000000, 0.25);
    jewelSignBg.fillRoundedRect(444, 19, 154, 26, 6);
    // Sign body
    jewelSignBg.fillStyle(0x0f172a, 1.0);
    jewelSignBg.fillRoundedRect(442, 16, 154, 26, 6);
    // Double gold border
    jewelSignBg.lineStyle(2.5, 0xfcd34d, 1.0);
    jewelSignBg.strokeRoundedRect(442, 16, 154, 26, 6);
    jewelSignBg.lineStyle(1, 0xfef08a, 0.4);
    jewelSignBg.strokeRoundedRect(445, 19, 148, 20, 4);
    // Diamond icons on sides
    const sdg = this.add.graphics();
    sdg.setDepth(103);
    sdg.fillStyle(0xfcd34d, 1.0);
    sdg.fillTriangle(448, 29, 456, 24, 456, 34);
    sdg.fillTriangle(590, 29, 598, 24, 598, 34);
    sdg.lineStyle(1, 0xfef08a, 1.0);
    sdg.strokeTriangle(448, 29, 456, 24, 456, 34);
    sdg.strokeTriangle(590, 29, 598, 24, 598, 34);

    const jewelSignText = this.add.text(519, 29, "💎 Zen Pırlanta", {
      font: "bold 12px Outfit, Arial",
      color: "#fcd34d",
      stroke: "#0f172a",
      strokeThickness: 2,
    });
    jewelSignText.setOrigin(0.5, 0.5);
    jewelSignText.setDepth(102);

    // === STREET LAMP (Left of bench) ===
    const lampX = 650;
    const lampY = 155;
    const lamp = this.add.graphics();
    lamp.setDepth(lampY + 5);
    // Pole
    lamp.fillStyle(0x334155, 1.0);
    lamp.fillRect(lampX - 2, lampY - 50, 4, 60);
    // Arm curve
    lamp.lineStyle(3, 0x334155, 1.0);
    lamp.beginPath();
    lamp.arc(lampX + 12, lampY - 50, 14, Math.PI, Math.PI * 1.5, false);
    lamp.strokePath();
    // Lamp head
    lamp.fillStyle(0xfef08a, 1.0);
    lamp.fillEllipse(lampX + 26, lampY - 60, 20, 10);
    lamp.fillStyle(0xfcd34d, 0.3);
    lamp.fillCircle(lampX + 26, lampY - 55, 16); // warm glow halo
    lamp.lineStyle(1.5, 0x334155, 1.0);
    lamp.strokeEllipse(lampX + 26, lampY - 60, 20, 10);
    // Base anchor
    lamp.fillStyle(0x1e293b, 1.0);
    lamp.fillRect(lampX - 6, lampY + 8, 12, 5);

    // === 4-PERSON BENCH with backrest ===
    const benchX = 720;
    const benchY = 185;
    const bench = this.add.graphics();
    bench.setDepth(benchY - 8);
    // Shadow
    bench.fillStyle(0x000000, 0.12);
    bench.fillEllipse(benchX, benchY + 18, 100, 14);
    // Backrest planks
    bench.fillStyle(0x92400e, 1.0);
    bench.fillRect(benchX - 44, benchY - 32, 88, 8);
    bench.fillRect(benchX - 44, benchY - 22, 88, 7);
    // Seat planks
    bench.fillStyle(0x78350f, 1.0);
    bench.fillRect(benchX - 44, benchY - 12, 88, 10);
    bench.fillRect(benchX - 44, benchY - 0, 88, 10);
    // Shading on seat
    bench.fillStyle(0x451a03, 0.35);
    bench.fillRect(benchX - 44, benchY + 8, 88, 2);
    // Iron legs and armrests
    bench.fillStyle(0x1e293b, 1.0);
    bench.fillRect(benchX - 46, benchY - 32, 4, 45); // left leg + backrest support
    bench.fillRect(benchX + 42, benchY - 32, 4, 45); // right leg + backrest support
    bench.fillRect(benchX - 10, benchY - 32, 4, 45); // mid support left
    bench.fillRect(benchX + 6,  benchY - 32, 4, 45); // mid support right
    // Feet
    bench.fillRect(benchX - 50, benchY + 12, 12, 3);
    bench.fillRect(benchX + 38, benchY + 12, 12, 3);

    // === FLOWER POTS (flanking the bench) ===
    const drawPot = (gfx: Phaser.GameObjects.Graphics, px: number, py: number) => {
      // Pot body
      gfx.fillStyle(0xb45309, 1.0);
      gfx.beginPath();
      gfx.moveTo(px - 10, py - 4);
      gfx.lineTo(px + 10, py - 4);
      gfx.lineTo(px + 8, py + 20);
      gfx.lineTo(px - 8, py + 20);
      gfx.closePath();
      gfx.fillPath();
      // Soil
      gfx.fillStyle(0x451a03, 1.0);
      gfx.fillEllipse(px, py - 18, 20, 6);
      // Flower stems
      gfx.lineStyle(1.5, 0x16a34a, 1.0);
      gfx.lineBetween(px - 4, py - 18, px - 6, py - 34);
      gfx.lineBetween(px, py - 18, px, py - 38);
      gfx.lineBetween(px + 4, py - 18, px + 5, py - 32);
      // Flower heads
      gfx.fillStyle(0xf43f5e, 1.0); gfx.fillCircle(px - 6, py - 36, 5);
      gfx.fillStyle(0xfbbf24, 1.0); gfx.fillCircle(px, py - 40, 5);
      gfx.fillStyle(0xe879f9, 1.0); gfx.fillCircle(px + 5, py - 33, 4);
      // Pot rim
      gfx.lineStyle(2, 0x92400e, 1.0);
      gfx.strokeEllipse(px, py - 4, 24, 8);
    };
    const potGraphics = this.add.graphics();
    potGraphics.setDepth(benchY - 5);
    drawPot(potGraphics, benchX - 58, benchY + 14);
    drawPot(potGraphics, benchX + 58, benchY + 14);

    // Add 4 interactive seat zones
    this.seats.push(
      { x: benchX - 28, y: benchY - 2, type: "bench", zoneId: "zen_bench_1", occupied: false, parentObject: bench },
      { x: benchX - 10, y: benchY - 2, type: "bench", zoneId: "zen_bench_2", occupied: false, parentObject: bench },
      { x: benchX + 10, y: benchY - 2, type: "bench", zoneId: "zen_bench_3", occupied: false, parentObject: bench },
      { x: benchX + 28, y: benchY - 2, type: "bench", zoneId: "zen_bench_4", occupied: false, parentObject: bench }
    );

    // 3.6. Additional Restaurant Café Tables & Chairs
    const table2 = this.add.sprite(1350, 160, "prop_cafe_table");
    table2.setDepth(160);
    const table2ChairLeft = this.add.sprite(1310, 160, "prop_cafe_chair");
    table2ChairLeft.setDepth(160);
    table2ChairLeft.scaleX = -1;
    const table2ChairRight = this.add.sprite(1390, 160, "prop_cafe_chair");
    table2ChairRight.setDepth(160);

    this.seats.push(
      { x: 1310, y: 154, type: "cafe", zoneId: "cafe_t2_left", occupied: false, parentObject: table2 },
      { x: 1390, y: 154, type: "cafe", zoneId: "cafe_t2_right", occupied: false, parentObject: table2 }
    );

    // 4. Arcade Machines Cabinets (Atari Salonu)
    const airHockeyArcade = this.add.sprite(1260, 540, "prop_arcade_cabinet");
    airHockeyArcade.setOrigin(0.5, 0.9);
    airHockeyArcade.setDepth(540);
    (airHockeyArcade as any).arcadeId = "hockey";

    const bowlingArcade = this.add.sprite(1400, 540, "prop_arcade_cabinet");
    bowlingArcade.setOrigin(0.5, 0.9);
    bowlingArcade.setDepth(540);
    bowlingArcade.setTint(0xec4899);
    (bowlingArcade as any).arcadeId = "bowling";

    const billiardsArcade = this.add.sprite(1260, 700, "prop_arcade_cabinet");
    billiardsArcade.setOrigin(0.5, 0.9);
    billiardsArcade.setDepth(700);
    billiardsArcade.setTint(0xd4af37); // Golden tint
    (billiardsArcade as any).arcadeId = "billiards";

    const goKartArcade = this.add.sprite(1400, 700, "prop_arcade_cabinet");
    goKartArcade.setOrigin(0.5, 0.9);
    goKartArcade.setDepth(700);
    goKartArcade.setTint(0x06b6d4); // Cyan neon
    (goKartArcade as any).arcadeId = "gokart";

    // Play Room neon billboard header sign
    this.add.text(1330, 465, "GHALIA PLAY ZONE 🕹️⚡", {
      font: "bold 13px Outfit, Inter, Arial",
      color: "#fae8ff",
      stroke: "#ec4899",
      strokeThickness: 3.5
    }).setOrigin(0.5).setDepth(999);

    // 5. Hanging Lantern Strings (glowing warm visual wires)
    const lantern = this.add.sprite(450, 480, "prop_lantern");
    lantern.setDepth(480);
    this.tweens.add({
      targets: lantern,
      angle: { min: -5, max: 5 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  private initializeNetworkSync() {
    const roomCode = this.registry.get("roomCode") || "1234";
    this.networkSystem = new NetworkSystem(roomCode, (msg: NetworkMessage) => {
      switch (msg.type) {
        case "join":
          if (msg.payload.nickname) {
            // Peer sent their customizations! Make partner visible and apply styling!
            this.partner.setVisible(true);
            this.partner.updateCustomizations(
              msg.payload.nickname,
              msg.payload.avatarColor,
              msg.payload.hairStyle,
              msg.payload.hairColor
            );

            // If this join has full info, and we haven't replied yet, let's reply back to confirm they see us!
            if (msg.payload.handshakeRequest && this.networkSystem) {
              this.networkSystem.send("join", {
                nickname: this.nickname,
                avatarColor: this.avatarColor,
                hairStyle: this.hairStyle,
                hairColor: this.hairColor,
                handshakeRequest: false
              });
            }
          }
          break;
        case "move":
          // If we receive a move message from a peer, make them visible in case we missed join!
          this.partner.setVisible(true);
          this.partner.targetX = msg.payload.x;
          this.partner.targetY = msg.payload.y;
          this.partner.standUp();
          break;
        case "emote":
          this.partner.setVisible(true);
          this.partner.displayEmote(msg.payload.emoji);
          break;
        case "gift":
          this.partner.setVisible(true);
          if (["ring", "necklace", "bracelet"].includes(msg.payload.flowerType)) {
            this.player.receiveJewel(msg.payload.flowerType);
          } else {
            this.player.receiveFlower(msg.payload.flowerType);
          }
          break;
        case "sit":
          this.partner.setVisible(true);
          this.partner.sitDown(msg.payload.x, msg.payload.y);
          break;
        case "stand":
          this.partner.setVisible(true);
          this.partner.standUp();
          break;
        case "coffee":
          this.partner.setVisible(true);
          this.partner.isDrinking = true;
          this.partner.displayEmote("☕");
          break;
        case "order":
          this.partner.setVisible(true);
          this.partner.receiveFood(msg.payload.foodType);
          break;
      }
    });

    this.networkSystem.start();

    // Immediately broadcast our player's customized avatar to let other tabs/clients know we joined!
    this.networkSystem.send("join", {
      nickname: this.nickname,
      avatarColor: this.avatarColor,
      hairStyle: this.hairStyle,
      hairColor: this.hairColor,
      handshakeRequest: true // requests the peer to reply with their customizations
    });
  }

  private scanForInteractivePrompts() {
    // 1. Scan for sitting seats within 40 pixels
    let seatInRange: any = null;
    let closestDist = 99999;

    this.seats.forEach((seat) => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, seat.x, seat.y);
      if (dist < 48 && dist < closestDist) {
        closestDist = dist;
        seatInRange = seat;
      }
    });

    // 2. Scan for Arcade cabinet range within 50 pixels
    let arcadeInRange: any = null;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 1260, 540) < 55) {
      arcadeInRange = "hockey";
    } else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 1400, 540) < 55) {
      arcadeInRange = "bowling";
    } else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 1260, 700) < 55) {
      arcadeInRange = "billiards";
    } else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 1400, 700) < 55) {
      arcadeInRange = "gokart";
    } else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 90, 100) < 65) {
      arcadeInRange = "flower";
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 90, 100) < 40) {
        cozyAudio.playClick();
        this.scene.start("FloristInteriorScene");
        return;
      }
    } else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 1220, 100) < 65) {
      arcadeInRange = "cafe";
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 1220, 100) < 40) {
        cozyAudio.playClick();
        this.scene.start("RestaurantInteriorScene");
        return;
      }
    } else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 520, 140) < 75) {
      arcadeInRange = "jeweler";
      // Auto entry like florist!
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 520, 140) < 45) {
        cozyAudio.playClick();
        this.scene.start("JewelerInteriorScene");
        return;
      }
    }

    // Scan for fishing dock and grill
    let parkInRange: any = null;
    const distToDock = Phaser.Math.Distance.Between(this.player.x, this.player.y, 160, 740);
    const distToGrill = Phaser.Math.Distance.Between(this.player.x, this.player.y, 540, 760);
    
    if (distToDock < 45) {
      parkInRange = "fishing";
    } else if (distToGrill < 45) {
      parkInRange = "mangal";
    }

    // 3. Update Visual overlay triggers
    this.activeSeatInRange = seatInRange;
    this.activeArcadeInRange = arcadeInRange;
    this.activeParkInRange = parkInRange;

    if (this.player.isSitting) {
      this.promptKeyLabel?.setPosition(this.player.x, this.player.y - 120);
      this.promptKeyLabel?.setText("Ayağa kalkmak için [E]'ye bas");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (this.isFishing) {
      this.promptKeyLabel?.setPosition(this.player.x, this.player.y - 80);
      this.promptKeyLabel?.setText("Balık tutuluyor... Bekle 🎣");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (this.isCooking) {
      this.promptKeyLabel?.setPosition(this.player.x, this.player.y - 80);
      this.promptKeyLabel?.setText("Balık ızgarada cızırdayarak pişiyor... 🔥");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (seatInRange) {
      this.promptKeyLabel?.setPosition(seatInRange.x, seatInRange.y - 30);
      this.promptKeyLabel?.setText("Oturmak için [E]'ye bas");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (parkInRange === "fishing") {
      this.promptKeyLabel?.setPosition(160, 680);
      this.promptKeyLabel?.setText("Balık tutmak için [E]'ye bas! 🎣");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (parkInRange === "mangal") {
      this.promptKeyLabel?.setPosition(540, 715);
      this.promptKeyLabel?.setText("Balık pişirmek için [E]'ye bas! 🍢🔥");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (arcadeInRange === "hockey") {
      this.promptKeyLabel?.setPosition(1260, 480);
      this.promptKeyLabel?.setText("Hava Hokeyi oynamak için [E]'ye bas! 🏒");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (arcadeInRange === "bowling") {
      this.promptKeyLabel?.setPosition(1400, 480);
      this.promptKeyLabel?.setText("Bowling oynamak için [E]'ye bas! 🎳");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (arcadeInRange === "billiards") {
      this.promptKeyLabel?.setPosition(1260, 640);
      this.promptKeyLabel?.setText("Bilardo oynamak için [E]'ye bas! 🎱");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (arcadeInRange === "gokart") {
      this.promptKeyLabel?.setPosition(1400, 640);
      this.promptKeyLabel?.setText("Go-Kart yarışı yapmak için [E]'ye bas! 🏎️💨");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (arcadeInRange === "flower") {
      this.promptKeyLabel?.setPosition(90, 115);
      this.promptKeyLabel?.setText("berraflower'a girmek için kapıya yürü 🌸");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (arcadeInRange === "cafe") {
      this.promptKeyLabel?.setPosition(1220, 40);
      this.promptKeyLabel?.setText("Ghalia Lounge'a girmek için kapıya yürü ☕✨");
      this.promptKeyLabel?.setAlpha(0.9);
    } else if (arcadeInRange === "jeweler") {
      this.promptKeyLabel?.setPosition(520, 145);
      this.promptKeyLabel?.setText("Zen Pırlanta'ya girmek için kapıya yürü 💎");
      this.promptKeyLabel?.setAlpha(0.9);
    } else {
      this.promptKeyLabel?.setAlpha(0);
    }

    // 4. Partner proximity check for gifting button
    if (this.partner) {
      const distToPartner = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.partner.x, this.partner.y);
      (window as any).isCloseToPartner = distToPartner < 70;
    } else {
      (window as any).isCloseToPartner = false;
    }
  }

  private handleKeyboardAction(key: string) {
    if (key === "E") {
      if (this.player.isSitting) {
        // Stand up
        this.player.standUp();
        if (this.partner && this.partner.isSitting) {
          this.partner.standUp();
        }
        
        // Clean outdoor food plates instantly when standing up
        this.outdoorFoodGraphics.forEach(g => g.destroy());
        this.outdoorFoodGraphics = [];

        // Clean up Ghalia Menu window callbacks
        delete (window as any).triggerGhaliaOrder;
        delete (window as any).triggerGhaliaTeaResponse;
        delete (window as any).triggerGhaliaBillPaid;

        this.seats.forEach((s) => {
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y) < 25) {
            s.occupied = false;
          }
        });
        if (this.networkSystem) {
          this.networkSystem.send("stand", {});
        }
      } else if (this.activeSeatInRange) {
        // Sit down
        const seat = this.activeSeatInRange;
        this.player.sitDown(seat.x, seat.y, 0);
        seat.occupied = true;

        if (this.networkSystem) {
          this.networkSystem.send("sit", { x: seat.x, y: seat.y });
        }

        if (seat.type === "cinema") {
          if ((window as any).triggerCinemaScreenOpen) {
            (window as any).triggerCinemaScreenOpen();
          }
        }

        if (seat.type === "cafe") {
          // If in AI simulation, seat companion opposite automatically
          if (this.playMode === "ai" && this.partner) {
            const isT1 = seat.zoneId.includes("t1");
            const oppositePrefix = isT1 ? "cafe_t1" : "cafe_t2";
            const oppositeSeat = this.seats.find(s => s.type === "cafe" && s.zoneId.startsWith(oppositePrefix) && s !== seat);
            if (oppositeSeat) {
              oppositeSeat.occupied = true;
              this.partner.sitDown(oppositeSeat.x, oppositeSeat.y);
            }
          }

          // Register temporary order callback for the outdoor seat
          (window as any).triggerGhaliaOrder = (food: string, drink: string) => {
            if (seat.parentObject) {
              // Wait 1.5 seconds after order and spawn Kaan with their custom dishes!
              this.time.delayedCall(1500, () => {
                this.spawnOutdoorWaiter(seat.parentObject.x, seat.parentObject.y, food, drink);
              });
            }
          };

          // Trigger Ghalia Lounge Menu Popup React modal!
          if ((window as any).triggerGhaliaMenuOpen) {
            (window as any).triggerGhaliaMenuOpen();
          }
        }

        // If sitting near partner, trigger glow celebration!
        this.checkPartnerAdjacentSeatGlow(seat);
      } else if (this.activeParkInRange === "fishing") {
        this.triggerFishingSequence();
      } else if (this.activeParkInRange === "mangal") {
        this.triggerGrillingSequence();
      } else if (this.activeArcadeInRange === "hockey") {
        // Launch Air Hockey
        cozyAudio.playClick();
        this.scene.pause("MainScene");
        this.scene.launch("AirHockeyScene", {
          isAI: this.playMode === "ai",
          networkSystem: this.networkSystem
        });
      } else if (this.activeArcadeInRange === "bowling") {
        // Launch Bowling
        cozyAudio.playClick();
        this.scene.pause("MainScene");
        this.scene.launch("BowlingScene", {
          isAI: this.playMode === "ai",
          networkSystem: this.networkSystem
        });
      } else if (this.activeArcadeInRange === "billiards") {
        // Launch Billiards
        cozyAudio.playClick();
        this.scene.pause("MainScene");
        this.scene.launch("BilliardsScene", {
          isAI: this.playMode === "ai",
          networkSystem: this.networkSystem
        });
      } else if (this.activeArcadeInRange === "gokart") {
        // Launch Go-Kart Racing
        cozyAudio.playClick();
        this.scene.pause("MainScene");
        this.scene.launch("GoKartScene", {
          isAI: this.playMode === "ai",
          networkSystem: this.networkSystem
        });
      }
    } else if (key === "F") {
      if (this.activeArcadeInRange === "flower") {
        cozyAudio.playClick();
        this.scene.start("FloristInteriorScene");
      } else if (this.activeArcadeInRange === "cafe") {
        cozyAudio.playClick();
        this.scene.start("RestaurantInteriorScene");
      }
    }
  }

  private checkPartnerAdjacentSeatGlow(currentSeat: any) {
    // If partner is sitting on seat in same zone, trigger the benches glow emitter!
    this.seats.forEach((seat) => {
      if (seat !== currentSeat && seat.zoneId.split("_")[0] === currentSeat.zoneId.split("_")[0]) {
        if (this.partner.isSitting && Phaser.Math.Distance.Between(this.partner.x, this.partner.y, seat.x, seat.y) < 15) {
          // Trigger bench warm love glow!
          if (currentSeat.parentObject && typeof currentSeat.parentObject.triggerCozyGlow === "function") {
            currentSeat.parentObject.triggerCozyGlow();
          }
        }
      }
    });
  }

  private spawnSeatLoveEmitter(x: number, y: number) {
    cozyAudio.playGiftBell();

    const particles = this.add.particles(x, y - 20, "part_heart", {
      speed: { min: -60, max: 60 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 1.2 },
      alpha: { start: 1, end: 0 },
      gravityY: -20,
      lifespan: 1600,
      frequency: 100,
      maxParticles: 15,
    });
    particles.setDepth(y + 20);

    this.time.delayedCall(2000, () => {
      particles.destroy();
    });
  }

  // --- External trigger binds for React UI overlay buttons ---
  public triggerLocalEmote(emoji: string) {
    this.player.displayEmote(emoji);
    if (this.networkSystem) {
      this.networkSystem.send("emote", { emoji });
    }
  }

  public triggerLocalGift(flowerType: string) {
    const isJewel = ["ring", "necklace", "bracelet"].includes(flowerType);
    if (isJewel) {
      this.partner.receiveJewel(flowerType);
    } else {
      this.partner.receiveFlower(flowerType);
    }

    if (this.networkSystem) {
      this.networkSystem.send("gift", { flowerType });
    } else {
      // AI companion reaction and sweet reciprocation
      this.time.delayedCall(1600, () => {
        let text = "";
        if (isJewel) {
          text = "Seninle parıldamak harika bir duygu! 💖";
        } else {
          const flowerNames: any = {
            rose: "Tatlı Aşk Gülü",
            hydrangea: "Bahar Ortancası",
            sunflower: "Altın Günebakan",
            lavender: "Yıldızlı Lavanta",
            tulip: "Peri Lalesi"
          };
          const name = flowerNames[flowerType] || "harika çiçek";
          text = `Burası rüya gibi! berraflower'dan aldığın bu ${name} kalbimi eritti! Çok zarifsin, hayatım... 🌸✨`;
        }
        
        this.partner.displaySpeechBubble(text);
        
        // Reciprocate after some delay!
        this.time.delayedCall(2400, () => {
          if (isJewel) {
            this.partner.displaySpeechBubble("Benim de sana berraflower'dan tatlı bir sürprizim var!");
          } else {
            this.partner.displaySpeechBubble("Ben de senin için berraflower'dan en sevdiğin çiçeği seçtim!");
          }

          this.time.delayedCall(1500, () => {
            if (isJewel) {
              this.player.receiveJewel(flowerType);
            } else {
              const flowers = ["rose", "hydrangea", "sunflower", "lavender", "tulip"];
              const randomFlower = flowers[Math.floor(Math.random() * flowers.length)];
              this.player.receiveFlower(randomFlower);
            }
          });
        });
      });
    }
  }

  public triggerLocalCoffee() {
    this.player.drinkCoffee();
    if (this.networkSystem) {
      this.networkSystem.send("coffee", {});
    }
  }

  public triggerLocalOrder(foodType: string) {
    this.player.receiveFood(foodType);

    if (this.networkSystem) {
      this.networkSystem.send("order", { foodType });
    } else {
      // AI companion reaction and sweet reciprocation in Cafe ordering
      this.time.delayedCall(1600, () => {
        const textMap: any = {
          latte: "☕ Cozy Latte enfes kokuyor! Afiyet olsun tatlım.",
          cake: "🍰 Çilekli pasta tam bizim aşkımız gibi tatlı! Paylaştığın için teşekkürler.",
          bubbletea: "🧋 Matcha Bubble Tea! En sevdiğim, harikasın!",
          pancake: "🥞 Çikolatalı pankek aşkımıza enerji katar!",
          ramen: "🍜 Birlikte sıcak bir Ramen kasesi paylaşmak çok cozy!"
        };
        this.partner.displaySpeechBubble(textMap[foodType] || "😋 Harika gözüküyor!");

        // Reciprocate order after some delay
        this.time.delayedCall(2200, () => {
          const foods = ["latte", "cake", "bubbletea", "pancake", "ramen"];
          const randomFood = foods[Math.floor(Math.random() * foods.length)];
          this.partner.displaySpeechBubble(`Ben de bize bir ${randomFood === "latte" ? "Latte" : randomFood === "cake" ? "Pasta" : randomFood === "bubbletea" ? "Bubble Tea" : randomFood === "pancake" ? "Pankek" : "Ramen"} aldım!`);
          
          this.time.delayedCall(1500, () => {
            this.partner.receiveFood(randomFood);
          });
        });
      });
    }
  }

  public setCozyAtmosphere(mode: string) {
    const clock = (window as any).gameClock;
    if (clock) {
      if (mode === "sunny") {
        clock.hour = 12;
        clock.minute = 0;
      } else if (mode === "sunset") {
        clock.hour = 18;
        clock.minute = 30;
      } else if (mode === "rainy") {
        clock.hour = 23;
        clock.minute = 0;
      }
      clock.lastTick = Date.now();
    }
  }

  private spawnOutdoorWaiter(targetX: number, targetY: number, foodName: string = "Bonfile Lokum", drinkName: string = "Meyve Kokteyli") {
    // Spawn Waiter Kaan at the Ghalia Lounge arched entrance doors
    const waiter = this.add.container(1220, 110);
    waiter.setDepth(targetY - 10);

    const bodyGfx = this.add.graphics();
    // Butler Tuxedo Vest / Body
    bodyGfx.fillStyle(0x1e293b, 1.0); // Slate dark vest
    bodyGfx.fillRoundedRect(-12, 0, 24, 26, 4);
    // White shirt collar V-neck
    bodyGfx.fillStyle(0xffffff, 1.0);
    bodyGfx.fillTriangle(-5, 0, 5, 0, 0, 8);
    // Tiny black bow tie
    bodyGfx.fillStyle(0x0f172a, 1.0);
    bodyGfx.fillRect(-4, 1, 8, 3);
    bodyGfx.fillTriangle(-4, 0, -4, 5, 0, 2.5);
    bodyGfx.fillTriangle(4, 0, 4, 5, 0, 2.5);

    // Head
    bodyGfx.fillStyle(0xfcd34d, 1.0); // peach skin
    bodyGfx.fillCircle(0, -10, 13);
    bodyGfx.lineStyle(1.5, 0x1e1b18, 1.0);
    bodyGfx.strokeCircle(0, -10, 13);

    // Sharp Groomed Black Hair
    bodyGfx.fillStyle(0x0f172a, 1.0);
    bodyGfx.beginPath();
    bodyGfx.arc(0, -12, 13, Math.PI, 0, false);
    bodyGfx.fill();
    bodyGfx.fillRect(-13, -12, 3, 6); // sideburns
    bodyGfx.fillRect(10, -12, 3, 6);

    // Eyes
    bodyGfx.fillStyle(0x0f172a, 1.0);
    bodyGfx.fillCircle(-4, -9, 2);
    bodyGfx.fillCircle(4, -9, 2);

    // Silver serving tray & hand
    bodyGfx.fillStyle(0xcbd5e1, 1.0);
    bodyGfx.fillEllipse(18, 4, 16, 4);
    bodyGfx.lineStyle(1, 0x94a3b8, 1.0);
    bodyGfx.strokeEllipse(18, 4, 16, 4);
    
    // Dome Lid
    bodyGfx.fillStyle(0x94a3b8, 1.0);
    bodyGfx.beginPath();
    bodyGfx.arc(18, 2, 7, Math.PI, 0, false);
    bodyGfx.fill();
    bodyGfx.fillStyle(0xfcd34d, 1.0);
    bodyGfx.fillCircle(18, -5, 2.5); // gold knob

    waiter.add(bodyGfx);

    const tag = this.add.text(0, -28, "Garson", {
      font: "bold 9px Arial",
      color: "#ffffff",
      backgroundColor: "rgba(15,23,42,0.85)",
      padding: { x: 3, y: 1 }
    });
    tag.setOrigin(0.5);
    waiter.add(tag);

    // Walk Kaan to the table
    this.tweens.add({
      targets: waiter,
      x: targetX,
      y: targetY - 45,
      duration: 3500,
      ease: "Power2.easeInOut",
      onComplete: () => {
        cozyAudio.playCuteBubble();

        // Dialogue reflecting exact selected food and drink!
        this.player.displaySpeechBubble(`Harika! Garson siparişimiz olan ${foodName} ve ${drinkName}'i getirdi! 🍽️🍹`);
        if (this.partner) {
          this.time.delayedCall(1800, () => {
            this.partner.displaySpeechBubble(`Nefis kokuyor sevgilim! ${foodName} harika bir seçim! 🥰`);
            this.partner.displayEmote("💖");
          });
        }

        // Draw food plates procedurally on the outdoor table
        const foodGfx = this.add.graphics();
        foodGfx.setDepth(targetY + 2);
        
        // Draw Left plate
        foodGfx.fillStyle(0xffffff, 1.0);
        foodGfx.fillCircle(targetX - 20, targetY - 4, 9);
        foodGfx.lineStyle(1, 0xd4af37, 1.0);
        foodGfx.strokeCircle(targetX - 20, targetY - 4, 9);
        
        // Draw food color based on selection
        const isFish = foodName.includes("Levrek");
        foodGfx.fillStyle(isFish ? 0x0284c7 : 0x7c2d12, 1.0); // blue-silver fish or brown steak
        foodGfx.fillRect(targetX - 25, targetY - 7, 10, 6);

        // Draw Right plate
        foodGfx.fillStyle(0xffffff, 1.0);
        foodGfx.fillCircle(targetX + 20, targetY - 4, 9);
        foodGfx.strokeCircle(targetX + 20, targetY - 4, 9);
        foodGfx.fillStyle(isFish ? 0x0284c7 : 0x7c2d12, 1.0);
        foodGfx.fillRect(targetX + 15, targetY - 7, 10, 6);

        // Cocktail glass
        const isLemonade = drinkName.includes("Limonata");
        foodGfx.fillStyle(isLemonade ? 0xeab308 : 0xf97316, 1.0); // yellow lemonade or orange cocktail
        foodGfx.fillRect(targetX - 4, targetY - 14, 5, 8);
        foodGfx.lineStyle(1, 0xffffff, 1.0);
        foodGfx.strokeRect(targetX - 4, targetY - 14, 5, 8);

        this.outdoorFoodGraphics.push(foodGfx);

        // Return Kaan back inside Ghalia Lounge
        this.time.delayedCall(4500, () => {
          // Clear tray from waiter graphics
          bodyGfx.clear();
          // Draw Kaan walking without tray
          bodyGfx.fillStyle(0x1e293b, 1.0);
          bodyGfx.fillRoundedRect(-12, 0, 24, 26, 4);
          bodyGfx.fillStyle(0xffffff, 1.0);
          bodyGfx.fillTriangle(-5, 0, 5, 0, 0, 8);
          bodyGfx.fillStyle(0x0f172a, 1.0);
          bodyGfx.fillRect(-4, 1, 8, 3);
          bodyGfx.fillTriangle(-4, 0, -4, 5, 0, 2.5);
          bodyGfx.fillTriangle(4, 0, 4, 5, 0, 2.5);
          bodyGfx.fillStyle(0xfcd34d, 1.0);
          bodyGfx.fillCircle(0, -10, 13);
          bodyGfx.lineStyle(1.5, 0x1e1b18, 1.0);
          bodyGfx.strokeCircle(0, -10, 13);
          bodyGfx.fillStyle(0x0f172a, 1.0);
          bodyGfx.beginPath();
          bodyGfx.arc(0, -12, 13, Math.PI, 0, false);
          bodyGfx.fill();
          bodyGfx.fillRect(-13, -12, 3, 6);
          bodyGfx.fillRect(10, -12, 3, 6);
          bodyGfx.fillStyle(0x0f172a, 1.0);
          bodyGfx.fillCircle(-4, -9, 2);
          bodyGfx.fillCircle(4, -9, 2);

          this.tweens.add({
            targets: waiter,
            x: 1220,
            y: 110,
            duration: 3500,
            ease: "Power1.easeInOut",
            onComplete: () => {
              waiter.destroy();
            }
          });
        });
      }
    });
  }

  private setupCozyRiversidePark() {
    // 1. Cherry Blossom Tree A (Pink)
    const spawnCherryTree = (tx: number, ty: number) => {
      const treeGfx = this.add.graphics();
      treeGfx.setDepth(ty);
      // Trunk shadow
      treeGfx.fillStyle(0x000000, 0.15);
      treeGfx.fillEllipse(tx, ty + 2, 24, 8);
      // Trunk (Warm brown)
      treeGfx.fillStyle(0x5c3d2e, 1.0);
      treeGfx.fillRect(tx - 6, ty - 32, 12, 32);
      // Pink Leaves foliage (layered circles)
      treeGfx.fillStyle(0xf472b6, 0.9); // light pink core
      treeGfx.fillCircle(tx, ty - 45, 28);
      treeGfx.fillStyle(0xdb2777, 0.85); // magenta shadows
      treeGfx.fillCircle(tx - 14, ty - 40, 20);
      treeGfx.fillCircle(tx + 14, ty - 40, 20);
      treeGfx.fillStyle(0xfbcfe8, 0.95); // highlights
      treeGfx.fillCircle(tx, ty - 55, 18);

      // Solid collider trunk base
      const col = this.colliders.create(tx, ty - 8, undefined, undefined, false);
      col.setSize(20, 16);
      col.setVisible(false);
      this.physics.add.existing(col, true);
    };

    spawnCherryTree(390, 690);
    spawnCherryTree(580, 840);

    // 2. Cozy Stone Barbecue Grill (Mangal)
    const grillX = 540;
    const grillY = 760;
    const grillGfx = this.add.graphics();
    grillGfx.setDepth(grillY);

    // Shadow
    grillGfx.fillStyle(0x000000, 0.2);
    grillGfx.fillEllipse(grillX, grillY + 12, 32, 12);
    // Base stonework cylinder
    grillGfx.fillStyle(0x374151, 1.0);
    grillGfx.fillRoundedRect(grillX - 16, grillY - 20, 32, 32, 6);
    grillGfx.lineStyle(2.5, 0x1f2937, 1.0);
    grillGfx.strokeRoundedRect(grillX - 16, grillY - 20, 32, 32, 6);
    // Grill rack glowing embers
    grillGfx.fillStyle(0xe11d48, 1.0); // glowing hot coals red
    grillGfx.fillCircle(grillX, grillY - 18, 12);
    grillGfx.lineStyle(1.5, 0xd97706, 0.8); // orange metal ring
    grillGfx.strokeCircle(grillX, grillY - 18, 12);
    // Metal grate wires
    grillGfx.lineStyle(1, 0x4b5563, 0.6);
    grillGfx.lineBetween(grillX - 12, grillY - 18, grillX + 12, grillY - 18);
    grillGfx.lineBetween(grillX - 9, grillY - 22, grillX + 9, grillY - 22);
    grillGfx.lineBetween(grillX - 9, grillY - 14, grillX + 9, grillY - 14);

    // Grill solid collider
    const grillCol = this.colliders.create(grillX, grillY - 4, undefined, undefined, false);
    grillCol.setSize(28, 24);
    grillCol.setVisible(false);
    this.physics.add.existing(grillCol, true);

    // Sizzling Grill smoke particle emitter
    const smokeParticles = this.add.particles(grillX, grillY - 20, "part_firefly", {
      speedY: { min: -15, max: -35 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.3, end: 0.8 },
      alpha: { start: 0.4, end: 0 },
      tint: 0x9ca3af, // Grey smoke
      lifespan: 1600,
      frequency: 200
    });
    smokeParticles.setDepth(grillY + 1);

    // 3. Render Interactive Benches inside Terracotta square
    const drawParkBench = (bx: number, by: number) => {
      const g = this.add.graphics();
      g.setDepth(by);
      // Bench seat shadow
      g.fillStyle(0x000000, 0.15);
      g.fillEllipse(bx, by + 12, 80, 10);
      
      // Wooden slats (Rich amber oak)
      g.fillStyle(0xb45309, 1.0);
      g.fillRect(bx - 36, by - 8, 72, 14); // seat
      g.fillStyle(0x78350f, 1.0);
      g.fillRect(bx - 36, by - 16, 72, 6); // backrest
      
      // Iron frames / legs (Rustic black metal)
      g.fillStyle(0x1f2937, 1.0);
      g.fillRect(bx - 38, by - 16, 3, 26); // left side post
      g.fillRect(bx + 35, by - 16, 3, 26); // right side post
      
      this.seats.push(
        { x: bx - 16, y: by - 4, type: "bench", zoneId: `park_bench_${by}_left`, occupied: false, parentObject: g },
        { x: bx + 16, y: by - 4, type: "bench", zoneId: `park_bench_${by}_right`, occupied: false, parentObject: g }
      );
    };

    drawParkBench(480, 715);
    drawParkBench(480, 835);
  }

  private triggerFishingSequence() {
    if (this.isFishing) return;
    this.isFishing = true;
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    this.player.displaySpeechBubble("🎣 Ooh, mis gibi nehir havası... Kamışı fırlattım, balık bekliyorum... 🌊");

    // Splash particles in river
    const splash = this.add.particles(100, 740, "part_firefly", {
      speed: { min: 30, max: 80 },
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      tint: 0x60a5fa, // Blue water splashes
      lifespan: 800,
      maxParticles: 8
    });
    splash.setDepth(740);
    cozyAudio.playCuteBubble();

    this.time.delayedCall(2500, () => {
      splash.destroy();
      this.isFishing = false;

      // Dynamic weighted fish probabilities
      const roll = Math.random();
      let fishId = "fish_cipura";
      let fishName = "Boğaz Çipurası";
      let fishIcon = "🐟";

      if (roll < 0.35) {
        fishId = "fish_cipura";
        fishName = "Boğaz Çipurası";
        fishIcon = "🐟";
      } else if (roll < 0.60) {
        fishId = "fish_lufer";
        fishName = "Haliç Lüferi";
        fishIcon = "🐠";
      } else if (roll < 0.80) {
        fishId = "fish_alabalik";
        fishName = "Altın Alabalığı";
        fishIcon = "🐟";
      } else if (roll < 0.95) {
        fishId = "fish_kalkan";
        fishName = "Kral Kalkan Balığı";
        fishIcon = "🐠";
      } else {
        fishId = "fish_denizkizi";
        fishName = "Nadir Deniz Kızı Balığı";
        fishIcon = "🧜‍♀️";
      }

      cozyAudio.playGiftBell();
      this.player.displaySpeechBubble(`🐠 Hey gidi! Harika bir ${fishName} yakaladım! Sırt çantama eklendi. 🎉`);
      this.player.displayEmote("❤️");

      // Spawn caught sparkles celebration
      const sparkles = this.add.particles(this.player.x, this.player.y, "part_heart", {
        speed: { min: 50, max: 120 },
        scale: { start: 0.5, end: 1.2 },
        alpha: { start: 1, end: 0 },
        tint: 0x60a5fa,
        lifespan: 1000,
        maxParticles: 10
      });
      sparkles.setDepth(this.player.depth + 1);
      this.time.delayedCall(1200, () => sparkles.destroy());

      // Add item to Phaser global inventory registry
      const inv = this.registry.get("inventory") || [];
      inv.push({ id: fishId, name: fishName, icon: fishIcon });
      this.registry.set("inventory", inv);

      // Spouse AI Cheers if active
      if (this.playMode === "ai" && this.partner) {
        this.time.delayedCall(1500, () => {
          this.partner.displaySpeechBubble(`Harikasın sevgilim! Tam bir usta balıkçısın! 💖👏`);
          this.partner.displayEmote("💖");
        });
      }
    });
  }

  private triggerGrillingSequence() {
    if (this.isCooking) return;

    // Get current inventory and look for raw fish
    const inv = this.registry.get("inventory") || [];
    const rawFishIdx = inv.findIndex((item: any) => item.id.startsWith("fish_") && !item.id.endsWith("_cooked"));

    if (rawFishIdx === -1) {
      this.player.displaySpeechBubble("Önce nehir kenarındaki iskeleden balık tutmalıyım! 🎣 Buralarda harika çipuralar var...");
      return;
    }

    const rawFish = inv[rawFishIdx];
    this.isCooking = true;
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    this.player.displaySpeechBubble(`🔥 ${rawFish.name}'nı mangala koydum, mis gibi ızgara kokusu yayılıyor... 🍽️`);

    // Sizzling particles
    const sizzle = this.add.particles(540, 740, "part_firefly", {
      speedY: { min: -10, max: -25 },
      scale: { start: 0.4, end: 0.1 },
      alpha: { start: 0.7, end: 0 },
      tint: 0xf97316, // Orange fire sparks
      lifespan: 600,
      frequency: 80
    });
    sizzle.setDepth(760);
    cozyAudio.playCuteBubble();

    this.time.delayedCall(2500, () => {
      sizzle.destroy();
      this.isCooking = false;

      // Remove raw fish
      inv.splice(rawFishIdx, 1);

      // Map raw fish ID to cooked fish ID
      const cookedId = `${rawFish.id}_cooked`;
      const cookedName = `${rawFish.name} Izgara`;
      const cookedIcon = "🍽️";

      inv.push({ id: cookedId, name: cookedName, icon: cookedIcon });
      this.registry.set("inventory", inv);

      cozyAudio.playGiftBell();
      this.player.displaySpeechBubble(`😋 Izgara ${rawFish.name} lokum gibi pişti! Yemek için çantayı [E] veya Sırt Çantası tuşuyla açabilirsin. 🍽️✨`);
      this.player.displayEmote("❤️");

      // AI spouse response
      if (this.playMode === "ai" && this.partner) {
        this.time.delayedCall(1600, () => {
          this.partner.displaySpeechBubble("Luna: Harika kokuyor sevgilim! Ellerine sağlık, hemen yiyelim! 😍🔥");
          this.partner.displayEmote("💖");
        });
      }
    });
  }
}
