import Phaser from "phaser";
import Player from "../entities/Player";
import Partner from "../entities/Partner";
import { cozyAudio } from "@/utils/audio";
 
export default class JewelerInteriorScene extends Phaser.Scene {
  public player!: Player;
  public partner!: Partner | null;
  private colliders!: Phaser.Physics.Arcade.StaticGroup;
  private promptKeyLabel!: Phaser.GameObjects.Text;
  private activeZone: "exit" | "shelf" | "cashier" | null = null;
 
  constructor() {
    super({ key: "JewelerInteriorScene" });
  }
 
  create() {
    // Read URL config data from registry (populated in MainScene/BootScene)
    const playMode = this.registry.get("playMode") || "ai";
    const nickname = this.registry.get("nickname") || "Sunny";
    const avatarColor = this.registry.get("avatarColor");
    const hairStyle = this.registry.get("hairStyle");
    const hairColor = this.registry.get("hairColor");
 
    // Soft elegant ambient luxury light (Dark grey-blue hue)
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0c10, 1.0);
    bg.fillRect(0, 0, 1600, 900);
 
    // --- Luxury Jeweler Room Base ---
    const shopW = 600;
    const shopH = 400;
    const shopX = 1600 / 2 - shopW / 2;
    const shopY = 900 / 2 - shopH / 2 + 40;
 
    // White Marble Floor
    bg.fillStyle(0xf8fafc, 1.0);
    bg.fillRoundedRect(shopX, shopY, shopW, shopH, 12);
    // Dark stone border
    bg.lineStyle(6, 0x1e293b, 1.0);
    bg.strokeRoundedRect(shopX, shopY, shopW, shopH, 12);
 
    // Grid lines for marble tiles
    bg.lineStyle(1.5, 0xe2e8f0, 0.5);
    for (let x = shopX + 40; x < shopX + shopW; x += 40) {
      bg.beginPath(); bg.moveTo(x, shopY); bg.lineTo(x, shopY + shopH); bg.strokePath();
    }
    for (let y = shopY + 40; y < shopY + shopH; y += 40) {
      bg.beginPath(); bg.moveTo(shopX, y); bg.lineTo(shopX + shopW, y); bg.strokePath();
    }
 
    // Center Red Carpet
    bg.fillStyle(0x7f1d1d, 0.85); // deep velvet red
    bg.fillRoundedRect(shopX + 160, shopY + 50, 280, 320, 8);
    bg.lineStyle(2, 0xfcd34d, 0.7); // gold trim around carpet
    bg.strokeRoundedRect(shopX + 160, shopY + 50, 280, 320, 8);
 
    // Exit doormat
    bg.fillStyle(0x334155, 1.0);
    bg.fillRect(shopX + 240, shopY + shopH - 12, 120, 12);
    bg.lineStyle(1.5, 0x1e293b, 1.0);
    bg.strokeRect(shopX + 240, shopY + shopH - 12, 120, 12);
 
    // --- Luxury Display Showcases ---
    // Left Showcase
    const leftShowcaseX = shopX + 40;
    const leftShowcaseY = shopY + 80;
    const showcaseW = 100;
    const showcaseH = 200;
 
    bg.fillStyle(0x0f172a, 1.0); // dark velvet display background
    bg.fillRoundedRect(leftShowcaseX, leftShowcaseY, showcaseW, showcaseH, 4);
    bg.lineStyle(3, 0xfcd34d, 1.0); // solid gold frame
    bg.strokeRoundedRect(leftShowcaseX, leftShowcaseY, showcaseW, showcaseH, 4);
 
    // Right Showcase
    const rightShowcaseX = shopX + shopW - 140;
    bg.fillStyle(0x0f172a, 1.0);
    bg.fillRoundedRect(rightShowcaseX, leftShowcaseY, showcaseW, showcaseH, 4);
    bg.lineStyle(3, 0xfcd34d, 1.0);
    bg.strokeRoundedRect(rightShowcaseX, leftShowcaseY, showcaseW, showcaseH, 4);
 
    // Showcase items (Rings, Diamonds, Necklaces)
    const jewelIcons = ["💍", "💎", "👑", "📿", "⌚", "💎", "💍", "📿"];
    let iconIndex = 0;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        // Left shelf items
        const j1 = this.add.text(leftShowcaseX + 20 + col * 40, leftShowcaseY + 20 + row * 45, jewelIcons[iconIndex % jewelIcons.length], { font: "18px Arial" });
        j1.setDepth(10);
        // Right shelf items
        const j2 = this.add.text(rightShowcaseX + 20 + col * 40, leftShowcaseY + 20 + row * 45, jewelIcons[(iconIndex + 3) % jewelIcons.length], { font: "18px Arial" });
        j2.setDepth(10);
        iconIndex++;
      }
    }
 
    // Glass Overlays with Glare
    const glassPanel = this.add.graphics();
    glassPanel.setDepth(12);
    glassPanel.fillStyle(0xf8fafc, 0.15); // faint white glass
    glassPanel.fillRoundedRect(leftShowcaseX, leftShowcaseY, showcaseW, showcaseH, 4);
    glassPanel.fillRoundedRect(rightShowcaseX, leftShowcaseY, showcaseW, showcaseH, 4);
 
    // --- Ecrin's Cashier Desk (Top Center) ---
    const deskX = shopX + 220;
    const deskY = shopY + 60;
    bg.fillStyle(0x1e293b, 1.0); // slate marble desk
    bg.fillRoundedRect(deskX, deskY, 160, 50, 6);
    bg.lineStyle(3, 0xfcd34d, 1.0); // gold trim
    bg.strokeRoundedRect(deskX, deskY, 160, 50, 6);
 
    // Golden Register
    bg.fillStyle(0xfcd34d, 1.0);
    bg.fillRect(deskX + 65, deskY - 15, 30, 20);
    bg.lineStyle(1.5, 0x0f172a, 1.0);
    bg.strokeRect(deskX + 65, deskY - 15, 30, 20);
    const registerText = this.add.text(deskX + 70, deskY - 13, "💎", { font: "11px Arial" });
    registerText.setDepth(15);
 
    // --- Spawn Arif NPC ---
    const npcX = deskX + 80;
    const npcY = deskY - 30;
    const npcGraphics = this.add.graphics();
    npcGraphics.setDepth(80);
    // Arif Suit (Sharp Navy/Black)
    npcGraphics.fillStyle(0x0f172a, 1.0);
    npcGraphics.fillRoundedRect(npcX - 14, npcY, 28, 25, 4);
    // White shirt collar
    npcGraphics.fillStyle(0xffffff, 1.0);
    npcGraphics.fillTriangle(npcX - 4, npcY, npcX + 4, npcY, npcX, npcY + 8);
    // Red Tie
    npcGraphics.lineStyle(2, 0xdc2626, 1.0);
    npcGraphics.beginPath();
    npcGraphics.moveTo(npcX, npcY + 8);
    npcGraphics.lineTo(npcX, npcY + 18);
    npcGraphics.strokePath();
    // Head
    npcGraphics.fillStyle(0xfcd34d, 1.0); // skin peach
    npcGraphics.fillCircle(npcX, npcY - 10, 14);
    npcGraphics.lineStyle(1.5, 0x1e1b18, 1.0);
    npcGraphics.strokeCircle(npcX, npcY - 10, 14);
    // Arif Hair (Short Dark Brown)
    npcGraphics.fillStyle(0x451a03, 1.0);
    npcGraphics.beginPath();
    npcGraphics.arc(npcX, npcY - 12, 14, Math.PI, 0, false);
    npcGraphics.fill();
    // Sideburns
    npcGraphics.fillRect(npcX - 14, npcY - 12, 4, 8);
    npcGraphics.fillRect(npcX + 10, npcY - 12, 4, 8);
    // Eyes
    npcGraphics.fillStyle(0x1e1b18, 1.0);
    npcGraphics.fillCircle(npcX - 4, npcY - 8, 2.5);
    npcGraphics.fillCircle(npcX + 4, npcY - 8, 2.5);
 
    // NPC Name Tag (Arif)
    const npcNameTag = this.add.text(npcX, npcY - 40, "Arif", {
      font: "bold 10px Arial",
      color: "#fcd34d",
      backgroundColor: "rgba(15,23,42,0.8)",
      padding: { x: 4, y: 2 }
    });
    npcNameTag.setOrigin(0.5);
    npcNameTag.setDepth(85);
 
    // --- Physics and Collisions ---
    this.colliders = this.physics.add.staticGroup();
    // Top wall
    this.colliders.create(shopX + shopW / 2, shopY - 10, undefined, undefined, false).setSize(shopW, 20);
    // Left wall
    this.colliders.create(shopX - 10, shopY + shopH / 2, undefined, undefined, false).setSize(20, shopH);
    // Right wall
    this.colliders.create(shopX + shopW + 10, shopY + shopH / 2, undefined, undefined, false).setSize(20, shopH);
    // Bottom Walls (split for door)
    this.colliders.create(shopX + 115, shopY + shopH + 10, undefined, undefined, false).setSize(230, 20);
    this.colliders.create(shopX + shopW - 115, shopY + shopH + 10, undefined, undefined, false).setSize(230, 20);
 
    // Left & Right Showcases colliders
    this.colliders.create(leftShowcaseX + showcaseW / 2, leftShowcaseY + showcaseH / 2, undefined, undefined, false).setSize(showcaseW, showcaseH);
    this.colliders.create(rightShowcaseX + showcaseW / 2, leftShowcaseY + showcaseH / 2, undefined, undefined, false).setSize(showcaseW, showcaseH);
 
    // Cashier Desk collider
    this.colliders.create(deskX + 80, deskY + 25, undefined, undefined, false).setSize(160, 50);
 
    // --- Spawn Player & Partner ---
    this.player = new Player(this, shopX + 300, shopY + shopH - 70, nickname, avatarColor, hairStyle, hairColor);
    this.physics.add.collider(this.player, this.colliders);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.15);
 
    if (playMode === "ai") {
      this.partner = new Partner(this, shopX + 270, shopY + shopH - 70, "Luna", 0xa78bfa, "long", 0xd97706, true);
      this.physics.add.collider(this.partner, this.colliders);
    }
 
    // Interactive Prompt Setup
    this.promptKeyLabel = this.add.text(0, 0, "", {
      font: "bold 13px Outfit, Arial",
      color: "#1e293b",
      backgroundColor: "#fcd34d", // luxury gold tooltip
      padding: { x: 8, y: 4 },
    });
    this.promptKeyLabel.setOrigin(0.5, 1.0);
    this.promptKeyLabel.setDepth(200);
    this.promptKeyLabel.setAlpha(0);
 
    // Input
    this.input.keyboard?.on("keydown-F", this.handleActionKey, this);
 
    // Mobile tap handling
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.activeZone) {
        // Simple tap on character
        const dist = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.player.x, this.player.y);
        if (dist < 80) this.handleActionKey();
      }
    });
  }
 
  update(time: number, delta: number) {
    const joystickVel = (window as any).joystickVelocity;
    this.player.update(time, delta, joystickVel);
    if (this.partner) {
      this.partner.update(time, delta, this.player);
    }
 
    const shopX = 1600 / 2 - 600 / 2;
    const shopY = 900 / 2 - 400 / 2 + 40;
    const playerX = this.player.x;
    const playerY = this.player.y;
 
    let scanZone: "exit" | "shelf" | "cashier" | null = null;
    let labelX = 0;
    let labelY = 0;
    let labelText = "";
 
    // 1. Exit Door Trigger Scanner
    if (playerY >= shopY + 400 - 35 && playerX > shopX + 200 && playerX < shopX + 400) {
      cozyAudio.playClick();
      // Safely spawn away from entry point
      this.scene.start("MainScene", { spawnX: 520, spawnY: 200 });
      return;
    }
 
    // 2. Showcase / Desk scanner
    if (playerY < shopY + 160 && playerX > shopX + 200 && playerX < shopX + 400) {
      scanZone = "cashier";
      labelX = playerX;
      labelY = playerY - 45;
      labelText = "Kuyumcu Arif'le Konuşmak İçin [F]'ye Bas 💎";
    }
 
    this.activeZone = scanZone;
 
    if (scanZone) {
      this.promptKeyLabel.setPosition(labelX, labelY);
      this.promptKeyLabel.setText(labelText);
      this.promptKeyLabel.setAlpha(0.95);
    } else {
      this.promptKeyLabel.setAlpha(0);
    }
 
    // Partner proximity check inside shop
    if (this.partner) {
      const distToPartner = Phaser.Math.Distance.Between(playerX, playerY, this.partner.x, this.partner.y);
      (window as any).isCloseToPartner = distToPartner < 70;
    } else {
      (window as any).isCloseToPartner = false;
    }
  }
 
  private handleActionKey() {
    if (!this.activeZone) return;
 
    if (this.activeZone === "cashier") {
      // Open the EcrinJewelShop React Modal via window callback
      if ((window as any).triggerEcrinShopOpen) {
        cozyAudio.playClick();
        (window as any).triggerEcrinShopOpen();
      }
    }
  }
 
  // Function to let the player visually react to a purchase
  public triggerLocalGift(itemId: string) {
    cozyAudio.playCuteBubble();
    const sparkles = this.add.particles(this.player.x, this.player.y - 20, "part_star", {
      speed: 80,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      quantity: 8,
      blendMode: "ADD",
      tint: 0xfcd34d // Gold sparkles
    });
    sparkles.setDepth(150);
    sparkles.explode();
  }
}
