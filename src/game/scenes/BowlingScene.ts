import Phaser from "phaser";
import { cozyAudio } from "@/utils/audio";
import confetti from "canvas-confetti";

export default class BowlingScene extends Phaser.Scene {
  private isAI = false;
  private networkSystem: any = null;

  // Physics elements
  private laneBg!: Phaser.GameObjects.Graphics;
  private pins!: Phaser.Physics.Arcade.Group;
  private ball!: Phaser.Physics.Arcade.Image;
  private ballTrail!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Swipe / Launch coordinates
  private dragStartX = 0;
  private dragStartY = 0;
  private isAiming = false;

  // Game Stats
  private currentFrame = 1;
  private rollCount = 0;
  private totalScore = 0;
  private pinsKnockedThisFrame = 0;

  // HUD Text overlays
  private scoreboardText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  // Pin standard coordinates (Triangular formation)
  private pinCoordinates = [
    { x: 300, y: 180 }, // Head pin 1
    
    { x: 280, y: 155 }, { x: 320, y: 155 }, // Row 2
    
    { x: 260, y: 130 }, { x: 300, y: 130 }, { x: 340, y: 130 }, // Row 3
    
    { x: 240, y: 105 }, { x: 280, y: 105 }, { x: 320, y: 105 }, { x: 360, y: 105 } // Row 4
  ];

  constructor() {
    super("BowlingScene");
  }

  init(data: { isAI: boolean; networkSystem: any }) {
    this.isAI = data.isAI;
    this.networkSystem = data.networkSystem;
    this.currentFrame = 1;
    this.rollCount = 0;
    this.totalScore = 0;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Draw Wooden Lane Background with Neon gutters
    this.laneBg = this.add.graphics();
    this.laneBg.fillStyle(0x0a0915, 0.95);
    this.laneBg.fillRect(50, 80, 500, 640);

    // Warm Maple Wood Lane center
    this.laneBg.fillStyle(0x311b92, 0.35); // neon purple glowing floor feeling
    this.laneBg.fillRect(150, 80, 300, 640);
    
    // Glowing neon hot pink gutter board boundaries
    this.laneBg.lineStyle(3, 0xec4899, 0.85); // hot pink neon
    this.laneBg.strokeRect(150, 80, 300, 640);

    // Arrows indicators on lane floor (neon blue arrows)
    this.laneBg.fillStyle(0x06b6d4, 0.45);
    for (let i = 0; i < 3; i++) {
      const ax = 200 + i * 50;
      this.laneBg.beginPath();
      this.laneBg.moveTo(ax, 520);
      this.laneBg.lineTo(ax + 8, 500);
      this.laneBg.lineTo(ax + 16, 520);
      this.laneBg.closePath();
      this.laneBg.fill();
    }

    // 2. Initialize Physics Groups
    this.pins = this.physics.add.group();
    this.resetPins();

    // 3. Create Bowling Ball (neon cyan)
    this.ball = this.physics.add.image(300, 620, "bowling_ball");
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(0.3);
    this.ball.setTint(0x22d3ee); // Neon Cyan ball

    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    ballBody.setCircle(14);
    ballBody.setDamping(false); // Disable speed decay damping on polished lane
    ballBody.setDrag(0); // Frictionless polished wooden lane
    ballBody.setMass(16.0); // Heavy 16-pound bowling ball!

    // 4. Cyan Ball Trail Emitter
    this.ballTrail = this.add.particles(0, 0, "part_firefly", {
      speed: 0,
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 0.5, end: 0 },
      tint: 0x06b6d4, // Cyan trail
      lifespan: 250,
      follow: this.ball
    });
    this.ballTrail.setDepth(this.ball.depth - 1);
    this.ballTrail.stop();

    this.physics.add.collider(this.ball, this.pins, this.handleBallPinCollision, undefined, this);
    this.physics.add.collider(this.pins, this.pins, this.handlePinPinCollision, undefined, this);

    // 5. Scoreboard HUD
    this.scoreboardText = this.add.text(width / 2, 45, "Skor: 0 | El: 1/5 | Atış: 1", {
      font: "bold 22px Outfit, Inter, Arial",
      color: "#fae8ff",
      stroke: "#ec4899",
      strokeThickness: 2
    });
    this.scoreboardText.setOrigin(0.5);

    this.statusText = this.add.text(width / 2, 735, "Topu konumlandırmak için sürükle, fırlatmak için YUKARI kaydır! 🎳", {
      font: "bold 13px Inter, Arial",
      color: "#c084fc",
      align: "center"
    });
    this.statusText.setOrigin(0.5);

    // 6. Input Controls: Launch Ball via mouse/touch swipe speed (Optimized for Mobile)
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const bBody = this.ball.body as Phaser.Physics.Arcade.Body;
      if (bBody.speed > 5) return;

      this.dragStartX = pointer.worldX;
      this.dragStartY = pointer.worldY;
      this.isAiming = true;

      // Allow dragging bottom area to slide ball horizontally
      if (pointer.worldY > 560) {
        this.ball.x = Phaser.Math.Clamp(pointer.worldX, 170, 430);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const bBody = this.ball.body as Phaser.Physics.Arcade.Body;
      if (bBody.speed > 5) return;

      if (this.isAiming && pointer.isDown && pointer.worldY > 550) {
        this.ball.x = Phaser.Math.Clamp(pointer.worldX, 170, 430);
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!this.isAiming) return;
      this.isAiming = false;

      const dy = pointer.worldY - this.dragStartY;
      const dx = pointer.worldX - this.dragStartX;

      // Highly sensitive flick trigger (15px upwards is enough)
      if (dy < -15) {
        // Boosted kinetic launch speeds for mobile screen ratios (9.5x instead of 5.8x!)
        const swipeSpeedY = Phaser.Math.Clamp(-dy * 9.5, 450, 1100);
        const swipeSpeedX = dx * 4.2; 

        const bBody = this.ball.body as Phaser.Physics.Arcade.Body;
        bBody.setVelocity(swipeSpeedX, -swipeSpeedY);
        
        cozyAudio.playCuteBubble();
        this.rollCount++;
        this.updateHUD();

        // Activate dynamic trail on launch
        if (this.ballTrail) {
          this.ballTrail.start();
        }
      }
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
      this.scene.stop("BowlingScene");
      this.scene.resume("MainScene");
    });
  }

  update() {
    const bBody = this.ball.body as Phaser.Physics.Arcade.Body;

    if (bBody.speed > 0 && bBody.speed < 8 && this.ball.y < 350) {
      this.settlePinsAndCalculateScore();
    } else if (this.ball.y < 95) {
      this.settlePinsAndCalculateScore();
    }
  }

  private resetPins() {
    this.pins.clear(true, true);

    this.pinCoordinates.forEach((coord) => {
      const pin = this.physics.add.image(coord.x, coord.y, "bowling_pin");
      pin.setCollideWorldBounds(true);
      pin.setBounce(0.6);
      pin.setAlpha(1.0);
      pin.setTint(0xa78bfa); // Pastel neon lavender pins
      
      const pBody = pin.body as Phaser.Physics.Arcade.Body;
      pBody.setCircle(7);
      pBody.setDamping(true);
      pBody.setDrag(0.35); // Gently damp sliding pins
      pBody.setMass(0.4); // Lightweight wooden pins to be knocked away easily by a 16lb ball!

      this.pins.add(pin);
    });
  }

  private handleBallPinCollision() {
    cozyAudio.playClick();
  }

  private handlePinPinCollision() {
    if (Math.random() < 0.15) {
      cozyAudio.playClick();
    }
  }

  private settlePinsAndCalculateScore() {
    const bBody = this.ball.body as Phaser.Physics.Arcade.Body;
    bBody.setVelocity(0, 0);
    this.ball.setPosition(300, 620);

    // Stop ball trail
    if (this.ballTrail) {
      this.ballTrail.stop();
    }

    this.time.delayedCall(1200, () => {
      let knocked = 0;
      
      this.pins.getChildren().forEach((p: any, idx: number) => {
        const origin = this.pinCoordinates[idx];
        const distance = Phaser.Math.Distance.Between(p.x, p.y, origin.x, origin.y);
        
        if (distance > 16 && p.alpha > 0.5) {
          knocked++;
          p.setAlpha(0.25);
          
          const pBody = p.body as Phaser.Physics.Arcade.Body;
          pBody.setEnable(false);
        }
      });

      const newlyKnocked = knocked - this.pinsKnockedThisFrame;
      this.pinsKnockedThisFrame = knocked;
      this.totalScore += newlyKnocked;

      if (this.pinsKnockedThisFrame === 10) {
        if (this.rollCount === 1) {
          this.triggerCelebration("🌟 STRIKE! Harikasın! 🌟");
          this.totalScore += 5; 
          this.nextFrame();
        } else {
          this.triggerCelebration("✨ SPARE! Çok tatlı! ✨");
          this.totalScore += 2; 
          this.nextFrame();
        }
      } else if (this.rollCount >= 2) {
        this.statusText.setText(`El Tamamlandı! ${this.pinsKnockedThisFrame} lobut devirdin.`);
        this.time.delayedCall(1600, () => {
          this.nextFrame();
        });
      } else {
        this.statusText.setText(`Güzel! ${this.pinsKnockedThisFrame} lobut devirdin. Kalanlar için tekrar at!`);
      }

      this.updateHUD();
    });
  }

  private triggerCelebration(msg: string) {
    cozyAudio.playGiftBell();
    
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    this.statusText.setText(msg);

    const emitter = this.add.particles(300, 160, "part_heart", {
      speed: { min: -50, max: 50 },
      scale: { start: 0.4, end: 1.0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1500,
      frequency: 60,
      maxParticles: 15,
    });

    this.time.delayedCall(1500, () => {
      emitter.destroy();
    });
  }

  private nextFrame() {
    this.currentFrame++;
    this.rollCount = 0;
    this.pinsKnockedThisFrame = 0;

    if (this.currentFrame > 5) {
      this.handleGameEnd();
    } else {
      this.resetPins();
      this.updateHUD();
      this.statusText.setText("Lobutlar yenilendi! Fırlat ve devir.");
    }
  }

  private updateHUD() {
    this.scoreboardText.setText(`Skor: ${this.totalScore} | El: ${Math.min(this.currentFrame, 5)}/5 | Atış: ${this.rollCount + 1}`);
  }

  private handleGameEnd() {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 }
    });

    const overlay = this.add.graphics();
    overlay.fillStyle(0x0b0e17, 0.85);
    overlay.fillRect(0, 0, 3000, 3000);
    overlay.setDepth(9998);

    const winText = this.add.text(300, 350, `🎳 Bowling Tamamlandı! 🎳\n\nToplam Skor: ${this.totalScore} puan!`, {
      font: "bold 22px Outfit, Inter, Arial",
      color: "#fef08a",
      align: "center"
    });
    winText.setOrigin(0.5);
    winText.setDepth(9999);

    this.time.delayedCall(3500, () => {
      overlay.destroy();
      winText.destroy();
      this.scene.stop("BowlingScene");
      this.scene.resume("MainScene");
    });
  }
}
