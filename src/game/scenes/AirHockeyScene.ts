import Phaser from "phaser";
import { cozyAudio } from "@/utils/audio";
import confetti from "canvas-confetti";

export default class AirHockeyScene extends Phaser.Scene {
  private networkSystem: any = null;
  private isAI = false;

  // Visual Objects
  private tableBg!: Phaser.GameObjects.Graphics;
  private puck!: Phaser.Physics.Arcade.Image;
  private playerMallet!: Phaser.Physics.Arcade.Image;
  private partnerMallet!: Phaser.Physics.Arcade.Image;
  private puckTrail!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Score HUD
  private playerScore = 0;
  private partnerScore = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  // Limits
  private tableMinX = 50;
  private tableMaxX = 550;
  private tableMinY = 100;
  private tableMaxY = 700;
  private centerY = 400;

  // Input LERP targets
  private pointerX = 300;
  private pointerY = 550;

  // Real-time swing speed calculation variables
  private playerMalletSpeedX = 0;
  private playerMalletSpeedY = 0;

  constructor() {
    super("AirHockeyScene");
  }

  init(data: { isAI: boolean; networkSystem: any }) {
    this.isAI = data.isAI;
    this.networkSystem = data.networkSystem;
    this.playerScore = 0;
    this.partnerScore = 0;
    this.pointerX = 300;
    this.pointerY = 550;
    this.playerMalletSpeedX = 0;
    this.playerMalletSpeedY = 0;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Draw Table Background with Neon grid lines
    this.tableBg = this.add.graphics();
    this.tableBg.fillStyle(0x0a0915, 0.95);
    this.tableBg.fillRoundedRect(50, 100, 500, 600, 24);

    // Electric Violet Border outline
    this.tableBg.lineStyle(4, 0x8b5cf6, 0.8);
    this.tableBg.strokeRoundedRect(50, 100, 500, 600, 24);

    // Widescreen Goal Slots
    this.tableBg.fillStyle(0x020617, 1.0);
    this.tableBg.fillRect(200, 90, 200, 10); // top goal slot
    this.tableBg.fillRect(200, 700, 200, 10); // bottom goal slot
    
    // Draw neon pink divider
    this.tableBg.lineStyle(3, 0xec4899, 0.5); 
    this.tableBg.moveTo(50, 400);
    this.tableBg.lineTo(550, 400);
    this.tableBg.stroke();
    
    // Draw divider neon circle
    this.tableBg.beginPath();
    this.tableBg.arc(300, 400, 65, 0, Math.PI * 2);
    this.tableBg.stroke();

    // 2. Create physics elements
    // Puck
    this.puck = this.physics.add.image(300, 400, "hockey_puck");
    this.puck.setCollideWorldBounds(true);
    this.puck.setBounce(1.0);
    this.puck.setDamping(true);
    this.puck.setDrag(0.005); // Low drag for high friction-free gliding!
    this.puck.setTint(0x22d3ee); // Cyan neon glow puck

    const puckBody = this.puck.body as Phaser.Physics.Arcade.Body;
    puckBody.setCircle(11);
    puckBody.setMaxVelocity(750); // High limit for hyper slams
    puckBody.onWorldBounds = true;

    // Player Mallet (bottom half)
    this.playerMallet = this.physics.add.image(300, 550, "hockey_mallet");
    this.playerMallet.setTint(0xf472b6); // Neon pink player
    this.playerMallet.setCollideWorldBounds(true);
    const pmBody = this.playerMallet.body as Phaser.Physics.Arcade.Body;
    pmBody.setCircle(15);
    pmBody.setImmovable(true);

    // Partner Mallet (top half)
    this.partnerMallet = this.physics.add.image(300, 250, "hockey_mallet");
    this.partnerMallet.setTint(0xa78bfa); // Neon lavender partner
    this.partnerMallet.setCollideWorldBounds(true);
    const parBody = this.partnerMallet.body as Phaser.Physics.Arcade.Body;
    parBody.setCircle(15);
    parBody.setImmovable(true);

    this.physics.world.setBounds(50, 100, 500, 600);

    // 3. Puck Neon Trail Emitter (Cyan stream)
    this.puckTrail = this.add.particles(0, 0, "part_firefly", {
      speed: 0,
      scale: { start: 0.7, end: 0.1 },
      alpha: { start: 0.5, end: 0 },
      tint: 0x06b6d4, // Cyan trail
      lifespan: 250,
      follow: this.puck
    });
    this.puckTrail.setDepth(this.puck.depth - 1);

    // 4. Bind collisions
    this.physics.add.collider(this.puck, this.playerMallet, this.handlePuckCollision, undefined, this);
    this.physics.add.collider(this.puck, this.partnerMallet, this.handlePuckCollision, undefined, this);

    // 5. Score HUD
    this.scoreText = this.add.text(width / 2, 40, "Ben  0 - 0  Partner", {
      font: "bold 22px Outfit, Inter, Arial",
      color: "#fae8ff",
      stroke: "#8b5cf6",
      strokeThickness: 2
    });
    this.scoreText.setOrigin(0.5);

    this.promptText = this.add.text(width / 2, 735, "Tokmağı sürükleyerek diske vur! 3 olan kazanır.", {
      font: "bold 13px Inter, Arial",
      color: "#c084fc",
    });
    this.promptText.setOrigin(0.5);

    // 6. Interactive Mallet Control (Touch & Drag coordinates - Camera Scaled)
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown || this.input.activePointer.isDown) {
        this.pointerX = pointer.worldX;
        this.pointerY = pointer.worldY;
      }
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.pointerX = pointer.worldX;
      this.pointerY = pointer.worldY;
    });

    // 7. Network listener hooks
    if (this.networkSystem) {
      this.networkSystem.start();
      const originalCallback = this.networkSystem.onMessageCallback;
      this.networkSystem.onMessageCallback = (msg: any) => {
        if (msg.type === "hockey") {
          const { action, x, y, vx, vy, scoreP, scoreA } = msg.payload;
          if (action === "mallet_move") {
            const mirroredX = 600 - x;
            const mirroredY = 800 - y;
            this.partnerMallet.setPosition(mirroredX, mirroredY);
          } else if (action === "puck_sync") {
            this.puck.setPosition(600 - x, 800 - y);
            const body = this.puck.body as Phaser.Physics.Arcade.Body;
            body.setVelocity(-vx, -vy);
          } else if (action === "score_sync") {
            this.playerScore = scoreA;
            this.partnerScore = scoreP;
            this.updateScoreDisplay();
          }
        } else {
          originalCallback(msg);
        }
      };
    }

    // 8. Return/Exit Button overlay
    const exitBtn = this.add.text(50, 40, "← Masadan Ayrıl", {
      font: "bold 14px Outfit, Inter, Arial",
      color: "#f87171",
      backgroundColor: "rgba(220, 38, 38, 0.2)",
      padding: { x: 12, y: 6 }
    });
    exitBtn.setInteractive({ useHandCursor: true });
    exitBtn.on("pointerdown", () => {
      cozyAudio.playClick();
      this.scene.stop("AirHockeyScene");
      this.scene.resume("MainScene");
    });
  }

  update(time: number, delta: number) {
    // 1. Goal Detection
    this.checkGoals();

    // 2. AI Companion Control Logic
    if (this.isAI) {
      this.handleAIMallet(delta);
    }

    // 3. Smooth Linear Interpolation (LERP) for Mallet tactile feel
    const targetX = Phaser.Math.Clamp(this.pointerX, this.tableMinX + 18, this.tableMaxX - 18);
    const targetY = Phaser.Math.Clamp(this.pointerY, this.centerY + 18, this.tableMaxY - 18);

    // Track old position to calculate velocity
    const oldX = this.playerMallet.x;
    const oldY = this.playerMallet.y;

    const lerpedX = Phaser.Math.Linear(this.playerMallet.x, targetX, 0.35);
    const lerpedY = Phaser.Math.Linear(this.playerMallet.y, targetY, 0.35);
    this.playerMallet.setPosition(lerpedX, lerpedY);

    // Calculate dynamic swing velocity of mallet (dx/dt)
    const dtSeconds = delta / 1000;
    this.playerMalletSpeedX = dtSeconds > 0 ? (lerpedX - oldX) / dtSeconds : 0;
    this.playerMalletSpeedY = dtSeconds > 0 ? (lerpedY - oldY) / dtSeconds : 0;

    // Sync mallet over network
    if (this.networkSystem) {
      this.networkSystem.send("hockey", {
        action: "mallet_move",
        x: lerpedX,
        y: lerpedY
      });
    }

    // 4. Boundary Spark Particle Trigger
    const pBody = this.puck.body as Phaser.Physics.Arcade.Body;
    if (pBody.blocked.left || pBody.blocked.right || pBody.blocked.up || pBody.blocked.down) {
      cozyAudio.playCuteBubble();
      this.triggerCollisionSparks(this.puck.x, this.puck.y, 0xec4899); // Boundary sparks
    }

    // 5. Puck Synchronization
    if (this.networkSystem && this.puck.y > this.centerY) {
      this.networkSystem.send("hockey", {
        action: "puck_sync",
        x: this.puck.x,
        y: this.puck.y,
        vx: pBody.velocity.x,
        vy: pBody.velocity.y,
      });
    }
  }

  private handlePuckCollision(p: any, m: any) {
    cozyAudio.playCuteBubble();
    this.triggerCollisionSparks(p.x, p.y, 0x22d3ee); // Collision sparks

    // Calculate exact swing momentum
    let swingSpeed = 0;
    if (m === this.playerMallet) {
      const ms = Math.sqrt(this.playerMalletSpeedX * this.playerMalletSpeedX + this.playerMalletSpeedY * this.playerMalletSpeedY);
      swingSpeed = ms;
    } else {
      swingSpeed = 380; // Solid AI swing speed
    }

    // Transfer mallet swing speed directly into the puck!
    const pBody = this.puck.body as Phaser.Physics.Arcade.Body;
    const angle = Phaser.Math.Angle.Between(m.x, m.y, p.x, p.y);

    // Highly boosted physics force multiplier (base speed + 85% of swing velocity!)
    const speed = Phaser.Math.Clamp(360 + swingSpeed * 0.85, 360, 750);
    pBody.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  private triggerCollisionSparks(x: number, y: number, color: number) {
    const sparks = this.add.particles(x, y, "part_firefly", {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 1, end: 0 },
      tint: color,
      lifespan: 350,
      maxParticles: 12
    });
    this.time.delayedCall(400, () => sparks.destroy());
  }

  private handleAIMallet(delta: number) {
    const reactionSpeed = 0.095; // Fast AI
    
    let targetX = this.puck.x;
    let targetY = 220;

    if (this.puck.y < this.centerY) {
      targetY = this.puck.y - 15;
      if (targetY < this.tableMinY + 18) targetY = this.tableMinY + 18;
    }

    const nextX = Phaser.Math.Linear(this.partnerMallet.x, targetX, reactionSpeed);
    const nextY = Phaser.Math.Linear(this.partnerMallet.y, targetY, reactionSpeed);
    
    this.partnerMallet.setPosition(
      Phaser.Math.Clamp(nextX, this.tableMinX + 18, this.tableMaxX - 18),
      Phaser.Math.Clamp(nextY, this.tableMinY + 18, this.centerY - 18)
    );
  }

  private checkGoals() {
    if (this.puck.x > 200 && this.puck.x < 400) {
      if (this.puck.y < this.tableMinY + 10) {
        this.triggerGoalCelebration(true);
      } else if (this.puck.y > this.tableMaxY - 10) {
        this.triggerGoalCelebration(false);
      }
    }
  }

  private triggerGoalCelebration(playerScored: boolean) {
    cozyAudio.playGiftBell();

    // Screen Shake effect
    this.cameras.main.shake(250, 0.015);

    if (playerScored) {
      this.playerScore++;
    } else {
      this.partnerScore++;
    }

    this.updateScoreDisplay();

    if (this.networkSystem) {
      this.networkSystem.send("hockey", {
        action: "score_sync",
        scoreP: this.playerScore,
        scoreA: this.partnerScore,
      });
    }

    // Heart explosion
    const gy = playerScored ? this.tableMinY + 15 : this.tableMaxY - 15;
    const heartEmitter = this.add.particles(300, gy, "part_heart", {
      speed: { min: 90, max: 200 },
      angle: playerScored ? { min: 45, max: 135 } : { min: 225, max: 315 },
      scale: { start: 0.6, end: 1.3 },
      alpha: { start: 1, end: 0 },
      lifespan: 1200,
      frequency: 45,
      maxParticles: 15,
    });

    this.puck.setPosition(300, 400);
    const pBody = this.puck.body as Phaser.Physics.Arcade.Body;
    pBody.setVelocity(0, 0);

    this.time.delayedCall(1300, () => {
      heartEmitter.destroy();
      
      if (this.playerScore >= 3 || this.partnerScore >= 3) {
        this.handleGameEnd();
      } else {
        pBody.setVelocity(Phaser.Math.Between(-150, 150), playerScored ? -220 : 220);
      }
    });
  }

  private updateScoreDisplay() {
    this.scoreText.setText(`Ben  ${this.playerScore} - ${this.partnerScore}  Partner`);
  }

  private handleGameEnd() {
    const isPlayerWin = this.playerScore >= 3;
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    const overlay = this.add.graphics();
    overlay.fillStyle(0x0b0e17, 0.85);
    overlay.fillRect(0, 0, 3000, 3000);
    overlay.setDepth(9998);

    const winText = this.add.text(300, 350, isPlayerWin ? "💖 Tebrikler! Sen Kazandın! 💖" : "✨ Tatlı Maç Tamamlandı! ✨", {
      font: "bold 24px Outfit, Inter, Arial",
      color: "#fae8ff",
      align: "center"
    });
    winText.setOrigin(0.5);
    winText.setDepth(9999);

    this.time.delayedCall(3000, () => {
      overlay.destroy();
      winText.destroy();
      this.scene.stop("AirHockeyScene");
      this.scene.resume("MainScene");
    });
  }
}
