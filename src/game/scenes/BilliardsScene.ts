import Phaser from "phaser";
import { cozyAudio } from "@/utils/audio";
import confetti from "canvas-confetti";

export default class BilliardsScene extends Phaser.Scene {
  private isAI = true;
  private networkSystem: any = null;

  // Visuals & Physics Groups
  private tableBg!: Phaser.GameObjects.Graphics;
  private cueBall!: Phaser.Physics.Arcade.Image;
  private targetBalls!: Phaser.Physics.Arcade.Group;
  private lineGfx!: Phaser.GameObjects.Graphics;

  // Aiming variables
  private isAiming = false;
  private aimStartX = 0;
  private aimStartY = 0;
  private aimPowerX = 0;
  private aimPowerY = 0;

  // Turn management
  private activeTurn: "player" | "partner" = "player";
  private score = 0;
  private partnerScore = 0;

  // HUD text
  private scoreHUDText!: Phaser.GameObjects.Text;
  private turnHUDText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  // Pocket coordinates (radial centers)
  private pockets = [
    { x: 115, y: 195 }, // Top-Left
    { x: 485, y: 195 }, // Top-Right
    { x: 110, y: 400 }, // Middle-Left
    { x: 490, y: 400 }, // Middle-Right
    { x: 115, y: 605 }, // Bottom-Left
    { x: 485, y: 605 }  // Bottom-Right
  ];

  constructor() {
    super("BilliardsScene");
  }

  init(data: { isAI: boolean; networkSystem: any }) {
    this.isAI = data.isAI !== undefined ? data.isAI : true;
    this.networkSystem = data.networkSystem;
    this.score = 0;
    this.partnerScore = 0;
    this.activeTurn = "player";
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Draw elegant Luxury Green Felt Billiards Table
    this.tableBg = this.add.graphics();
    
    // Rich wooden bumper frame
    this.tableBg.fillStyle(0x451b03, 1.0); // deep mahogany wood
    this.tableBg.fillRoundedRect(95, 175, 410, 450, 16);
    this.tableBg.lineStyle(4, 0xd4af37, 0.95); // Gold gold rim line
    this.tableBg.strokeRoundedRect(95, 175, 410, 450, 16);

    // Velvet green felt inner table
    this.tableBg.fillStyle(0x065f46, 1.0); // luxurious emerald green
    this.tableBg.fillRect(115, 195, 370, 410);

    // Draw pocket holes
    this.tableBg.fillStyle(0x0f172a, 1.0); // dark pocket voids
    this.pockets.forEach(pocket => {
      this.tableBg.fillCircle(pocket.x, pocket.y, 16);
      this.tableBg.lineStyle(2, 0x94a3b8, 0.4);
      this.tableBg.strokeCircle(pocket.x, pocket.y, 16);
    });

    // 2. Aiming Cue Graphics line
    this.lineGfx = this.add.graphics();
    this.lineGfx.setDepth(900);

    // 3. Create Cue Ball (White)
    this.cueBall = this.physics.add.image(300, 500, "hockey_puck");
    this.cueBall.setTint(0xf8fafc); // Cue ball white texture
    this.cueBall.setCollideWorldBounds(true);
    this.cueBall.setBounce(0.92);
    this.cueBall.setDamping(true);
    this.cueBall.setDrag(0.015);

    const cbBody = this.cueBall.body as Phaser.Physics.Arcade.Body;
    cbBody.setCircle(11);
    cbBody.setMass(1.0);
    cbBody.setMaxVelocity(680); // Safety speed cap to prevent clipping

    // 4. Create Rack of target balls
    this.targetBalls = this.physics.add.group({
      bounceX: 0.92,
      bounceY: 0.92,
      dragX: 0.015,
      dragY: 0.015,
      useDamping: true
    });

    const ballColors = [
      0xef4444, // Red 1
      0x3b82f6, // Blue 2
      0xf59e0b, // Yellow 3
      0xec4899, // Pink 4
      0x10b981, // Green 5
      0x8b5cf6, // Violet 6
      0x0f172a  // Black 8
    ];

    // Pyramid Rack formation coordinates
    const rackCoords = [
      { x: 300, y: 280 }, // Row 1
      { x: 284, y: 254 }, { x: 316, y: 254 }, // Row 2
      { x: 268, y: 228 }, { x: 300, y: 228 }, { x: 332, y: 228 } // Row 3
    ];

    rackCoords.forEach((coord, index) => {
      const ball = this.physics.add.image(coord.x, coord.y, "hockey_puck");
      ball.setCollideWorldBounds(true);
      ball.setTint(ballColors[index % ballColors.length]);
      
      const bBody = ball.body as Phaser.Physics.Arcade.Body;
      bBody.setCircle(11);
      bBody.setMass(1.0);
      bBody.setMaxVelocity(680); // Safety speed cap to prevent clipping

      this.targetBalls.add(ball);
    });

    // Set world physics bounds inside the bumpers
    this.physics.world.setBounds(115, 195, 370, 410);

    // Colliders
    this.physics.add.collider(this.cueBall, this.targetBalls, this.handleBallCollision, undefined, this);
    this.physics.add.collider(this.targetBalls, this.targetBalls, this.handleBallCollision, undefined, this);

    // 5. Scoreboard & HUD Setup
    this.scoreHUDText = this.add.text(width / 2, 45, "Ben: 0 - Luna: 0", {
      font: "bold 22px Outfit, Inter, Arial",
      color: "#fae8ff",
      stroke: "#d4af37",
      strokeThickness: 2
    });
    this.scoreHUDText.setOrigin(0.5);

    this.turnHUDText = this.add.text(width / 2, 140, "Sıra Sende 💫", {
      font: "bold 13px Inter, Arial",
      color: "#fcd34d",
      backgroundColor: "rgba(15,23,42,0.6)",
      padding: { x: 12, y: 4 }
    });
    this.turnHUDText.setOrigin(0.5);

    this.statusText = this.add.text(width / 2, 735, "Topu vurmak için basılı tutup arkaya doğru çek! 🎱", {
      font: "bold 13px Inter, Arial",
      color: "#cbd5e1",
      align: "center"
    });
    this.statusText.setOrigin(0.5);

    // 6. Aiming Input Gestures
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.activeTurn !== "player") return;

      // Only allow aiming if balls are completely still
      if (!this.areBallsStill()) return;

      // Start aiming from any finger touch coordinate anywhere on screen
      this.isAiming = true;
      this.aimStartX = pointer.worldX;
      this.aimStartY = pointer.worldY;
      this.aimPowerX = 0;
      this.aimPowerY = 0;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isAiming) return;

      // Pull back vector (drag offset relative to start point)
      const dx = pointer.worldX - this.aimStartX;
      const dy = pointer.worldY - this.aimStartY;

      // Clamp max pull power
      const maxPower = 180;
      const powerLen = Math.min(Math.sqrt(dx * dx + dy * dy), maxPower);
      const angle = Math.atan2(dy, dx);

      this.aimPowerX = Math.cos(angle) * powerLen;
      this.aimPowerY = Math.sin(angle) * powerLen;

      // Draw Pool Cue Guideline (draw opposing direction pointer lines)
      this.lineGfx.clear();
      this.lineGfx.lineStyle(3, 0xfcd34d, 0.85); // Thicker pool cue line for mobile viewability
      // Cue stick pulling back representation
      this.lineGfx.lineBetween(this.cueBall.x, this.cueBall.y, this.cueBall.x + this.aimPowerX, this.cueBall.y + this.aimPowerY);
      // Projective target dash line pointing forward
      this.lineGfx.lineStyle(2, 0xf8fafc, 0.6);
      this.lineGfx.lineBetween(this.cueBall.x, this.cueBall.y, this.cueBall.x - this.aimPowerX * 3.5, this.cueBall.y - this.aimPowerY * 3.5);
    });

    this.input.on("pointerup", () => {
      if (!this.isAiming) return;
      this.isAiming = false;
      this.lineGfx.clear();

      // Launch cue ball in opposite direction of pull with boosted dynamic power (7.5x instead of 3.5x!)
      const cbBody = this.cueBall.body as Phaser.Physics.Arcade.Body;
      cbBody.setVelocity(-this.aimPowerX * 7.5, -this.aimPowerY * 7.5);
      
      cozyAudio.playCuteBubble();
      this.statusText.setText("Atış yapıldı! Topların durmasını bekle...");
      
      // Auto-toggle turns after shooting settles
      this.time.delayedCall(4000, () => {
        this.checkTurnTransition();
      });
    });

    // 7. Return exit button
    const exitBtn = this.add.text(50, 40, "← Masadan Ayrıl", {
      font: "bold 14px Outfit, Inter, Arial",
      color: "#f87171",
      backgroundColor: "rgba(220, 38, 38, 0.2)",
      padding: { x: 12, y: 6 }
    });
    exitBtn.setInteractive({ useHandCursor: true });
    exitBtn.on("pointerdown", () => {
      cozyAudio.playClick();
      this.scene.stop("BilliardsScene");
      this.scene.resume("MainScene");
    });
  }

  update() {
    // Detect pockets overlap
    this.checkPockets();

    // Solid cushion boundaries to guarantee balls can never clip/tunnel outside the bumpers
    const minX = 115 + 11;
    const maxX = 115 + 370 - 11;
    const minY = 195 + 11;
    const maxY = 195 + 410 - 11;

    this.targetBalls.getChildren().forEach((b: any) => {
      if (b.alpha < 0.1) return;
      const bBody = b.body as Phaser.Physics.Arcade.Body;
      if (b.x < minX) {
        b.x = minX;
        bBody.velocity.x = Math.abs(bBody.velocity.x) * 0.92;
      }
      if (b.x > maxX) {
        b.x = maxX;
        bBody.velocity.x = -Math.abs(bBody.velocity.x) * 0.92;
      }
      if (b.y < minY) {
        b.y = minY;
        bBody.velocity.y = Math.abs(bBody.velocity.y) * 0.92;
      }
      if (b.y > maxY) {
        b.y = maxY;
        bBody.velocity.y = -Math.abs(bBody.velocity.y) * 0.92;
      }
    });

    const cbBody = this.cueBall.body as Phaser.Physics.Arcade.Body;
    if (this.cueBall.x < minX) {
      this.cueBall.x = minX;
      cbBody.velocity.x = Math.abs(cbBody.velocity.x) * 0.92;
    }
    if (this.cueBall.x > maxX) {
      this.cueBall.x = maxX;
      cbBody.velocity.x = -Math.abs(cbBody.velocity.x) * 0.92;
    }
    if (this.cueBall.y < minY) {
      this.cueBall.y = minY;
      cbBody.velocity.y = Math.abs(cbBody.velocity.y) * 0.92;
    }
    if (this.cueBall.y > maxY) {
      this.cueBall.y = maxY;
      cbBody.velocity.y = -Math.abs(cbBody.velocity.y) * 0.92;
    }
  }

  private handleBallCollision() {
    if (Math.random() < 0.3) {
      cozyAudio.playClick();
    }
  }

  private areBallsStill(): boolean {
    const cbBody = this.cueBall.body as Phaser.Physics.Arcade.Body;
    if (cbBody.speed > 8) return false;

    let still = true;
    this.targetBalls.getChildren().forEach((b: any) => {
      const bBody = b.body as Phaser.Physics.Arcade.Body;
      if (bBody.speed > 8) still = false;
    });

    return still;
  }

  private checkPockets() {
    // 1. Check Target Balls
    this.targetBalls.getChildren().forEach((ball: any) => {
      if (ball.alpha < 0.1) return;

      this.pockets.forEach(pocket => {
        const dist = Phaser.Math.Distance.Between(ball.x, ball.y, pocket.x, pocket.y);
        if (dist < 18) {
          // Pocketed!
          cozyAudio.playGiftBell();
          this.triggerSparkExplosion(ball.x, ball.y, ball.tintTopLeft);
          
          ball.setAlpha(0);
          ball.body.setEnable(false);

          if (this.activeTurn === "player") {
            this.score++;
          } else {
            this.partnerScore++;
          }

          this.updateHUD();
          this.checkGameCompletion();
        }
      });
    });

    // 2. Check Cue Ball Scratch
    this.pockets.forEach(pocket => {
      const dist = Phaser.Math.Distance.Between(this.cueBall.x, this.cueBall.y, pocket.x, pocket.y);
      if (dist < 18) {
        cozyAudio.playClick();
        this.cueBall.setPosition(300, 500);
        const cbBody = this.cueBall.body as Phaser.Physics.Arcade.Body;
        cbBody.setVelocity(0, 0);
        this.statusText.setText("Faul! Beyaz top cebe girdi. Tekrar yerleştirildi.");
      }
    });
  }

  private triggerSparkExplosion(x: number, y: number, color: number) {
    const sparks = this.add.particles(x, y, "part_heart", {
      speed: { min: 60, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 1.1 },
      alpha: { start: 1, end: 0 },
      tint: color,
      lifespan: 800,
      maxParticles: 10
    });
    this.time.delayedCall(1000, () => sparks.destroy());
  }

  private checkTurnTransition() {
    if (this.targetBalls.countActive(true) === 0) return; // Game over check handles this

    if (this.activeTurn === "player") {
      this.activeTurn = "partner";
      this.turnHUDText.setText("Luna'nın Sırası 🌸");
      this.turnHUDText.setColor("#f472b6");
      this.statusText.setText("Luna hedef alıyor, atışını izle...");

      // Delay Partner Luna's AI turn simulation
      this.time.delayedCall(2200, () => {
        this.partnerLunaShootAI();
      });
    } else {
      this.activeTurn = "player";
      this.turnHUDText.setText("Sıra Sende 💫");
      this.turnHUDText.setColor("#fcd34d");
      this.statusText.setText("Çek ve bırak! Hedeflerine odaklan.");
    }
  }

  private partnerLunaShootAI() {
    const activeTargets = this.targetBalls.getChildren().filter((b: any) => b.alpha > 0.5);
    if (activeTargets.length === 0) return;

    // Pick a random target ball to aim at
    const targetBall = Phaser.Utils.Array.GetRandom(activeTargets) as Phaser.Physics.Arcade.Image;

    const angle = Phaser.Math.Angle.Between(this.cueBall.x, this.cueBall.y, targetBall.x, targetBall.y);
    const speed = Phaser.Math.Between(350, 600);

    const cbBody = this.cueBall.body as Phaser.Physics.Arcade.Body;
    cbBody.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    cozyAudio.playCuteBubble();
    this.statusText.setText("Luna mükemmel bir atış yaptı! 🎱");

    // Settle turn
    this.time.delayedCall(4000, () => {
      this.checkTurnTransition();
    });
  }

  private updateHUD() {
    this.scoreHUDText.setText(`Ben: ${this.score} - Luna: ${this.partnerScore}`);
  }

  private checkGameCompletion() {
    const activeCount = this.targetBalls.getChildren().filter((b: any) => b.alpha > 0.5).length;
    if (activeCount === 0) {
      // Completed, trigger fireworks
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });

      const overlay = this.add.graphics();
      overlay.fillStyle(0x0b0e17, 0.88);
      overlay.fillRect(0, 0, 3000, 3000);
      overlay.setDepth(9998);

      const isPlayerWinner = this.score >= this.partnerScore;
      const winLabel = this.add.text(300, 350, isPlayerWinner ? "💖 Tebrikler! Bilardo Şampiyonu Sensin! 🏆" : "🥰 Tatlı Bir Maç Oldu! Harikaydın! 🥰", {
        font: "bold 20px Outfit, Inter, Arial",
        color: "#fae8ff",
        align: "center"
      });
      winLabel.setOrigin(0.5);
      winLabel.setDepth(9999);

      this.time.delayedCall(4000, () => {
        overlay.destroy();
        winLabel.destroy();
        this.scene.stop("BilliardsScene");
        this.scene.resume("MainScene");
      });
    }
  }
}
