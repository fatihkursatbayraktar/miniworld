import Phaser from "phaser";
import Player from "@/game/entities/Player";
import Partner from "@/game/entities/Partner";
import { cozyAudio } from "@/utils/audio";
 
export default class FloristInteriorScene extends Phaser.Scene {
  private player!: Player;
  private partner!: Partner;
  private colliders!: Phaser.Physics.Arcade.StaticGroup;
  private promptKeyLabel!: Phaser.GameObjects.Text;
 
  // Custom customizations fetched from MainScene registry
  private nickname = "Player";
  private avatarColor = 0xfb7185;
  private hairStyle = "short";
  private hairColor = 0x78350f;
  private playMode = "ai";

  // Fixed cozy cabin coordinates to prevent layout shifts on mobile
  private shopX = 520;
  private shopY = 250;
  private shopW = 560;
  private shopH = 400;
 
  // Interacting states
  private activeZone: "exit" | "shelf" | "cashier" | null = null;
 
  constructor() {
    super("FloristInteriorScene");
  }
 
  public create() {
    // 1. Fetch registry configurations
    this.playMode = this.registry.get("playMode") || "ai";
    this.nickname = this.registry.get("nickname") || "Sunny";
    this.avatarColor = this.registry.get("avatarColor") || 0xfb7185;
    this.hairStyle = this.registry.get("hairStyle") || "short";
    this.hairColor = this.registry.get("hairColor") || 0x78350f;
 
    // Initialize default inventory registry array if not present
    if (!this.registry.has("inventory")) {
      this.registry.set("inventory", []);
    }
 
    // Set physics world and camera bounds to a stable 1600x900 space
    this.physics.world.setBounds(0, 0, 1600, 900);
    this.cameras.main.setBounds(0, 0, 1600, 900);

    // 3. Draw Florist Interior programmatically (Exquisite Cozy Wooden Cottage theme)
    const bg = this.add.graphics();
    bg.setDepth(5);
 
    // Fill outer background with absolute dark cozy void
    bg.fillStyle(0x07090e, 1.0);
    bg.fillRect(0, 0, 1600, 900);
 
    const shopX = this.shopX;
    const shopY = this.shopY;
    const shopW = this.shopW;
    const shopH = this.shopH;
 
    // Deep wood drop shadow
    bg.fillStyle(0x0a0604, 0.6);
    bg.fillRect(shopX - 8, shopY - 8, shopW + 16, shopH + 16);
 
    // Warm floor boarding (Parchment Cozy Oak floor)
    bg.fillStyle(0x3e1f0e, 1.0);
    bg.fillRect(shopX, shopY, shopW, shopH);
 
    // Floor stripes
    bg.fillStyle(0x2d1508, 0.9);
    for (let y = shopY + 25; y < shopY + shopH; y += 25) {
      bg.fillRect(shopX, y, shopW, 2);
    }
 
    // Warm vintage flower shop walls (Soft Olive Green wallpaper)
    bg.fillStyle(0x365314, 1.0);
    bg.fillRect(shopX, shopY, shopW, 100);
 
    // Dark mahogany wall skirting trim
    bg.fillStyle(0x1e1b18, 1.0);
    bg.fillRect(shopX, shopY + 96, shopW, 6);
 
    // Cozier details: Large vintage green rug in center
    bg.fillStyle(0x14532d, 0.7);
    bg.fillRoundedRect(shopX + 100, shopY + 150, 360, 160, 20);
    bg.lineStyle(2, 0xdc5a24, 0.4);
    bg.strokeRoundedRect(shopX + 100, shopY + 150, 360, 160, 20);
 
    // Green leaf entrance doormat
    bg.fillStyle(0x166534, 1.0);
    bg.fillRect(shopX + 220, shopY + shopH - 12, 120, 12);
    bg.lineStyle(1.5, 0x15803d, 1.0);
    bg.strokeRect(shopX + 220, shopY + shopH - 12, 120, 12);
 
    // 4. Grand Glass Showcase & Dense Flora Display
    const showcaseX = shopX + 40;
    const showcaseY = shopY + 30;
    const showcaseW = 320;
    const showcaseH = 90;
 
    // Showcase wooden backboard
    bg.fillStyle(0x3e1f0e, 1.0);
    bg.fillRect(showcaseX, showcaseY, showcaseW, showcaseH);
    bg.lineStyle(3, 0x2d1508, 1.0);
    bg.strokeRect(showcaseX, showcaseY, showcaseW, showcaseH);
 
    // Showcase interior shelves
    bg.fillStyle(0x5c3d24, 1.0);
    bg.fillRect(showcaseX, showcaseY + 35, showcaseW, 8);
    bg.fillRect(showcaseX, showcaseY + 70, showcaseW, 8);
 
    // Crowded dense flowers inside the showcase
    const shelfFlowersList = [
      // Top Shelf
      { x: showcaseX + 15, y: showcaseY + 12, txt: "🌹" },
      { x: showcaseX + 45, y: showcaseY + 12, txt: "🌷" },
      { x: showcaseX + 75, y: showcaseY + 12, txt: "🌻" },
      { x: showcaseX + 105, y: showcaseY + 12, txt: "🪻" },
      { x: showcaseX + 135, y: showcaseY + 12, txt: "🌸" },
      { x: showcaseX + 165, y: showcaseY + 12, txt: "🌷" },
      { x: showcaseX + 195, y: showcaseY + 12, txt: "🌹" },
      { x: showcaseX + 225, y: showcaseY + 12, txt: "🌻" },
      { x: showcaseX + 255, y: showcaseY + 12, txt: "🪻" },
      { x: showcaseX + 285, y: showcaseY + 12, txt: "🌸" },
      // Bottom Shelf
      { x: showcaseX + 25, y: showcaseY + 47, txt: "🌸" },
      { x: showcaseX + 55, y: showcaseY + 47, txt: "🌻" },
      { x: showcaseX + 85, y: showcaseY + 47, txt: "🌹" },
      { x: showcaseX + 115, y: showcaseY + 47, txt: "🌷" },
      { x: showcaseX + 145, y: showcaseY + 47, txt: "🪻" },
      { x: showcaseX + 175, y: showcaseY + 47, txt: "🌸" },
      { x: showcaseX + 205, y: showcaseY + 47, txt: "🌻" },
      { x: showcaseX + 235, y: showcaseY + 47, txt: "🌹" },
      { x: showcaseX + 265, y: showcaseY + 47, txt: "🌷" },
      { x: showcaseX + 295, y: showcaseY + 47, txt: "🪻" }
    ];
 
    shelfFlowersList.forEach((sf) => {
      const f = this.add.text(sf.x, sf.y, sf.txt, { font: "18px Arial" });
      f.setDepth(10); // Inside showcase
    });
 
    // Glass panel overlay (gives it the translucent glass showcase look)
    const glassPanel = this.add.graphics();
    glassPanel.setDepth(12); // Above flowers
    glassPanel.fillStyle(0xa5f3fc, 0.25); // translucent cyan glass
    glassPanel.fillRect(showcaseX, showcaseY, showcaseW, showcaseH);
    
    // Glass reflection glare lines
    glassPanel.lineStyle(4, 0xffffff, 0.4);
    glassPanel.beginPath();
    glassPanel.moveTo(showcaseX + 20, showcaseY + showcaseH - 10);
    glassPanel.lineTo(showcaseX + showcaseW - 40, showcaseY + 10);
    glassPanel.strokePath();
 
    glassPanel.lineStyle(2, 0xffffff, 0.2);
    glassPanel.beginPath();
    glassPanel.moveTo(showcaseX + 40, showcaseY + showcaseH - 10);
    glassPanel.lineTo(showcaseX + showcaseW - 20, showcaseY + 10);
    glassPanel.strokePath();
 
    // Floor plants to make the shop deeply crowded and botanical
    const floorPlants = [
      { x: shopX + 30, y: shopY + 150, txt: "🌿" },
      { x: shopX + 30, y: shopY + 190, txt: "🪴" },
      { x: shopX + 30, y: shopY + 230, txt: "🌿" },
      { x: shopX + 30, y: shopY + 270, txt: "🪴" },
      { x: shopX + 30, y: shopY + 310, txt: "🌿" },
      { x: shopX + 380, y: shopY + 310, txt: "🪴" },
      { x: shopX + 420, y: shopY + 310, txt: "🌿" },
      { x: shopX + 460, y: shopY + 310, txt: "🪴" },
      { x: shopX + 440, y: shopY + 270, txt: "🌿" },
      { x: shopX + 480, y: shopY + 270, txt: "🪴" }
    ];
    floorPlants.forEach((p) => {
      const f = this.add.text(p.x, p.y, p.txt, { font: "24px Arial" });
      f.setDepth(15);
    });
 
    // Drawing Cashier checkout desk (Right side)
    const deskX = shopX + 410;
    const deskY = shopY + 160;
    bg.fillStyle(0x5c3d24, 1.0);
    bg.fillRect(deskX, deskY, 100, 70); // checkout counter table
    bg.strokeRect(deskX, deskY, 100, 70);
 
    // Old brass register box representation
    bg.fillStyle(0xd97706, 1.0);
    bg.fillRect(deskX + 30, deskY - 18, 36, 18);
    bg.lineStyle(2, 0x78350f, 1.0);
    bg.strokeRect(deskX + 30, deskY - 18, 36, 18);
 
    const cashRegisterText = this.add.text(deskX + 44, deskY - 16, "💵", { font: "11px Arial" });
    cashRegisterText.setDepth(15);
 
    // 5. Spawn cute NPC Florist: Berra Chibi behind desk
    const npcX = deskX + 50;
    const npcY = deskY - 35;
 
    // Lavender dress Torso
    const npcGraphics = this.add.graphics();
    npcGraphics.setDepth(80);
    npcGraphics.fillStyle(0xc084fc, 1.0); // gorgeous violet
    npcGraphics.fillRoundedRect(npcX - 12, npcY, 24, 25, 4);
    npcGraphics.lineStyle(1.5, 0x1e1b18, 1.0);
    npcGraphics.strokeRoundedRect(npcX - 12, npcY, 24, 25, 4);
 
    // Cute Head
    npcGraphics.fillStyle(0xffe4e6, 1.0); // skin peach
    npcGraphics.fillCircle(npcX, npcY - 10, 12);
    npcGraphics.strokeCircle(npcX, npcY - 10, 12);
 
    // Chibi Pink Bun Hair
    npcGraphics.fillStyle(0xf472b6, 1.0); // lovely bright pink hair
    npcGraphics.fillCircle(npcX - 12, npcY - 18, 7); // left bun
    npcGraphics.strokeCircle(npcX - 12, npcY - 18, 7);
    npcGraphics.fillCircle(npcX + 12, npcY - 18, 7); // right bun
    npcGraphics.strokeCircle(npcX + 12, npcY - 18, 7);
 
    npcGraphics.fillStyle(0xf472b6, 1.0); // main hair crown
    npcGraphics.fillRoundedRect(npcX - 14, npcY - 24, 28, 14, 5);
    npcGraphics.strokeRoundedRect(npcX - 14, npcY - 24, 28, 14, 5);
 
    // Cute blushing cheeks & anime eyes
    const eye1 = this.add.text(npcX - 6, npcY - 16, "•", { font: "bold 13px Arial", color: "#1e293b" }).setOrigin(0.5);
    eye1.setDepth(85);
    const eye2 = this.add.text(npcX + 6, npcY - 16, "•", { font: "bold 13px Arial", color: "#1e293b" }).setOrigin(0.5);
    eye2.setDepth(85);
    const blush1 = this.add.text(npcX - 8, npcY - 11, "🌸", { font: "6px Arial" }).setOrigin(0.5);
    blush1.setDepth(85);
    const blush2 = this.add.text(npcX + 8, npcY - 11, "🌸", { font: "6px Arial" }).setOrigin(0.5);
    blush2.setDepth(85);
 
    // Florist Label
    const npcLabel = this.add.text(npcX, npcY - 34, "Yüsra (Florist)", {
      font: "bold 10px Inter, Arial",
      color: "#fef08a"
    }).setOrigin(0.5);
    npcLabel.setDepth(90);
 
    // 6. Setup static boundaries physics colliders group
    this.colliders = this.physics.add.staticGroup();
 
    // Left, Right, Top, Bottom walls to keep players strictly inside the shop floor
    const leftWall = this.colliders.create(shopX, shopY + shopH / 2, undefined, undefined, false);
    leftWall.setSize(8, shopH);
    const rightWall = this.colliders.create(shopX + shopW, shopY + shopH / 2, undefined, undefined, false);
    rightWall.setSize(8, shopH);
    const topWall = this.colliders.create(shopX + shopW / 2, shopY + 98, undefined, undefined, false);
    topWall.setSize(shopW, 8);
    // Split bottom wall to leave a 120px gap for the door mat so players can step on it to exit!
    const bottomWallLeft = this.colliders.create(shopX + 110, shopY + shopH, undefined, undefined, false);
    bottomWallLeft.setSize(220, 8);
    const bottomWallRight = this.colliders.create(shopX + 450, shopY + shopH, undefined, undefined, false);
    bottomWallRight.setSize(220, 8);
 
    // Checkout desk blocking box
    const deskCollider = this.colliders.create(deskX + 50, deskY + 30, undefined, undefined, false);
    deskCollider.setSize(100, 75);
 
    this.colliders.refresh();
 
    // 7. Spawn Player inside Florist Shop (Starting near doormat)
    this.player = new Player(
      this,
      shopX + 280,
      shopY + shopH - 60,
      this.nickname,
      this.avatarColor,
      this.hairStyle,
      this.hairColor
    );
    this.player.setDepth(150);
 
    // 8. Spawn AI/Network Partner inside
    const isAISimulation = this.playMode === "ai";
    const partnerName = isAISimulation ? "Luna" : "Partner";
    const partnerColor = isAISimulation ? 0xa78bfa : 0xf472b6;
 
    this.partner = new Partner(
      this,
      shopX + 330,
      shopY + shopH - 60,
      partnerName,
      partnerColor,
      isAISimulation ? "long" : "spiky",
      isAISimulation ? 0xd97706 : 0x1e293b,
      isAISimulation
    );
    this.partner.setDepth(140);
 
    // Colliders
    this.physics.add.collider(this.player, this.colliders);
    this.physics.add.collider(this.partner, this.colliders);
    // Disabling physical player-partner collision to prevent body blocking in tight cozy spaces
 
    // 9. Floating Trigger Label Prompt
    this.promptKeyLabel = this.add.text(0, 0, "", {
      font: "bold 11px Outfit, Arial",
      color: "#fae8ff",
      backgroundColor: "#1e1b18",
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);
    this.promptKeyLabel.setDepth(200);
    this.promptKeyLabel.setAlpha(0);
 
    // Bind Keyboard Actions
    this.input.keyboard?.on("keydown-F", () => this.handleActionKey());
    this.input.keyboard?.on("keydown-E", () => this.handleActionKey());

    // Mobile touch interaction: Tap anywhere when near an interactive area to trigger action
    this.input.on("pointerdown", () => {
      if (this.activeZone) {
        this.handleActionKey();
      }
    });
 
    // Cameras Follow Player inside shop interior
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);
    // Snap camera scroll instantly to player to prevent panning from top-left (0,0) void on start
    this.cameras.main.centerOn(this.player.x, this.player.y);
 
    // Berra welcomes when entering
    this.time.delayedCall(800, () => {
      this.displayNPCSpeech("berra", "Hoş geldiniz! Raflardan dilediğiniz çiçeği seçip kasada ödeyebilirsiniz! 🌸");
    });
  }
 
  public update(time: number, delta: number) {
    const joystickVel = (window as any).joystickVelocity;
    this.player.update(time, delta, joystickVel);
    this.partner.update(time, delta, this.player);
 
    const shopX = this.shopX;
    const shopY = this.shopY;
    const shopW = this.shopW;
    const shopH = this.shopH;
 
    // Distance scanning for triggers
    const playerX = this.player.x;
    const playerY = this.player.y;
 
    let scanZone: "exit" | "shelf" | "cashier" | null = null;
    let labelX = 0;
    let labelY = 0;
    let labelText = "";
 
    // 1. Exit Door Mat trigger scanner
    const exitX = shopX + 280;
    const exitY = shopY + shopH - 6;
    if (playerY >= shopY + shopH - 65 && playerX >= shopX + 200 && playerX <= shopX + 360) {
      if (playerY >= shopY + shopH - 45) {
        cozyAudio.playClick();
        this.scene.start("MainScene", { spawnX: 95, spawnY: 160 });
        return;
      }
      scanZone = "exit";
      labelX = exitX;
      labelY = exitY - 25;
      labelText = "Bahçeye çıkmak için kapıya yürü 🚪";
    }
    // 2. Shelves trigger scanner (left or center shelf)
    else if (playerY < shopY + 140 && playerX < shopX + 380) {
      scanZone = "shelf";
      labelX = playerX;
      labelY = shopY + 95;
      labelText = "Çiçekleri İncelemek İçin [F]'ye Bas 🌸";
    }
    // 3. Cashier desk trigger scanner
    else if (Phaser.Math.Distance.Between(playerX, playerY, shopX + 460, shopY + 160) < 65) {
      scanZone = "cashier";
      labelX = shopX + 460;
      labelY = shopY + 110;
      labelText = "Kasaya Ödeme Yapmak İçin [F]'ye Bas 💰";
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
 
    if (this.activeZone === "exit") {
      cozyAudio.playClick();
      // Start MainScene and position player right outside berraflower shop cabin!
      this.scene.start("MainScene", { spawnX: 95, spawnY: 160 });
    }
    else if (this.activeZone === "shelf") {
      // Open the Stardew Valley flower catalog modal (BerraflowerShop)
      if ((window as any).triggerFlowerShopOpen) {
        (window as any).triggerFlowerShopOpen();
      }
    }
    else if (this.activeZone === "cashier") {
      const cartFlower = (window as any).selectedCartFlower;
 
      if (cartFlower) {
        cozyAudio.playGiftBell(); // ka-ching style sound
        
        // Add purchased flower into the player's Phaser inventory registry array
        const inv = this.registry.get("inventory") || [];
        
        const flowerDetails: any = {
          rose: { id: "rose", name: "Tatlı Aşk Gülü", icon: "🌹" },
          hydrangea: { id: "hydrangea", name: "Bahar Ortancası", icon: "🌸" },
          sunflower: { id: "sunflower", name: "Altın Günebakan", icon: "🌻" },
          lavender: { id: "lavender", name: "Yıldızlı Lavanta", icon: "🪻" },
          tulip: { id: "tulip", name: "Peri Lalesi", icon: "🌷" }
        };
 
        const boughtItem = flowerDetails[cartFlower] || { id: cartFlower, name: "Harika Çiçek", icon: "🌸" };
        
        inv.push(boughtItem);
        this.registry.set("inventory", inv);
 
        // Display speech bubble above player character
        this.player.displaySpeechBubble(`💰 Ödeme yapıldı! ${boughtItem.name} envantere eklendi! 🎒`);
 
        // AI partner dialog reaction
        if (this.playMode === "ai") {
          this.time.delayedCall(1500, () => {
            this.partner.displaySpeechBubble(`Harika bir seçim sevgilim! Sırt çantandan (🎒) bana hediye etmeni bekliyorum! 🥰`);
          });
        }
 
        // Clear selected cart flower
        delete (window as any).selectedCartFlower;
      } else {
        // Sepette ürün yok
        this.player.displaySpeechBubble("Sepetimde çiçek yok! Önce raflardan bir çiçek incelemeliyim. 🛒");
        
        this.time.delayedCall(1200, () => {
          this.displayNPCSpeech("yüsra", "Sepetiniz boş görünüyor! Çiçek raflarına gidip inceleyebilirsiniz! 🌹");
        });
      }
    }
  }
 
  private displayNPCSpeech(npcKey: string, message: string) {
    // Generate a temporary speech bubble above Berra NPC head
    const shopX = this.shopX;
    const shopY = this.shopY;
    const deskX = shopX + 410;
    const deskY = shopY + 160;
    const npcX = deskX + 50;
    const npcY = deskY - 35;
 
    const speechBubble = this.add.container(npcX, npcY - 60);
    speechBubble.setDepth(200);
 
    const textWidth = Math.min(220, message.length * 6.5 + 24);
    const textHeight = message.length > 30 ? 44 : 26;
 
    const bg = this.add.graphics();
    bg.fillStyle(0x1a0e0a, 0.95); // deep wood
    bg.lineStyle(2, 0xd97706, 1.0); // gold rim
    bg.fillRoundedRect(-textWidth / 2, -textHeight / 2, textWidth, textHeight, 8);
    bg.strokeRoundedRect(-textWidth / 2, -textHeight / 2, textWidth, textHeight, 8);
 
    bg.beginPath();
    bg.moveTo(-6, textHeight / 2);
    bg.lineTo(0, textHeight / 2 + 6);
    bg.lineTo(6, textHeight / 2);
    bg.closePath();
    bg.fill();
    bg.stroke();
 
    speechBubble.add(bg);
 
    const txt = this.add.text(0, 0, message, {
      font: "bold 10px Inter, Arial",
      color: "#fef08a", // gold text
      align: "center",
      wordWrap: { width: textWidth - 16 }
    }).setOrigin(0.5);
 
    speechBubble.add(txt);
 
    speechBubble.setScale(0);
    this.tweens.add({
      targets: speechBubble,
      scaleX: 1,
      scaleY: 1,
      duration: 350,
      ease: "Back.easeOut"
    });
 
    this.time.delayedCall(4500, () => {
      this.tweens.add({
        targets: speechBubble,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 300,
        onComplete: () => {
          speechBubble.destroy();
        }
      });
    });
  }
}
