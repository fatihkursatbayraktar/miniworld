import Phaser from "phaser";
import Player from "@/game/entities/Player";
import Partner from "@/game/entities/Partner";
import { cozyAudio } from "@/utils/audio";

// Waiter NPC Class with a tray and sharp butler uniform
class WaiterNPC extends Phaser.GameObjects.Container {
  public bodyGfx: Phaser.GameObjects.Graphics;
  public trayGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.bodyGfx = scene.add.graphics();
    this.trayGfx = scene.add.graphics();
    this.add(this.bodyGfx);
    this.add(this.trayGfx);
    
    this.drawWaiter(false); // Draw initial idle state
    scene.add.existing(this);
  }

  public drawWaiter(hasTray: boolean) {
    this.bodyGfx.clear();
    this.trayGfx.clear();

    // Butler Tuxedo Vest / Body
    this.bodyGfx.fillStyle(0x1e293b, 1.0); // Slate dark vest
    this.bodyGfx.fillRoundedRect(-12, 0, 24, 26, 4);
    // White shirt collar V-neck
    this.bodyGfx.fillStyle(0xffffff, 1.0);
    this.bodyGfx.fillTriangle(-5, 0, 5, 0, 0, 8);
    // Tiny black bow tie
    this.bodyGfx.fillStyle(0x0f172a, 1.0);
    this.bodyGfx.fillRect(-4, 1, 8, 3);
    this.bodyGfx.fillTriangle(-4, 0, -4, 5, 0, 2.5);
    this.bodyGfx.fillTriangle(4, 0, 4, 5, 0, 2.5);

    // Head
    this.bodyGfx.fillStyle(0xfcd34d, 1.0); // peach skin
    this.bodyGfx.fillCircle(0, -10, 13);
    this.bodyGfx.lineStyle(1.5, 0x1e1b18, 1.0);
    this.bodyGfx.strokeCircle(0, -10, 13);

    // Sharp Groomed Black Hair
    this.bodyGfx.fillStyle(0x0f172a, 1.0);
    this.bodyGfx.beginPath();
    this.bodyGfx.arc(0, -12, 13, Math.PI, 0, false);
    this.bodyGfx.fill();
    this.bodyGfx.fillRect(-13, -12, 3, 6); // sideburns
    this.bodyGfx.fillRect(10, -12, 3, 6);

    // Eyes
    this.bodyGfx.fillStyle(0x0f172a, 1.0);
    this.bodyGfx.fillCircle(-4, -9, 2);
    this.bodyGfx.fillCircle(4, -9, 2);

    // Silver serving tray & hand if serving
    if (hasTray) {
      // Hand holding tray
      this.trayGfx.fillStyle(0xfcd34d, 1.0);
      this.trayGfx.fillCircle(16, 8, 4);
      // Tray
      this.trayGfx.fillStyle(0xcbd5e1, 1.0);
      this.trayGfx.fillEllipse(18, 4, 16, 4);
      this.trayGfx.lineStyle(1, 0x94a3b8, 1.0);
      this.trayGfx.strokeEllipse(18, 4, 16, 4);
      // Tiny food dish dome lid
      this.trayGfx.fillStyle(0x94a3b8, 1.0);
      this.trayGfx.beginPath();
      this.trayGfx.arc(18, 2, 7, Math.PI, 0, false);
      this.trayGfx.fill();
      this.trayGfx.fillStyle(0xfcd34d, 1.0);
      this.trayGfx.fillCircle(18, -5, 2.5); // gold knob
    }
  }
}

export default class RestaurantInteriorScene extends Phaser.Scene {
  private player!: Player;
  private partner!: Partner;
  private colliders!: Phaser.Physics.Arcade.StaticGroup;
  private promptKeyLabel!: Phaser.GameObjects.Text;

  private nickname = "Player";
  private avatarColor = 0xfb7185;
  private hairStyle = "short";
  private hairColor = 0x78350f;
  private playMode = "ai";

  // Fixed luxury cabin coordinates to prevent layout shifts on mobile
  private shopX = 480;
  private shopY = 225;
  private shopW = 640;
  private shopH = 450;

  // Seats & Tables
  private seats: Array<{
    x: number;
    y: number;
    tableIndex: number;
    side: "left" | "right";
    occupied: boolean;
    sprite: any;
  }> = [];

  // Interactive states
  private activeZone: "exit" | "reception" | "tableSeat" | null = null;
  private activeSeat: any = null;

  // Waiter & Cashier NPCs
  private waiter!: WaiterNPC;
  private cashierGfx!: Phaser.GameObjects.Graphics;

  // Dining sequence states
  public diningState: "idle" | "ordering" | "waiting" | "eating" | "teaOffer" | "drinkingTea" | "billing" | "paid" = "idle";
  public activeTableIndex: number | null = null;
  private tableFoodGraphics: Array<Phaser.GameObjects.Graphics> = [];
  private steamParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private progressBarContainer: Phaser.GameObjects.Container | null = null;
  private progressBarGraphics: Phaser.GameObjects.Graphics | null = null;
  private progressBarText: Phaser.GameObjects.Text | null = null;
  private progressBarTimer: Phaser.Time.TimerEvent | null = null;

  // Cruise ship variables
  private cruiseShip!: Phaser.GameObjects.Graphics;
  private bosphorusGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super("RestaurantInteriorScene");
  }

  public create() {
    this.playMode = this.registry.get("playMode") || "ai";
    this.nickname = this.registry.get("nickname") || "Sunny";
    this.avatarColor = this.registry.get("avatarColor") || 0xfb7185;
    this.hairStyle = this.registry.get("hairStyle") || "short";
    this.hairColor = this.registry.get("hairColor") || 0x78350f;

    // Set physics world and camera bounds to a stable 1600x900 space
    this.physics.world.setBounds(0, 0, 1600, 900);
    this.cameras.main.setBounds(0, 0, 1600, 900);

    // ── 1. BACKGROUND VOID & FLOOR ─────────────────────────────────────────
    const bg = this.add.graphics();
    bg.setDepth(5);
    
    bg.fillStyle(0x07090e, 1.0); // Deep dark space
    bg.fillRect(0, 0, 1600, 900);

    const shopX = this.shopX;
    const shopY = this.shopY;
    const shopW = this.shopW;
    const shopH = this.shopH;

    // Floor drop shadow
    bg.fillStyle(0x020408, 0.7);
    bg.fillRect(shopX - 8, shopY - 8, shopW + 16, shopH + 16);

    // Floorboard: Luxury dark royal marble
    bg.fillStyle(0x0f172a, 1.0);
    bg.fillRect(shopX, shopY, shopW, shopH);

    // Elegant gold marble grids
    bg.lineStyle(1.5, 0xd4af37, 0.2);
    for (let x = shopX; x < shopX + shopW; x += 40) {
      bg.lineBetween(x, shopY, x, shopY + shopH);
    }
    for (let y = shopY; y < shopY + shopH; y += 40) {
      bg.lineBetween(shopX, y, shopX + shopW, y);
    }

    // Cozy entrance rug
    bg.fillStyle(0x991b1b, 0.85); // Crimson velvet welcome rug
    bg.fillRoundedRect(shopX + 260, shopY + shopH - 15, 120, 15, 4);
    bg.lineStyle(2, 0xd4af37, 0.4);
    bg.strokeRoundedRect(shopX + 260, shopY + shopH - 15, 120, 15, 4);

    // ── 2. PANORAMIC BOSPHORUS BRIDGE WINDOW ───────────────────────────────
    // Glass window border
    bg.fillStyle(0x1e293b, 1.0);
    bg.fillRect(shopX + 30, shopY + 20, 580, 110);
    bg.lineStyle(3, 0xd4af37, 0.7); // Gold framing
    bg.strokeRect(shopX + 30, shopY + 20, 580, 110);

    const winX = shopX + 32;
    const winY = shopY + 22;
    const winW = 576;
    const winH = 106;

    // ── 2.5 DYNAMIC CLOCK AND BOSPHORUS WINDOW ──────────────────────────────
    // Initialize global clock if not already set
    if (!(window as any).gameClock) {
      (window as any).gameClock = {
        hour: 12,
        minute: 0,
        lastTick: Date.now()
      };
    }
    const initClock = (window as any).gameClock;

    // Dynamic Bosphorus background graphics
    this.bosphorusGfx = this.add.graphics();
    this.bosphorusGfx.setDepth(6);
    this.drawBosphorusWindowView(initClock.hour, initClock.minute);

    // Glare overlay strips on window
    const winGlare = this.add.graphics();
    winGlare.setDepth(9);
    winGlare.fillStyle(0xffffff, 0.08);
    winGlare.beginPath();
    winGlare.moveTo(winX + 60, winY);
    winGlare.lineTo(winX + 160, winY);
    winGlare.lineTo(winX + 100, winY + winH);
    winGlare.lineTo(winX, winY + winH);
    winGlare.closePath();
    winGlare.fillPath();

    winGlare.beginPath();
    winGlare.moveTo(winX + 320, winY);
    winGlare.lineTo(winX + 400, winY);
    winGlare.lineTo(winX + 340, winY + winH);
    winGlare.lineTo(winX + 260, winY + winH);
    winGlare.closePath();
    winGlare.fillPath();

    // Cruise ship passing animation inside Bosphorus Window
    this.cruiseShip = this.add.graphics();
    this.cruiseShip.setDepth(7);
    this.drawCruiseShip(0, 0);
    this.cruiseShip.setPosition(winX + 200, winY + 64);
    
    // Smoothly cruise back and forth across Bosphorus Strait
    this.tweens.add({
      targets: this.cruiseShip,
      x: winX + winW - 100,
      duration: 18000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        // Toggle direction look by updating drawing
        const isMovingLeft = (this.cruiseShip.active && (this.cruiseShip as any).tweenDirection === "left");
      }
    });

    // ── 3. TABLES AND CHAIRS ───────────────────────────────────────────────
    // Table Grid Setup
    const tableCoords = [
      { x: shopX + 160, y: shopY + 200 },
      { x: shopX + 480, y: shopY + 200 },
      { x: shopX + 160, y: shopY + 340 },
      { x: shopX + 480, y: shopY + 340 }
    ];

    tableCoords.forEach((table, index) => {
      // 1. Draw Table Shadow
      bg.fillStyle(0x000000, 0.15);
      bg.fillEllipse(table.x, table.y + 14, 48, 12);

      // 2. Draw Table stand
      bg.fillStyle(0x1e293b, 1.0);
      bg.fillRect(table.x - 4, table.y, 8, 14);
      bg.fillStyle(0xd4af37, 1.0); // Gold ring stand accent
      bg.fillRect(table.x - 5, table.y + 8, 10, 3);

      // 3. Draw Table Top (Luxury Gold trim with Slate Center)
      bg.fillStyle(0x1e293b, 1.0);
      bg.fillCircle(table.x, table.y - 4, 38);
      bg.lineStyle(2.5, 0xd4af37, 1.0); // Shining Gold rim
      bg.strokeCircle(table.x, table.y - 4, 38);

      // Table candle light
      bg.fillStyle(0xfcd34d, 1.0);
      bg.fillCircle(table.x, table.y - 6, 2.5);
      // Soft candle halo
      bg.fillStyle(0xfcd34d, 0.15);
      bg.fillCircle(table.x, table.y - 6, 12);

      // 4. Draw Chair Left
      const chairLeftGfx = this.add.graphics();
      chairLeftGfx.setDepth(table.y - 12);
      chairLeftGfx.fillStyle(0x991b1b, 1.0); // Crimson cushion
      chairLeftGfx.fillRoundedRect(table.x - 52, table.y - 12, 14, 14, 3);
      chairLeftGfx.lineStyle(1.5, 0xd4af37, 1.0); // gold backrest
      chairLeftGfx.strokeRoundedRect(table.x - 52, table.y - 12, 14, 14, 3);
      chairLeftGfx.fillStyle(0x1e293b, 1.0);
      chairLeftGfx.fillRect(table.x - 54, table.y - 12, 2, 18); // Left frame post

      // 5. Draw Chair Right
      const chairRightGfx = this.add.graphics();
      chairRightGfx.setDepth(table.y - 12);
      chairRightGfx.fillStyle(0x991b1b, 1.0); // Crimson cushion
      chairRightGfx.fillRoundedRect(table.x + 38, table.y - 12, 14, 14, 3);
      chairRightGfx.lineStyle(1.5, 0xd4af37, 1.0); // gold backrest
      chairRightGfx.strokeRoundedRect(table.x + 38, table.y - 12, 14, 14, 3);
      chairRightGfx.fillStyle(0x1e293b, 1.0);
      chairRightGfx.fillRect(table.x + 52, table.y - 12, 2, 18); // Right frame post

      // Register seats into state
      this.seats.push(
        { x: table.x - 45, y: table.y - 2, tableIndex: index, side: "left", occupied: false, sprite: chairLeftGfx },
        { x: table.x + 45, y: table.y - 2, tableIndex: index, side: "right", occupied: false, sprite: chairRightGfx }
      );

      // Create an empty graphics object to render foods procedurally on top of table
      const foodGfx = this.add.graphics();
      foodGfx.setDepth(table.y + 1);
      this.tableFoodGraphics.push(foodGfx);
    });

    // ── 4. RECEPTION / CASHIER DESK ────────────────────────────────────────
    const deskX = shopX + 530;
    const deskY = shopY + 160;

    // Elegant marble podium
    bg.fillStyle(0x0f172a, 1.0);
    bg.fillRoundedRect(deskX, deskY, 70, 40, 4);
    bg.lineStyle(2, 0xd4af37, 1.0); // Gold borders
    bg.strokeRoundedRect(deskX, deskY, 70, 40, 4);

    // Cashier NPC "Can"
    this.cashierGfx = this.add.graphics();
    this.cashierGfx.setDepth(deskY - 5);
    const cx = deskX + 35;
    const cy = deskY - 10;
    // Suit vest
    this.cashierGfx.fillStyle(0x1e293b, 1.0);
    this.cashierGfx.fillRoundedRect(cx - 11, cy, 22, 22, 3);
    // Face skin
    this.cashierGfx.fillStyle(0xfcd34d, 1.0);
    this.cashierGfx.fillCircle(cx, cy - 8, 11);
    this.cashierGfx.lineStyle(1.2, 0x1e1b18, 1.0);
    this.cashierGfx.strokeCircle(cx, cy - 8, 11);
    // Short Hair
    this.cashierGfx.fillStyle(0x78350f, 1.0);
    this.cashierGfx.beginPath();
    this.cashierGfx.arc(cx, cy - 10, 11, Math.PI, 0, false);
    this.cashierGfx.fill();
    // Eyes
    this.cashierGfx.fillStyle(0x0f172a, 1.0);
    this.cashierGfx.fillCircle(cx - 3, cy - 7, 1.8);
    this.cashierGfx.fillCircle(cx + 3, cy - 7, 1.8);

    // Name tag Receptionist "Kasiyer"
    const canTag = this.add.text(cx, cy - 28, "Kasiyer", {
      font: "bold 9px Arial",
      color: "#fcd34d",
      backgroundColor: "rgba(15,23,42,0.85)",
      padding: { x: 3, y: 1 }
    });
    canTag.setOrigin(0.5);
    canTag.setDepth(deskY + 10);

    // ── 5. WAITER NPC "Garson" ───────────────────────────────────────────────
    // Kitchen door / Portal Graphic
    bg.fillStyle(0x1e293b, 1.0);
    bg.fillRect(shopX + 25, shopY + 145, 40, 60);
    bg.lineStyle(2, 0x0f172a, 1.0);
    bg.strokeRect(shopX + 25, shopY + 145, 40, 60);

    this.waiter = new WaiterNPC(this, shopX + 45, shopY + 175);
    this.waiter.setDepth(shopY + 180);

    const kaanTag = this.add.text(0, -28, "Garson", {
      font: "bold 9px Arial",
      color: "#ffffff",
      backgroundColor: "rgba(15,23,42,0.85)",
      padding: { x: 3, y: 1 }
    });
    kaanTag.setOrigin(0.5);
    this.waiter.add(kaanTag);

    // ── 6. SOLID WALL COLLIDERS ────────────────────────────────────────────
    this.colliders = this.physics.add.staticGroup();
    // Border walls
    this.colliders.create(shopX + shopW / 2, shopY - 10, undefined, undefined, false).setSize(shopW, 20);
    this.colliders.create(shopX - 10, shopY + shopH / 2, undefined, undefined, false).setSize(20, shopH);
    this.colliders.create(shopX + shopW + 10, shopY + shopH / 2, undefined, undefined, false).setSize(20, shopH);
    // Split exit door colliders
    this.colliders.create(shopX + 130, shopY + shopH + 10, undefined, undefined, false).setSize(260, 20);
    this.colliders.create(shopX + shopW - 130, shopY + shopH + 10, undefined, undefined, false).setSize(260, 20);

    // Tables as solid circles
    tableCoords.forEach((table) => {
      const col = this.colliders.create(table.x, table.y + 4, undefined, undefined, false);
      col.setSize(48, 20);
    });
    // Reception Desk solid
    this.colliders.create(deskX + 35, deskY + 20, undefined, undefined, false).setSize(70, 40);

    // ── 7. ENTITIES SPAWN ──────────────────────────────────────────────────
    this.player = new Player(this, shopX + 320, shopY + shopH - 75, this.nickname, this.avatarColor, this.hairStyle, this.hairColor);
    this.physics.add.collider(this.player, this.colliders);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.15);
    // Snap camera scroll instantly to player to prevent panning from top-left (0,0) void on start
    this.cameras.main.centerOn(this.player.x, this.player.y);

    if (this.playMode === "ai") {
      this.partner = new Partner(this, shopX + 280, shopY + shopH - 75, "Luna", 0xa78bfa, "long", 0xd97706, true);
      this.physics.add.collider(this.partner, this.colliders);
    }

    // ── 8. INTERACTIVE PROMPTS & INPUTS ────────────────────────────────────
    this.promptKeyLabel = this.add.text(0, 0, "", {
      font: "bold 12px Outfit, Arial",
      color: "#1e293b",
      backgroundColor: "#fcd34d",
      padding: { x: 8, y: 4 }
    });
    this.promptKeyLabel.setOrigin(0.5, 1.0);
    this.promptKeyLabel.setDepth(300);
    this.promptKeyLabel.setAlpha(0);

    this.input.keyboard?.on("keydown-E", this.handleInteractSeat, this);
    this.input.keyboard?.on("keydown-F", this.handleActionKey, this);

    // Mobile touch interaction: Tap anywhere when near an interactive area to trigger action
    this.input.on("pointerdown", () => {
      if (this.activeZone === "reception") {
        this.handleActionKey();
      } else if (this.activeZone === "tableSeat") {
        this.handleInteractSeat();
      } else if (this.player.isSitting) {
        this.handleInteractSeat(); // Stand up on screen tap
      }
    });

    // Register global triggers
    (window as any).triggerGhaliaOrder = (food: string, drink: string) => {
      this.startDiningSequence(food, drink);
    };
    (window as any).triggerGhaliaTeaResponse = (wantsTea: boolean) => {
      this.handleTeaResponse(wantsTea);
    };
    (window as any).triggerGhaliaBillPaid = () => {
      this.handleBillPayment();
    };
  }

  public update(time: number, delta: number) {
    const joystickVel = (window as any).joystickVelocity;
    this.player.update(time, delta, joystickVel);
    if (this.partner) {
      this.partner.update(time, delta, this.player);
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

      // Redraw Bosphorus window backdrop dynamically based on the current hour & minute!
      this.drawBosphorusWindowView(clock.hour, clock.minute);
    }

    const shopX = this.shopX;
    const shopY = this.shopY;
    const shopH = this.shopH;

    const px = this.player.x;
    const py = this.player.y;

    // 1. Exit Door Trigger Scanner
    if (py >= shopY + shopH - 12 && px > shopX + 250 && px < shopX + 370) {
      cozyAudio.playClick();
      // Stand up before leaving
      this.standUpDining();
      this.scene.start("MainScene", { spawnX: 1220, spawnY: 180 });
      return;
    }

    // 2. Scan for adjacent seats
    let seatInRange: any = null;
    let zone: "exit" | "reception" | "tableSeat" | null = null;
    let labelText = "";

    // Proximity to Reception desk
    if (py < shopY + 220 && px > shopX + 480 && px < shopX + 610) {
      zone = "reception";
      labelText = "Ghalia Lounge Kasiyeri ile Konuş 🤵✨";
    } else {
      // Proximity to seats
      this.seats.forEach((seat) => {
        const dist = Phaser.Math.Distance.Between(px, py, seat.x, seat.y);
        if (dist < 40 && !seat.occupied) {
          seatInRange = seat;
          zone = "tableSeat";
          labelText = this.player.isSitting ? "Ayağa Kalkmak İçin [E]'ye Bas" : "Masaya Oturmak İçin [E]'ye Bas 🍷";
        }
      });
    }

    this.activeZone = zone;
    this.activeSeat = seatInRange;

    // Render Action Prompts
    if (this.player.isSitting) {
      this.promptKeyLabel.setPosition(this.player.x, this.player.y - 120);
      this.promptKeyLabel.setText("Ayağa kalkmak için [E]'ye bas");
      this.promptKeyLabel.setAlpha(0.9);
    } else if (zone === "reception") {
      this.promptKeyLabel.setPosition(shopX + 565, shopY + 120);
      this.promptKeyLabel.setText(labelText);
      this.promptKeyLabel.setAlpha(0.9);
    } else if (seatInRange) {
      this.promptKeyLabel.setPosition(seatInRange.x, seatInRange.y - 25);
      this.promptKeyLabel.setText(labelText);
      this.promptKeyLabel.setAlpha(0.9);
    } else {
      this.promptKeyLabel.setAlpha(0);
    }
  }

  // ── Dining Sequence Mechanics ───────────────────────────────────────────

  private handleInteractSeat() {
    if (this.player.isSitting) {
      this.standUpDining();
      return;
    }

    if (this.activeZone === "tableSeat" && this.activeSeat) {
      const seat = this.activeSeat;
      this.player.sitDown(seat.x, seat.y, 0);
      seat.occupied = true;
      this.activeTableIndex = seat.tableIndex;

      // Sit Luna at opposite seat automatically
      if (this.playMode === "ai" && this.partner) {
        // Find opposite seat
        const oppositeSeat = this.seats.find(s => s.tableIndex === seat.tableIndex && s !== seat);
        if (oppositeSeat) {
          oppositeSeat.occupied = true;
          this.partner.sitDown(oppositeSeat.x, oppositeSeat.y);
        }
      }

      // Enter ordering state
      this.diningState = "ordering";
      
      // Delay React menu opening by 1 second to let sits complete beautifully
      this.time.delayedCall(1200, () => {
        if ((window as any).triggerGhaliaMenuOpen) {
          (window as any).triggerGhaliaMenuOpen();
        }
      });
    }
  }

  public startDiningSequence(food: string, drink: string) {
    if (this.activeTableIndex === null) return;
    this.diningState = "waiting";

    // Waiter Mert serves table sequence
    const tableCoords = [
      { x: (this.scale.width - 640) / 2 + 160, y: (this.scale.height - 450) / 2 + 200 },
      { x: (this.scale.width - 640) / 2 + 480, y: (this.scale.height - 450) / 2 + 200 },
      { x: (this.scale.width - 640) / 2 + 160, y: (this.scale.height - 450) / 2 + 340 },
      { x: (this.scale.width - 640) / 2 + 480, y: (this.scale.height - 450) / 2 + 340 }
    ];
    const targetTable = tableCoords[this.activeTableIndex];

    // Show Mert speech bubble
    this.waiter.drawWaiter(true); // show carrying tray!
    
    // Tween Waiter Mert to the table
    this.tweens.add({
      targets: this.waiter,
      x: targetTable.x,
      y: targetTable.y - 45,
      duration: 5000,
      ease: "Power2.easeInOut",
      onComplete: () => {
        cozyAudio.playCuteBubble();
        this.waiter.bodyGfx.setActive(true);
        
        // Waiter drops off food
        this.diningState = "eating";
        this.drawFoodOnTable(food, drink);

        // Speech bubble from Mert
        this.waiter.drawWaiter(false); // remove tray
        this.player.displaySpeechBubble(`Harika! ${food} ve ${drink} nefis görünüyor! 🍽️`);
        if (this.partner) {
          this.time.delayedCall(1800, () => {
            this.partner.displaySpeechBubble(`Çok teşekkürler! Ghalia Lounge cidden efsaneymiş sevgilim! 🥰`);
            this.partner.displayEmote("💖");
          });
        }

        // Move Waiter Mert back to kitchen station
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: this.waiter,
            x: (this.scale.width - 640) / 2 + 45,
            y: (this.scale.height - 450) / 2 + 175,
            duration: 4000,
            ease: "Power1.easeInOut"
          });
        });

        // Trigger 30-Second Eating Progress Bar!
        this.showProgressBar("Ana Yemek Keyfi... 🥩🍷", 30, () => {
          // Food is fully eaten, clear plates
          this.clearFoodOnTable();

          // Waiter comes back for Tea & Dessert offer
          this.diningState = "teaOffer";
          this.tweens.add({
            targets: this.waiter,
            x: targetTable.x,
            y: targetTable.y - 45,
            duration: 4000,
            ease: "Power1.easeInOut",
            onComplete: () => {
              if ((window as any).triggerGhaliaTeaModal) {
                (window as any).triggerGhaliaTeaModal();
              }
            }
          });
        });
      }
    });
  }

  private handleTeaResponse(wantsTea: boolean) {
    if (this.activeTableIndex === null) return;

    const tableCoords = [
      { x: (this.scale.width - 640) / 2 + 160, y: (this.scale.height - 450) / 2 + 200 },
      { x: (this.scale.width - 640) / 2 + 480, y: (this.scale.height - 450) / 2 + 200 },
      { x: (this.scale.width - 640) / 2 + 160, y: (this.scale.height - 450) / 2 + 340 },
      { x: (this.scale.width - 640) / 2 + 480, y: (this.scale.height - 450) / 2 + 340 }
    ];
    const targetTable = tableCoords[this.activeTableIndex];

    if (wantsTea) {
      this.diningState = "drinkingTea";
      // Waiter brings tea
      this.waiter.drawWaiter(true); // tray again
      
      this.time.delayedCall(2000, () => {
        cozyAudio.playCuteBubble();
        this.waiter.drawWaiter(false);
        this.drawTeaOnTable();

        this.player.displaySpeechBubble("İkram baklava ve çay mükemmel! ☕🍰");
        if (this.partner) {
          this.time.delayedCall(1600, () => {
            this.partner.displaySpeechBubble("Türk çayı gibisi yok, çok ince düşünülmüş! 🇹🇷❤️");
          });
        }

        // Trigger 15-Second Tea & Dessert Progress Bar!
        this.showProgressBar("Çay & Tatlı Keyfi... ☕🍰", 15, () => {
          // Tea finished, clear table
          this.clearFoodOnTable();

          // Proceed to Billing
          this.presentBill(targetTable);
        });
      });
    } else {
      // Just drop off the bill directly
      this.presentBill(targetTable);
    }
  }

  private presentBill(targetTable: any) {
    this.diningState = "billing";

    // Waiter puts down bill check folder
    this.drawBillOnTable();

    // Move waiter Mert back
    this.tweens.add({
      targets: this.waiter,
      x: (this.scale.width - 640) / 2 + 45,
      y: (this.scale.height - 450) / 2 + 175,
      duration: 3500,
      ease: "Power1.easeInOut"
    });

    // Fire React checkout Modal
    this.time.delayedCall(1500, () => {
      if ((window as any).triggerGhaliaBillModal) {
        (window as any).triggerGhaliaBillModal();
      }
    });
  }

  private handleBillPayment() {
    this.diningState = "paid";
    cozyAudio.playCuteBubble();

    // Trigger sweet sparkles on payment!
    const tableCoords = [
      { x: (this.scale.width - 640) / 2 + 160, y: (this.scale.height - 450) / 2 + 200 },
      { x: (this.scale.width - 640) / 2 + 480, y: (this.scale.height - 450) / 2 + 200 },
      { x: (this.scale.width - 640) / 2 + 160, y: (this.scale.height - 450) / 2 + 340 },
      { x: (this.scale.width - 640) / 2 + 480, y: (this.scale.height - 450) / 2 + 340 }
    ];
    const targetTable = tableCoords[this.activeTableIndex!];

    const sparks = this.add.particles(targetTable.x, targetTable.y - 10, "part_star", {
      speed: 60,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      quantity: 12,
      blendMode: "ADD",
      tint: 0xd4af37
    });
    sparks.setDepth(150);
    sparks.explode();

    // Dialogue
    this.player.displaySpeechBubble("Ghalia Lounge hesabı ödendi! 💳✨");
    if (this.partner) {
      this.time.delayedCall(1500, () => {
        this.partner.displaySpeechBubble("Harika bir akşamdı sevgilim, çok teşekkür ederim! 🥰");
        this.partner.displayEmote("💖");
      });
    }

    // Clean up table, stand up, and reset state
    this.time.delayedCall(3000, () => {
      this.standUpDining();
    });
  }

  private standUpDining() {
    this.player.standUp();
    if (this.partner) {
      this.partner.standUp();
    }

    // Clean up any progress bar
    this.hideProgressBar();

    // Clear graphics and occupancies
    this.seats.forEach(s => s.occupied = false);
    this.tableFoodGraphics.forEach(g => g.clear());
    if (this.steamParticles) {
      this.steamParticles.destroy();
      this.steamParticles = null;
    }

    this.activeTableIndex = null;
    this.diningState = "idle";
  }

  // ── Procedural Procedural Graphics Drawings ─────────────────────────────

  private drawCruiseShip(x: number, y: number) {
    this.cruiseShip.clear();
    // Hull
    this.cruiseShip.fillStyle(0xffffff, 1.0);
    this.cruiseShip.fillRoundedRect(-14, 0, 28, 6, 2);
    // Ship cabin
    this.cruiseShip.fillStyle(0xe2e8f0, 1.0);
    this.cruiseShip.fillRect(-10, -5, 20, 5);
    // Smoke stack
    this.cruiseShip.fillStyle(0xef4444, 1.0);
    this.cruiseShip.fillRect(4, -8, 3, 3);
    // Ship glowing yellow porthole windows
    this.cruiseShip.fillStyle(0xfef08a, 1.0);
    this.cruiseShip.fillCircle(-6, -2, 1.2);
    this.cruiseShip.fillCircle(0, -2, 1.2);
    this.cruiseShip.fillCircle(6, -2, 1.2);
    this.cruiseShip.fillCircle(-6, 3, 1.0);
    this.cruiseShip.fillCircle(0, 3, 1.0);
    this.cruiseShip.fillCircle(6, 3, 1.0);
  }

  private drawFoodOnTable(food: string, drink: string) {
    if (this.activeTableIndex === null) return;
    const gfx = this.tableFoodGraphics[this.activeTableIndex];
    gfx.clear();

    const tx = 0;
    const ty = -4;

    // Draw Left plate (Player)
    gfx.fillStyle(0xffffff, 1.0);
    gfx.fillCircle(tx - 18, ty, 10);
    gfx.lineStyle(1, 0xd4af37, 1.0); // gold plate rim
    gfx.strokeCircle(tx - 18, ty, 10);
    // Food texture representation (e.g. Steak Bonfile)
    gfx.fillStyle(0x7c2d12, 1.0);
    gfx.fillRoundedRect(tx - 24, ty - 5, 12, 8, 2);
    gfx.fillStyle(0x22c55e, 1.0); // greens
    gfx.fillCircle(tx - 14, ty + 2, 2.5);

    // Draw Right plate (Partner)
    gfx.fillStyle(0xffffff, 1.0);
    gfx.fillCircle(tx + 18, ty, 10);
    gfx.lineStyle(1, 0xd4af37, 1.0);
    gfx.strokeCircle(tx + 18, ty, 10);
    // Food
    gfx.fillStyle(0x7c2d12, 1.0);
    gfx.fillRoundedRect(tx + 12, ty - 5, 12, 8, 2);
    gfx.fillStyle(0x22c55e, 1.0);
    gfx.fillCircle(tx + 22, ty + 2, 2.5);

    // Drinks
    gfx.fillStyle(0xf43f5e, 0.95); // Cocktail
    gfx.fillTriangle(tx - 10, ty - 18, tx - 4, ty - 18, tx - 7, ty - 12);
    gfx.lineStyle(1, 0xffffff, 1.0);
    gfx.lineBetween(tx - 7, ty - 12, tx - 7, ty - 6);

    gfx.fillStyle(0xf43f5e, 0.95);
    gfx.fillTriangle(tx + 4, ty - 18, tx + 10, ty - 18, tx + 7, ty - 12);
    gfx.lineStyle(1, 0xffffff, 1.0);
    gfx.lineBetween(tx + 7, ty - 12, tx + 7, ty - 6);

    // Food steam particles!
    const tableCoords = [
      { x: (this.scale.width - 640) / 2 + 160, y: (this.scale.height - 450) / 2 + 200 },
      { x: (this.scale.width - 640) / 2 + 480, y: (this.scale.height - 450) / 2 + 200 },
      { x: (this.scale.width - 640) / 2 + 160, y: (this.scale.height - 450) / 2 + 340 },
      { x: (this.scale.width - 640) / 2 + 480, y: (this.scale.height - 450) / 2 + 340 }
    ];
    const activeCoords = tableCoords[this.activeTableIndex];

    this.steamParticles = this.add.particles(activeCoords.x, activeCoords.y - 12, "part_star", {
      speedY: -20,
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.3, end: 0 },
      lifespan: 1200,
      quantity: 1,
      frequency: 200,
      tint: 0xffffff
    });
    this.steamParticles.setDepth(140);
  }

  private drawTeaOnTable() {
    if (this.activeTableIndex === null) return;
    const gfx = this.tableFoodGraphics[this.activeTableIndex];
    // Keep food, just draw Turkish Tea glasses and Baklava in center
    const tx = 0;
    const ty = -4;

    // Turkish Tea Glass (Left)
    gfx.fillStyle(0xb45309, 1.0); // Amber tea
    gfx.fillRoundedRect(tx - 8, ty + 4, 5, 8, 1);
    gfx.lineStyle(1, 0xffffff, 0.9); // clear glass rim
    gfx.strokeRoundedRect(tx - 8, ty + 4, 5, 8, 1);
    // Tea saucer
    gfx.fillStyle(0xffffff, 1.0);
    gfx.fillEllipse(tx - 6, ty + 12, 6, 2);

    // Turkish Tea Glass (Right)
    gfx.fillStyle(0xb45309, 1.0);
    gfx.fillRoundedRect(tx + 4, ty + 4, 5, 8, 1);
    gfx.lineStyle(1, 0xffffff, 0.9);
    gfx.strokeRoundedRect(tx + 4, ty + 4, 5, 8, 1);
    gfx.fillStyle(0xffffff, 1.0);
    gfx.fillEllipse(tx + 6, ty + 12, 6, 2);

    // Baklava Plate in center
    gfx.fillStyle(0xffffff, 1.0);
    gfx.fillEllipse(tx, ty - 6, 12, 5);
    gfx.lineStyle(1, 0xd4af37, 0.7);
    gfx.strokeEllipse(tx, ty - 6, 12, 5);
    // Gold diamond shaped Baklavas
    gfx.fillStyle(0xd97706, 1.0);
    gfx.fillRect(tx - 4, ty - 8, 3, 3);
    gfx.fillRect(tx + 1, ty - 8, 3, 3);
    gfx.fillStyle(0x22c55e, 1.0); // pistachio sprinkles!
    gfx.fillCircle(tx - 2, ty - 7, 1);
    gfx.fillCircle(tx + 3, ty - 7, 1);
  }

  private drawBillOnTable() {
    if (this.activeTableIndex === null) return;
    const gfx = this.tableFoodGraphics[this.activeTableIndex];
    gfx.clear(); // clean plates

    const tx = 0;
    const ty = -4;

    // Luxury Leather Bill Folder (Dark gold lined booklet)
    gfx.fillStyle(0x451b03, 1.0);
    gfx.fillRect(tx - 6, ty - 6, 12, 16);
    gfx.lineStyle(1.5, 0xd4af37, 1.0); // Gold borders
    gfx.strokeRect(tx - 6, ty - 6, 12, 16);

    // Small white check paper inside
    gfx.fillStyle(0xffffff, 1.0);
    gfx.fillRect(tx - 3, ty - 3, 7, 10);
    // Scribbled total price lines
    gfx.lineStyle(1, 0x1e293b, 0.8);
    gfx.lineBetween(tx - 2, ty, tx + 2, ty);
    gfx.lineBetween(tx - 2, ty + 3, tx + 1, ty + 3);
  }

  private clearFoodOnTable() {
    if (this.activeTableIndex === null) return;
    const gfx = this.tableFoodGraphics[this.activeTableIndex];
    gfx.clear();
    if (this.steamParticles) {
      this.steamParticles.destroy();
      this.steamParticles = null;
    }
  }

  private showProgressBar(title: string, durationSeconds: number, onCompleteCallback: () => void) {
    this.hideProgressBar();

    const scaleX = this.scale.width / 2;
    const scaleY = 70; // sleek top-center position

    this.progressBarContainer = this.add.container(scaleX, scaleY);
    this.progressBarContainer.setDepth(1000);

    // Glassmorphic dark transparent panel
    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 0.85); // Slate slate
    bg.lineStyle(2, 0xd4af37, 1.0); // Premium Gold frame
    bg.fillRoundedRect(-150, -22, 300, 44, 6);
    bg.strokeRoundedRect(-150, -22, 300, 44, 6);
    this.progressBarContainer.add(bg);

    // Title label
    this.progressBarText = this.add.text(0, -10, title, {
      font: "bold 10px Outfit, Inter, Arial",
      color: "#fcd34d"
    }).setOrigin(0.5);
    this.progressBarContainer.add(this.progressBarText);

    // Remaining seconds indicator
    const timeText = this.add.text(0, 10, `${durationSeconds}s kaldı`, {
      font: "9px Arial",
      color: "#94a3b8"
    }).setOrigin(0.5);
    this.progressBarContainer.add(timeText);

    // Progress bar fill graphics
    this.progressBarGraphics = this.add.graphics();
    this.progressBarContainer.add(this.progressBarGraphics);

    const startTime = this.time.now;
    const totalDuration = durationSeconds * 1000;

    this.progressBarTimer = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        const elapsed = this.time.now - startTime;
        const progress = Math.min(elapsed / totalDuration, 1.0);

        if (this.progressBarGraphics) {
          this.progressBarGraphics.clear();
          // Draw empty tracking background
          this.progressBarGraphics.fillStyle(0x1e293b, 1.0);
          this.progressBarGraphics.fillRect(-120, -1, 240, 5);
          // Draw shiny gold filled progress
          this.progressBarGraphics.fillStyle(0xd4af37, 1.0);
          this.progressBarGraphics.fillRect(-120, -1, 240 * progress, 5);
        }

        const secondsLeft = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));
        timeText.setText(`${secondsLeft}s kaldı`);

        if (progress >= 1.0) {
          this.hideProgressBar();
          onCompleteCallback();
        }
      }
    });
  }

  private hideProgressBar() {
    if (this.progressBarTimer) {
      this.progressBarTimer.destroy();
      this.progressBarTimer = null;
    }
    if (this.progressBarContainer) {
      this.progressBarContainer.destroy();
      this.progressBarContainer = null;
    }
  }

  private drawBosphorusWindowView(hour: number, minute: number) {
    const shopX = this.shopX;
    const shopY = this.shopY;
    const winX = shopX + 32;
    const winY = shopY + 22;
    const winW = 576;
    const winH = 106;

    this.bosphorusGfx.clear();

    const timeVal = hour + minute / 60;

    // Define Sky Gradients and Water Colors based on timeVal decimal hour
    let skyTop = 0x020617;
    let skyBottom = 0x0f172a;
    let waterColor = 0x090d16;
    let shoreLightsAlpha = 0.9;
    let ledAlpha = 0.95;
    let ledColor = 0x3b82f6; // signature neon blue bridge cable light

    if (timeVal >= 6.0 && timeVal < 8.0) {
      // Sunrise transition
      const t = (timeVal - 6.0) / 2.0;
      skyTop = this.interpolateColor(0x020617, 0xd97706, t);
      skyBottom = this.interpolateColor(0x0f172a, 0xffedd5, t);
      waterColor = this.interpolateColor(0x090d16, 0x451b03, t);
      shoreLightsAlpha = 0.9 - 0.7 * t;
      ledAlpha = 0.95 - 0.75 * t;
    } else if (timeVal >= 8.0 && timeVal < 16.5) {
      // Warm Sunny Day
      skyTop = 0x0284c7; // bright sky blue
      skyBottom = 0xe0f2fe; // light cream blue
      waterColor = 0x0c4a6e; // deep Strait blue
      shoreLightsAlpha = 0.0;
      ledAlpha = 0.0;
    } else if (timeVal >= 16.5 && timeVal < 19.5) {
      // Pink Golden Hour / Sunset transition
      const t = (timeVal - 16.5) / 3.0;
      skyTop = this.interpolateColor(0x0284c7, 0xbe185d, t);
      skyBottom = this.interpolateColor(0xe0f2fe, 0xfecdd3, t);
      waterColor = this.interpolateColor(0x0c4a6e, 0x581c87, t);
      shoreLightsAlpha = 0.6 * t;
      ledAlpha = 0.7 * t;
    } else if (timeVal >= 19.5 && timeVal < 21.0) {
      // Twilight fade to Midnight
      const t = (timeVal - 19.5) / 1.5;
      skyTop = this.interpolateColor(0xbe185d, 0x020617, t);
      skyBottom = this.interpolateColor(0xfecdd3, 0x0f172a, t);
      waterColor = this.interpolateColor(0x581c87, 0x090d16, t);
      shoreLightsAlpha = 0.6 + 0.3 * t;
      ledAlpha = 0.7 + 0.25 * t;
    } else {
      // Deep Starry Cozy Night
      skyTop = 0x020617;
      skyBottom = 0x0f172a;
      waterColor = 0x090d16;
      shoreLightsAlpha = 0.9;
      ledAlpha = 0.95;
    }

    // Draw sky gradient background
    this.bosphorusGfx.fillGradientStyle(skyTop, skyTop, skyBottom, skyBottom, 1);
    this.bosphorusGfx.fillRect(winX, winY, winW, winH);

    // Draw Strait water bottom area
    this.bosphorusGfx.fillStyle(waterColor, 1.0);
    this.bosphorusGfx.fillRect(winX, winY + 65, winW, 41);

    // Draw far shore silhouettes
    this.bosphorusGfx.fillStyle(0x0f172a, 1.0);
    this.bosphorusGfx.fillRect(winX, winY + 58, 80, 8);
    this.bosphorusGfx.fillRect(winX + winW - 90, winY + 58, 90, 8);

    // Draw shore golden window lights if night/twilight
    if (shoreLightsAlpha > 0.05) {
      this.bosphorusGfx.fillStyle(0xfef08a, shoreLightsAlpha);
      for (let lx = winX + 10; lx < winX + 70; lx += 15) {
        this.bosphorusGfx.fillRect(lx, winY + 60, 4, 3);
      }
      for (let rx = winX + winW - 80; rx < winX + winW - 10; rx += 20) {
        this.bosphorusGfx.fillRect(rx, winY + 60, 4, 3);
      }
    }

    // DRAW THE BOSPHORUS BRIDGE STRUCTURE
    // Left column & Right column pylons
    this.bosphorusGfx.lineStyle(2.5, 0x475569, 1.0);
    this.bosphorusGfx.lineBetween(winX + 130, winY + 10, winX + 130, winY + 65);
    this.bosphorusGfx.lineBetween(winX + 440, winY + 10, winX + 440, winY + 65);

    // Main bridge deck girder line
    this.bosphorusGfx.lineStyle(2, 0x334155, 1.0);
    this.bosphorusGfx.lineBetween(winX, winY + 45, winX + winW, winY + 45);

    // Red beacon flashing light on tower crowns
    this.bosphorusGfx.fillStyle(0xef4444, 1.0);
    this.bosphorusGfx.fillCircle(winX + 130, winY + 10, 2.5);
    this.bosphorusGfx.fillCircle(winX + 440, winY + 10, 2.5);

    // Main suspension LED cables (only visible if not fully daytime!)
    if (ledAlpha > 0.05) {
      this.bosphorusGfx.lineStyle(1.5, ledColor, ledAlpha);
      
      // Left backstay curve
      const leftBackstay = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(winX, winY + 45),
        new Phaser.Math.Vector2(winX + 65, winY + 30),
        new Phaser.Math.Vector2(winX + 130, winY + 10)
      );
      leftBackstay.draw(this.bosphorusGfx);

      // Main central span curve
      const mainSpan = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(winX + 130, winY + 10),
        new Phaser.Math.Vector2(winX + 285, winY + 42),
        new Phaser.Math.Vector2(winX + 440, winY + 10)
      );
      mainSpan.draw(this.bosphorusGfx);

      // Right backstay curve
      const rightBackstay = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(winX + 440, winY + 10),
        new Phaser.Math.Vector2(winX + 508, winY + 30),
        new Phaser.Math.Vector2(winX + winW, winY + 45)
      );
      rightBackstay.draw(this.bosphorusGfx);

      // Hanger cables (glowing thin pink vertical lines)
      this.bosphorusGfx.lineStyle(0.5, 0xf43f5e, 0.5 * ledAlpha);
      for (let hx = winX + 140; hx < winX + 430; hx += 12) {
        const t = (hx - (winX + 130)) / 310;
        const arcY = (1 - t) * (1 - t) * (winY + 10) + 2 * (1 - t) * t * (winY + 42) + t * t * (winY + 10);
        this.bosphorusGfx.lineBetween(hx, arcY, hx, winY + 45);
      }
      this.bosphorusGfx.strokePath();
    }
  }

  private interpolateColor(color1: number, color2: number, factor: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return (r << 16) | (g << 8) | b;
  }

  private handleActionKey() {
    // Left empty or for future interior cashier dialogues
  }
}
