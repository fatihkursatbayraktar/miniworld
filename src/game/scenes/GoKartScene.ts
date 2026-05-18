import Phaser from "phaser";
import { cozyAudio } from "@/utils/audio";
import confetti from "canvas-confetti";

export default class GoKartScene extends Phaser.Scene {
  private networkSystem: any = null;
  private isAI = true;

  // Visuals & Physics Elements
  private trackBg!: Phaser.GameObjects.Graphics;
  private playerKart!: Phaser.Physics.Arcade.Image;
  private partnerKart!: Phaser.Physics.Arcade.Image;
  
  // Driving parameters
  private playerSpeed = 0;
  private playerMaxSpeed = 245;
  private playerAngle = -Math.PI / 2; // face up
  private steerSpeed = 0.065; // Snappier steering feel for mobile karts
  
  // Luna driving parameters
  private lunaWaypointIndex = 0;
  private lunaSpeed = 170;
  
  // Racetrack Road Waypoints (Oval circuit path around screen)
  private trackWaypoints = [
    { x: 160, y: 560 }, // Start/Finish Line (Bottom-Left)
    { x: 160, y: 280 }, // Straight Left Up
    { x: 200, y: 220 }, // Curved Top-Left Turn
    { x: 400, y: 220 }, // Straight Top Right
    { x: 440, y: 280 }, // Curved Top-Right Turn
    { x: 440, y: 560 }, // Straight Right Down
    { x: 400, y: 620 }, // Curved Bottom-Right Turn
    { x: 200, y: 620 }  // Curved Bottom-Left Turn
  ];

  // Race Mechanics
  private remainingTime = 120; // 2 minutes in seconds!
  private playerLaps = 1;
  private lunaLaps = 1;
  private checkLapsPassed = false;

  // Keyboard controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys: any;

  // Mobile virtual buttons active states
  private mobileSteerLeft = false;
  private mobileSteerRight = false;
  private mobileGas = false;
  private mobileBrake = false;

  // HUD text overlays
  private timerText!: Phaser.GameObjects.Text;
  private hudDashboardText!: Phaser.GameObjects.Text;
  private positionText!: Phaser.GameObjects.Text;

  // Emitters
  private playerExhaust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private partnerExhaust!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("GoKartScene");
  }

  init(data: { isAI: boolean; networkSystem: any }) {
    this.isAI = data.isAI !== undefined ? data.isAI : true;
    this.networkSystem = data.networkSystem;
    this.remainingTime = 120; // 2 minutes countdown
    this.playerLaps = 1;
    this.lunaLaps = 1;
    this.lunaWaypointIndex = 0;
    this.playerSpeed = 0;
    this.playerAngle = -Math.PI / 2;
    
    // Reset mobile active states
    this.mobileSteerLeft = false;
    this.mobileSteerRight = false;
    this.mobileGas = false;
    this.mobileBrake = false;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Render Neon F1 Kart Circuit Loop
    this.trackBg = this.add.graphics();
    
    // Outer grass buffer boundary
    this.trackBg.fillStyle(0x022c22, 1.0); // very dark racing green fields
    this.trackBg.fillRect(50, 150, 500, 540);

    // Inner infield infield void (oval cutout)
    this.trackBg.fillStyle(0x064e3b, 1.0); // lighter field interior
    this.trackBg.fillRoundedRect(220, 270, 160, 290, 36);

    // DRAW ROAD CIRCUIT (Asphalt Gray Oval)
    this.trackBg.lineStyle(68, 0x1e293b, 1.0); // 68px wide dark grey track road
    
    // Draw smooth track path
    this.trackBg.beginPath();
    this.trackBg.moveTo(160, 560);
    this.trackBg.lineTo(160, 280); // Left straight
    this.trackBg.arc(300, 280, 140, Math.PI, Math.PI * 2, false); // Top curve
    this.trackBg.lineTo(440, 560); // Right straight
    this.trackBg.arc(300, 560, 140, 0, Math.PI, false); // Bottom curve
    this.trackBg.closePath();
    this.trackBg.strokePath();

    // Golden curb stripes (glowing chevron lane borders)
    this.trackBg.lineStyle(2.5, 0xd4af37, 0.7); 
    this.trackBg.strokeCircle(300, 280, 174);
    this.trackBg.strokeCircle(300, 280, 106);
    this.trackBg.strokeCircle(300, 560, 174);
    this.trackBg.strokeCircle(300, 560, 106);

    // Glowing finish line (neon checkered grid stripe at x: 130-190, y: 530)
    this.trackBg.fillStyle(0xffffff, 0.95);
    this.trackBg.fillRect(126, 520, 34, 10);
    this.trackBg.fillStyle(0x000000, 0.95);
    this.trackBg.fillRect(126, 530, 34, 10);
    this.trackBg.fillStyle(0xffffff, 0.95);
    this.trackBg.fillRect(126, 540, 34, 10);

    // 2. Create the Go-Karts
    // Player Kart (Neon Red sprite)
    this.playerKart = this.physics.add.image(160, 500, "hockey_puck");
    this.playerKart.setTint(0xef4444); // Red racer
    this.playerKart.setScale(0.85);

    // Partner Luna Kart (Neon Purple sprite)
    this.partnerKart = this.physics.add.image(140, 480, "hockey_puck");
    this.partnerKart.setTint(0xa78bfa); // Lavender racer
    this.partnerKart.setScale(0.85);

    // 3. Exhaust Sparks (drift exhaust visual effects!)
    this.playerExhaust = this.add.particles(0, 0, "part_firefly", {
      speed: { min: 20, max: 70 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0.1 },
      alpha: { start: 0.6, end: 0 },
      tint: 0xef4444, // Red sparks
      lifespan: 300,
      follow: this.playerKart
    });
    this.playerExhaust.stop();

    this.partnerExhaust = this.add.particles(0, 0, "part_firefly", {
      speed: { min: 20, max: 70 },
      scale: { start: 0.5, end: 0.1 },
      alpha: { start: 0.6, end: 0 },
      tint: 0xa78bfa, // Purple sparks
      lifespan: 300,
      follow: this.partnerKart
    });

    // 4. Initialize Keyboard Controls (Arrows & WASD)
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // 5. HUD Dashboard
    this.timerText = this.add.text(width / 2, 45, "Yarış Süresi: 120s ⏱️", {
      font: "bold 22px Outfit, Inter, Arial",
      color: "#fae8ff",
      stroke: "#ef4444",
      strokeThickness: 2
    });
    this.timerText.setOrigin(0.5);

    this.hudDashboardText = this.add.text(width / 2, 115, "Sen: Hız 0 km/h | 1. Tur", {
      font: "bold 13px Inter, Arial",
      color: "#fca5a5",
      backgroundColor: "rgba(15,23,42,0.6)",
      padding: { x: 12, y: 4 }
    });
    this.hudDashboardText.setOrigin(0.5);

    this.positionText = this.add.text(width / 2, 150, "Mevcut Durum: 1. Sıra 🥇", {
      font: "bold 11px Outfit, Inter, Arial",
      color: "#fcd34d",
    });
    this.positionText.setOrigin(0.5);

    // Start 1-second countdown clock ticker
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.remainingTime > 0) {
          this.remainingTime--;
          this.timerText.setText(`Yarış Süresi: ${this.remainingTime}s ⏱️`);
          
          if (this.remainingTime === 0) {
            this.handleRaceEnd();
          }
        }
      },
      callbackScope: this,
      loop: true
    });

    // 6. Return exit button
    const exitBtn = this.add.text(50, 40, "← Pistten Ayrıl", {
      font: "bold 14px Outfit, Inter, Arial",
      color: "#f87171",
      backgroundColor: "rgba(220, 38, 38, 0.2)",
      padding: { x: 12, y: 6 }
    });
    exitBtn.setInteractive({ useHandCursor: true });
    exitBtn.on("pointerdown", () => {
      cozyAudio.playClick();
      this.scene.stop("GoKartScene");
      this.scene.resume("MainScene");
    });

    // 7. RENDER STUNNING VIRTUAL MOBILE TOUCH BUTTONS
    // Steering Left Button ◀
    const steerLeftBtn = this.add.text(80, 740, "◀ SOL", {
      font: "bold 16px Outfit, Inter, Arial",
      color: "#06b6d4",
      backgroundColor: "rgba(6, 182, 212, 0.15)",
      padding: { x: 16, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10000);
    steerLeftBtn.on("pointerdown", () => {
      this.mobileSteerLeft = true;
      steerLeftBtn.setBackgroundColor("rgba(6, 182, 212, 0.55)");
    });
    steerLeftBtn.on("pointerup", () => {
      this.mobileSteerLeft = false;
      steerLeftBtn.setBackgroundColor("rgba(6, 182, 212, 0.15)");
    });
    steerLeftBtn.on("pointerout", () => {
      this.mobileSteerLeft = false;
      steerLeftBtn.setBackgroundColor("rgba(6, 182, 212, 0.15)");
    });

    // Steering Right Button ▶
    const steerRightBtn = this.add.text(180, 740, "SAĞ ▶", {
      font: "bold 16px Outfit, Inter, Arial",
      color: "#06b6d4",
      backgroundColor: "rgba(6, 182, 212, 0.15)",
      padding: { x: 16, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10000);
    steerRightBtn.on("pointerdown", () => {
      this.mobileSteerRight = true;
      steerRightBtn.setBackgroundColor("rgba(6, 182, 212, 0.55)");
    });
    steerRightBtn.on("pointerup", () => {
      this.mobileSteerRight = false;
      steerRightBtn.setBackgroundColor("rgba(6, 182, 212, 0.15)");
    });
    steerRightBtn.on("pointerout", () => {
      this.mobileSteerRight = false;
      steerRightBtn.setBackgroundColor("rgba(6, 182, 212, 0.15)");
    });

    // Reverse/Brake Button 🛑
    const brakeBtn = this.add.text(420, 740, "🛑 GERİ", {
      font: "bold 16px Outfit, Inter, Arial",
      color: "#f43f5e",
      backgroundColor: "rgba(244, 63, 94, 0.15)",
      padding: { x: 14, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10000);
    brakeBtn.on("pointerdown", () => {
      this.mobileBrake = true;
      brakeBtn.setBackgroundColor("rgba(244, 63, 94, 0.55)");
    });
    brakeBtn.on("pointerup", () => {
      this.mobileBrake = false;
      brakeBtn.setBackgroundColor("rgba(244, 63, 94, 0.15)");
    });
    brakeBtn.on("pointerout", () => {
      this.mobileBrake = false;
      brakeBtn.setBackgroundColor("rgba(244, 63, 94, 0.15)");
    });

    // Gas Button 🏎️🔥
    const gasBtn = this.add.text(520, 740, "GAZ 🏎️", {
      font: "bold 16px Outfit, Inter, Arial",
      color: "#10b981",
      backgroundColor: "rgba(16, 185, 129, 0.2)",
      padding: { x: 18, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10000);
    gasBtn.on("pointerdown", () => {
      this.mobileGas = true;
      gasBtn.setBackgroundColor("rgba(16, 185, 129, 0.6)");
    });
    gasBtn.on("pointerup", () => {
      this.mobileGas = false;
      gasBtn.setBackgroundColor("rgba(16, 185, 129, 0.2)");
    });
    gasBtn.on("pointerout", () => {
      this.mobileGas = false;
      gasBtn.setBackgroundColor("rgba(16, 185, 129, 0.2)");
    });
  }

  update(time: number, delta: number) {
    if (this.remainingTime <= 0) return;

    // 1. Check if Kart is on track asphalt road or on the green grass
    const onTrack = this.isOnTrack(this.playerKart.x, this.playerKart.y);
    let speedThrottle = 5.8; // Snappy speed acceleration on asphalt
    
    if (!onTrack) {
      this.playerMaxSpeed = 75; // Heavily penalize maximum speed on grass to prevent flying away!
      if (this.playerSpeed > this.playerMaxSpeed) this.playerSpeed = this.playerMaxSpeed;
      speedThrottle = 1.8; // Very sluggish acceleration in mud/grass
      const exh = this.playerExhaust as any;
      if (exh && exh.tint) {
        if (typeof exh.tint === "object" && "current" in exh.tint) {
          exh.tint.current = 0x78350f;
        } else {
          exh.tint = 0x78350f;
        }
      }
    } else {
      this.playerMaxSpeed = 245; // Full speed on racing asphalt
      const exh = this.playerExhaust as any;
      if (exh && exh.tint) {
        if (typeof exh.tint === "object" && "current" in exh.tint) {
          exh.tint.current = 0xef4444;
        } else {
          exh.tint = 0xef4444;
        }
      }
    }

    // 2. Player Kart Steering Controls (Keyboard + Mobile Buttons combined!)
    const driveForward = this.cursors.up.isDown || this.wasdKeys.up.isDown || this.mobileGas;
    const driveReverse = this.cursors.down.isDown || this.wasdKeys.down.isDown || this.mobileBrake;
    const steerLeft = this.cursors.left.isDown || this.wasdKeys.left.isDown || this.mobileSteerLeft;
    const steerRight = this.cursors.right.isDown || this.wasdKeys.right.isDown || this.mobileSteerRight;

    // Steer angle orientation
    if (steerLeft) {
      this.playerAngle -= this.steerSpeed;
    } else if (steerRight) {
      this.playerAngle += this.steerSpeed;
    }

    // Smooth speed throttle with friction dampening
    if (driveForward) {
      this.playerSpeed += speedThrottle;
      if (this.playerSpeed > this.playerMaxSpeed) this.playerSpeed = this.playerMaxSpeed;
      this.playerExhaust.start();
    } else if (driveReverse) {
      this.playerSpeed -= 3.5;
      if (this.playerSpeed < -80) this.playerSpeed = -80;
      this.playerExhaust.stop();
    } else {
      // Natural rolling friction dampening - higher off-road drag
      const dragFactor = onTrack ? 0.985 : 0.88;
      this.playerSpeed *= dragFactor;
      if (Math.abs(this.playerSpeed) < 3) this.playerSpeed = 0;
      this.playerExhaust.stop();
    }

    // Apply exact 2D vector movement based on angle heading
    const vx = Math.cos(this.playerAngle) * this.playerSpeed;
    const vy = Math.sin(this.playerAngle) * this.playerSpeed;

    const pBody = this.playerKart.body as Phaser.Physics.Arcade.Body;
    pBody.setVelocity(vx, vy);

    // Keep sprite pointing towards driving heading angle!
    this.playerKart.setRotation(this.playerAngle + Math.PI/2);

    // Bulletproof screen edge clamping so the kart can never fly completely off-screen
    this.playerKart.x = Phaser.Math.Clamp(this.playerKart.x, 60, 540);
    this.playerKart.y = Phaser.Math.Clamp(this.playerKart.y, 160, 680);

    // 3. Spouse AI Luna Kart Pathing Navigation
    this.driveLunaKart(delta);

    // 4. Lap Tally Check (Finish line collision detection)
    this.checkLapLines();

    // 5. Update HUD and Dashboards
    this.updateHUDDisplay();
  }

  private driveLunaKart(delta: number) {
    const waypoint = this.trackWaypoints[this.lunaWaypointIndex];
    const distToWaypoint = Phaser.Math.Distance.Between(this.partnerKart.x, this.partnerKart.y, waypoint.x, waypoint.y);

    if (distToWaypoint < 40) {
      // Advance to next waypoint
      this.lunaWaypointIndex = (this.lunaWaypointIndex + 1) % this.trackWaypoints.length;
    }

    // Move Luna towards target waypoint
    const targetWaypoint = this.trackWaypoints[this.lunaWaypointIndex];
    const angleToTarget = Phaser.Math.Angle.Between(this.partnerKart.x, this.partnerKart.y, targetWaypoint.x, targetWaypoint.y);

    const vx = Math.cos(angleToTarget) * this.lunaSpeed;
    const vy = Math.sin(angleToTarget) * this.lunaSpeed;

    const lBody = this.partnerKart.body as Phaser.Physics.Arcade.Body;
    lBody.setVelocity(vx, vy);

    this.partnerKart.setRotation(angleToTarget + Math.PI/2);
  }

  private checkLapLines() {
    // Check when player crosses y: 530 finish line stripe going UP on left lane (x: 120-180)
    const px = this.playerKart.x;
    const py = this.playerKart.y;

    if (px > 120 && px < 190) {
      if (py < 540 && py > 520) {
        if (!this.checkLapsPassed) {
          this.checkLapsPassed = true;
          this.playerLaps++;
          cozyAudio.playGiftBell();
          
          // Flash lap HUD alert!
          this.hudDashboardText.setText(`Sen: Hız ${Math.round(Math.abs(this.playerSpeed))} km/h | ${this.playerLaps}. Tur! 🔥`);
        }
      } else if (py > 560 || py < 480) {
        this.checkLapsPassed = false;
      }
    }

    // Luna simple lap timing trigger
    const lx = this.partnerKart.x;
    const ly = this.partnerKart.y;
    if (lx > 120 && lx < 190 && ly < 540 && ly > 520 && Math.random() < 0.05) {
      this.lunaLaps++;
    }
  }

  private updateHUDDisplay() {
    const playerSpeedKmh = Math.round(Math.abs(this.playerSpeed / 1.5));
    this.hudDashboardText.setText(`Sen: Hız ${playerSpeedKmh} km/h | ${this.playerLaps}. Tur (Luna: ${this.lunaLaps}. Tur)`);

    // Determine place position
    const isAhead = (this.playerLaps > this.lunaLaps) || (this.playerLaps === this.lunaLaps && this.playerKart.y < this.partnerKart.y);
    if (isAhead) {
      this.positionText.setText("Mevcut Durum: 1. Sıra 🥇 (Sen)");
      this.positionText.setColor("#fcd34d");
    } else {
      this.positionText.setText("Mevcut Durum: 2. Sıra 🥈 (Luna)");
      this.positionText.setColor("#cbd5e1");
    }
  }

  private isOnTrack(x: number, y: number): boolean {
    // The track road has a 68px width. Allow 52px cushion margin around centerline.
    if (y < 280) {
      // Top curve centered at (300, 280)
      const dist = Phaser.Math.Distance.Between(x, y, 300, 280);
      return Math.abs(dist - 140) < 52;
    } else if (y > 560) {
      // Bottom curve centered at (300, 560)
      const dist = Phaser.Math.Distance.Between(x, y, 300, 560);
      return Math.abs(dist - 140) < 52;
    } else {
      // Left lane straight (x: 160) or Right lane straight (x: 440)
      const distToLeft = Math.abs(x - 160);
      const distToRight = Math.abs(x - 440);
      return distToLeft < 52 || distToRight < 52;
    }
  }

  private handleRaceEnd() {
    // End race, launch confetti
    confetti({
      particleCount: 130,
      spread: 90,
      origin: { y: 0.6 }
    });

    const isWinner = this.playerLaps >= this.lunaLaps;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x0b0e17, 0.9);
    overlay.fillRect(0, 0, 3000, 3000);
    overlay.setDepth(9998);

    const winText = this.add.text(300, 350, isWinner ? "🏁 Damalı Bayrak Sallandı! Yarışı Sen Kazandın! 🏆" : "🏁 Harika Bir Yarış Oldu! Luna Kazandı! 🥰", {
      font: "bold 20px Outfit, Inter, Arial",
      color: "#fae8ff",
      align: "center"
    });
    winText.setOrigin(0.5);
    winText.setDepth(9999);

    this.time.delayedCall(4000, () => {
      overlay.destroy();
      winText.destroy();
      this.scene.stop("GoKartScene");
      this.scene.resume("MainScene");
    });
  }
}
