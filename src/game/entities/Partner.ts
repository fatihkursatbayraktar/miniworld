import Phaser from "phaser";
import { cozyAudio } from "@/utils/audio";
import Player from "./Player";

export default class Partner extends Phaser.GameObjects.Container {
  public speed = 135;

  // Custom styling attributes
  public nickname: string;
  public avatarColor: number;
  public hairStyle: string;
  public hairColor: number;

  // Visual sub-objects
  private shadow: Phaser.GameObjects.Sprite;
  private bodySprite: Phaser.GameObjects.Sprite;
  private headSprite: Phaser.GameObjects.Sprite;
  private hairSprite: Phaser.GameObjects.Sprite;
  private leftEye: Phaser.GameObjects.Sprite;
  private rightEye: Phaser.GameObjects.Sprite;
  private blushSprite: Phaser.GameObjects.Sprite;
  private nameTag!: Phaser.GameObjects.Text;

  // Bubble / Chat UI
  private speechBubble: Phaser.GameObjects.Container | null = null;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;

  // Synchronization / interpolation
  public targetX: number;
  public targetY: number;
  private prevX: number;
  private prevY: number;

  // State flags
  public isSitting = false;
  public isDrinking = false;
  public isAICompanion = false;

  private walkTime = 0;
  private blinkTimer = 0;

  // AI Decision Systems
  private aiState: "idle" | "following" | "sitting" | "walking_to_seat" = "idle";
  private aiDecisionTimer = 0;
  private aiTargetSeat: { x: number; y: number; type: "river" | "cafe"; obj: any } | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    nickname = "Companion",
    avatarColor = 0xa78bfa, // soft purple default partner color
    hairStyle = "long",
    hairColor = 0xd97706, // brown-blonde
    isAI = false
  ) {
    super(scene, x, y);

    this.nickname = nickname;
    this.avatarColor = avatarColor;
    this.hairStyle = hairStyle;
    this.hairColor = hairColor;
    this.isAICompanion = isAI;

    this.targetX = x;
    this.targetY = y;
    this.prevX = x;
    this.prevY = y;

    // Create the visual elements
    this.shadow = scene.add.sprite(0, 16, "av_shadow");
    this.shadow.setOrigin(0.5, 0.5);
    this.shadow.setAlpha(0.65);
    this.add(this.shadow);

    this.bodySprite = scene.add.sprite(0, -6, "av_body");
    this.bodySprite.setOrigin(0.5, 0.5);
    this.bodySprite.setTint(this.avatarColor);
    this.add(this.bodySprite);

    this.headSprite = scene.add.sprite(0, -32, "av_head");
    this.headSprite.setOrigin(0.5, 0.5);
    this.add(this.headSprite);

    this.leftEye = scene.add.sprite(-8, -32, "av_eye_open");
    this.leftEye.setOrigin(0.5, 0.5);
    this.add(this.leftEye);

    this.rightEye = scene.add.sprite(8, -32, "av_eye_open");
    this.rightEye.setOrigin(0.5, 0.5);
    this.add(this.rightEye);

    const hairTexture = `av_hair_${this.hairStyle}`;
    this.hairSprite = scene.add.sprite(0, -38, this.texturesExists(hairTexture) ? hairTexture : "av_hair_long");
    this.hairSprite.setOrigin(0.5, 0.5);
    this.hairSprite.setTint(this.hairColor);
    this.add(this.hairSprite);

    this.blushSprite = scene.add.sprite(0, -32, "av_head");
    this.blushSprite.setOrigin(0.5, 0.5);
    this.blushSprite.setAlpha(0);
    this.add(this.blushSprite);

    this.nameTag = scene.add.text(0, -70, this.nickname, {
      font: "bold 13px Outfit, Inter, Arial",
      color: "#f5f5f5",
      backgroundColor: "rgba(15, 23, 42, 0.6)",
      padding: { x: 8, y: 3 },
    });
    this.nameTag.setOrigin(0.5, 0.5);
    this.add(this.nameTag);

    // Physics
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(32, 24);
    body.setOffset(-16, -4);

    scene.add.existing(this);
  }

  private texturesExists(key: string): boolean {
    return this.scene.textures.exists(key);
  }

  public updateCustomizations(nickname: string, avatarColor: number, hairStyle: string, hairColor: number) {
    this.nickname = nickname;
    this.avatarColor = avatarColor;
    this.hairStyle = hairStyle;
    this.hairColor = hairColor;

    this.bodySprite.setTint(avatarColor);
    this.hairSprite.setTint(hairColor);

    const hairTexture = `av_hair_${hairStyle}`;
    this.hairSprite.setTexture(this.texturesExists(hairTexture) ? hairTexture : "av_hair_short");

    if (this.nameTag) {
      this.nameTag.setText(nickname);
    }
  }

  public update(time: number, delta: number, player?: Player) {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.isSitting) {
      // Sitting animation
      const breathe = Math.sin(time / 400) * 0.4;
      this.bodySprite.y = -6 + breathe;
      this.headSprite.y = -32 + breathe * 1.5;
      this.hairSprite.y = -38 + breathe * 1.5;
      this.leftEye.y = -32 + breathe * 1.5;
      this.rightEye.y = -32 + breathe * 1.5;

      body.setVelocity(0, 0);

      // AI: If player stands up, AI should stand up too
      if (this.isAICompanion && player && !player.isSitting && Math.random() < 0.05) {
        this.standUp();
      }
      return;
    }

    if (this.isAICompanion && player) {
      // --- Cozy AI Companion Decision Logic ---
      this.updateAICompanionLogic(time, delta, player);
    } else {
      // --- Multiplayer Network Sync Mode ---
      // Linearly interpolate current position towards target synchronized coordinate
      this.x = Phaser.Math.Linear(this.x, this.targetX, 0.15);
      this.y = Phaser.Math.Linear(this.y, this.targetY, 0.15);

      const dx = this.x - this.prevX;
      const dy = this.y - this.prevY;
      
      this.prevX = this.x;
      this.prevY = this.y;

      const isDisplaced = Math.sqrt(dx * dx + dy * dy) > 0.5;

      if (isDisplaced) {
        this.walkTime += delta * 0.012;
        const bounce = Math.abs(Math.sin(this.walkTime)) * 6;
        this.bodySprite.y = -6 - bounce;
        this.bodySprite.scaleY = 1 + Math.sin(this.walkTime * 2) * 0.05;
        this.bodySprite.scaleX = 1 - Math.sin(this.walkTime * 2) * 0.03;

        this.headSprite.y = -32 - bounce * 1.25;
        this.hairSprite.y = -38 - bounce * 1.25;
        this.leftEye.y = -32 - bounce * 1.25;
        this.rightEye.y = -32 - bounce * 1.25;

        // Facing orientation
        if (dx > 0.2) {
          this.bodySprite.scaleX = Math.abs(this.bodySprite.scaleX);
          this.headSprite.scaleX = 1;
          this.hairSprite.scaleX = 1;
        } else if (dx < -0.2) {
          this.bodySprite.scaleX = -Math.abs(this.bodySprite.scaleX);
          this.headSprite.scaleX = -1;
          this.hairSprite.scaleX = -1;
        }
      } else {
        const breathe = Math.sin(time / 500) * 0.6;
        this.bodySprite.y = -6 + breathe * 0.5;
        this.headSprite.y = -32 + breathe;
        this.hairSprite.y = -38 + breathe;
        this.leftEye.y = -32 + breathe;
        this.rightEye.y = -32 + breathe;
        
        this.bodySprite.scaleY = 1;
        this.bodySprite.scaleX = this.bodySprite.scaleX > 0 ? 1 : -1;
      }
    }

    // Blink timer
    this.blinkTimer += delta;
    if (this.blinkTimer > 3800) {
      this.triggerBlink();
      this.blinkTimer = 0;
    }

    this.setDepth(this.y);
  }

  private triggerBlink() {
    this.leftEye.setTexture("av_eye_closed");
    this.rightEye.setTexture("av_eye_closed");
    this.scene.time.delayedCall(160, () => {
      this.leftEye.setTexture("av_eye_open");
      this.rightEye.setTexture("av_eye_open");
    });
  }

  private updateAICompanionLogic(time: number, delta: number, player: Player) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    this.aiDecisionTimer += delta;

    // State machine updates
    if (this.aiState === "idle") {
      body.setVelocity(0, 0);

      // Breathing animation
      const breathe = Math.sin(time / 500) * 0.6;
      this.bodySprite.y = -6 + breathe * 0.5;
      this.headSprite.y = -32 + breathe;
      this.hairSprite.y = -38 + breathe;
      this.leftEye.y = -32 + breathe;
      this.rightEye.y = -32 + breathe;

      this.bodySprite.scaleY = 1;

      // Face the player
      const dx = player.x - this.x;
      this.bodySprite.scaleX = dx > 0 ? Math.abs(this.bodySprite.scaleX) : -Math.abs(this.bodySprite.scaleX);
      this.headSprite.scaleX = dx > 0 ? 1 : -1;
      this.hairSprite.scaleX = dx > 0 ? 1 : -1;

      // Trigger following if player walks away
      if (dist > 110 && !player.isSitting) {
        this.aiState = "following";
      }

      // If player sits on a bench, walk over to join
      if (player.isSitting && dist < 300) {
        this.checkAndJoinPlayerSeat(player);
      }

      // Random warm emotes/interactions
      if (this.aiDecisionTimer > 18000) {
        this.triggerRandomAIEmote();
        this.aiDecisionTimer = 0;
      }
    } else if (this.aiState === "following") {
      if (player.isSitting) {
        this.aiState = "idle";
        return;
      }

      if (dist < 60) {
        this.aiState = "idle";
        body.setVelocity(0, 0);
        return;
      }

      // Calculate path vectors towards player
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      // Soft organic weaving offset
      const wander = Math.sin(time / 200) * 0.25;
      const vx = Math.cos(angle + wander) * this.speed;
      const vy = Math.sin(angle + wander) * this.speed;

      body.setVelocity(vx, vy);

      // Walk bounce
      this.walkTime += delta * 0.012;
      const bounce = Math.abs(Math.sin(this.walkTime)) * 6;
      this.bodySprite.y = -6 - bounce;
      this.bodySprite.scaleY = 1 + Math.sin(this.walkTime * 2) * 0.05;
      this.bodySprite.scaleX = vx > 0 ? Math.abs(this.bodySprite.scaleX) : -Math.abs(this.bodySprite.scaleX);

      this.headSprite.y = -32 - bounce * 1.25;
      this.hairSprite.y = -38 - bounce * 1.25;
      this.leftEye.y = -32 - bounce * 1.25;
      this.rightEye.y = -32 - bounce * 1.25;

      this.headSprite.scaleX = vx > 0 ? 1 : -1;
      this.hairSprite.scaleX = vx > 0 ? 1 : -1;

      if (Math.floor(this.walkTime) % 3 === 0 && Math.random() < 0.2) {
        this.spawnFootstepDust();
      }
    } else if (this.aiState === "walking_to_seat") {
      if (!this.aiTargetSeat) {
        this.aiState = "idle";
        return;
      }

      const seatDist = Phaser.Math.Distance.Between(this.x, this.y, this.aiTargetSeat.x, this.aiTargetSeat.y);
      if (seatDist < 6) {
        // Arrived at target seat! Sit down
        body.setVelocity(0, 0);
        this.sitDown(this.aiTargetSeat.x, this.aiTargetSeat.y);
        
        // Trigger glowing heart bursts if sitting near player
        if (this.aiTargetSeat.obj && typeof this.aiTargetSeat.obj.triggerCozyGlow === "function") {
          this.aiTargetSeat.obj.triggerCozyGlow();
        }

        // Send a cozy partner heart emoji!
        this.scene.time.delayedCall(400, () => {
          this.displayEmote("💖");
        });

        this.aiState = "sitting";
        return;
      }

      // Walk to the seat
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.aiTargetSeat.x, this.aiTargetSeat.y);
      const vx = Math.cos(angle) * this.speed;
      const vy = Math.sin(angle) * this.speed;
      body.setVelocity(vx, vy);

      // Walk bounce
      this.walkTime += delta * 0.012;
      const bounce = Math.abs(Math.sin(this.walkTime)) * 6;
      this.bodySprite.y = -6 - bounce;
      this.bodySprite.scaleY = 1 + Math.sin(this.walkTime * 2) * 0.05;
      this.bodySprite.scaleX = vx > 0 ? Math.abs(this.bodySprite.scaleX) : -Math.abs(this.bodySprite.scaleX);

      this.headSprite.y = -32 - bounce * 1.25;
      this.hairSprite.y = -38 - bounce * 1.25;
      this.leftEye.y = -32 - bounce * 1.25;
      this.rightEye.y = -32 - bounce * 1.25;

      this.headSprite.scaleX = vx > 0 ? 1 : -1;
      this.hairSprite.scaleX = vx > 0 ? 1 : -1;
    }
  }

  private checkAndJoinPlayerSeat(player: Player) {
    if (this.aiTargetSeat) return;

    // Search scene zones for benches/chairs near player
    const mainScene = this.scene as any;
    if (!mainScene.seats) return;

    // Find a seat that is:
    // 1. In the same group/bench/table as the player
    // 2. Empty (not occupied)
    let bestSeat: any = null;

    mainScene.seats.forEach((seat: any) => {
      // If seat is occupied by player, ignore
      // If seat is occupied by partner, ignore
      const isPlayerHere = Phaser.Math.Distance.Between(player.x, player.y, seat.x, seat.y) < 15;
      if (isPlayerHere) {
        // Find empty neighbor seat in same zone
        mainScene.seats.forEach((nbr: any) => {
          if (nbr !== seat && nbr.zoneId === seat.zoneId && !nbr.occupied) {
            bestSeat = nbr;
          }
        });
      }
    });

    if (bestSeat) {
      bestSeat.occupied = true;
      this.aiTargetSeat = {
        x: bestSeat.x,
        y: bestSeat.y,
        type: bestSeat.type,
        obj: bestSeat.parentObject
      };
      this.aiState = "walking_to_seat";
    }
  }

  private triggerRandomAIEmote() {
    const emotes = ["💖", "🌸", "☕", "🐱", "✨", "💤"];
    const randomEmote = emotes[Phaser.Math.Between(0, emotes.length - 1)];
    
    // Greet or emote nicely
    this.displayEmote(randomEmote);
    
    // 20% chance to buy/gift flowers if close to the flower shop!
    if (Math.random() < 0.25 && this.y < 350 && this.x < 450) {
      this.scene.time.delayedCall(1500, () => {
        const mainScene = this.scene as any;
        if (mainScene.player) {
          mainScene.player.receiveFlower(["rose", "tulip", "sunflower", "lily"][Phaser.Math.Between(0, 3)]);
          this.displayEmote("💝");
        }
      });
    }
  }

  private spawnFootstepDust() {
    const dust = this.scene.add.graphics();
    dust.fillStyle(0xe5e7eb, 0.45);
    dust.fillCircle(this.x + Phaser.Math.Between(-8, 8), this.y + 12, Phaser.Math.Between(2, 4));
    dust.setDepth(this.depth - 1);

    this.scene.tweens.add({
      targets: dust,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      y: "-=8",
      duration: 500,
      onComplete: () => dust.destroy(),
    });
  }

  public sitDown(seatX: number, seatY: number) {
    if (this.isSitting) return;

    this.isSitting = true;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    this.scene.tweens.add({
      targets: this,
      x: seatX,
      y: seatY,
      duration: 250,
      ease: "Power1",
      onComplete: () => {
        cozyAudio.playClick();
        this.setDepth(seatY + 2);
      }
    });
  }

  public standUp() {
    if (!this.isSitting) return;
    this.isSitting = false;
    this.isDrinking = false;
    this.aiTargetSeat = null;
    this.aiState = "idle";
  }

  public displayEmote(emoji: string) {
    cozyAudio.playCuteBubble();

    if (this.speechBubble) {
      this.speechBubble.destroy();
      if (this.bubbleTimer) this.bubbleTimer.destroy();
    }

    this.speechBubble = this.scene.add.container(0, -96);
    this.add(this.speechBubble);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f172a, 0.85);
    bg.lineStyle(2, 0xc084fc, 0.9); // glow outline (purple hue for partner)
    bg.fillRoundedRect(-24, -24, 48, 48, 24);
    bg.strokeRoundedRect(-24, -24, 48, 48, 24);

    bg.beginPath();
    bg.moveTo(-8, 24);
    bg.lineTo(0, 32);
    bg.lineTo(8, 24);
    bg.closePath();
    bg.fill();
    bg.stroke();

    this.speechBubble.add(bg);

    const emojiText = this.scene.add.text(0, 0, emoji, {
      font: "24px Outfit, Arial",
      align: "center",
    });
    emojiText.setOrigin(0.5, 0.5);
    this.speechBubble.add(emojiText);

    this.speechBubble.setScale(0);
    this.scene.tweens.add({
      targets: this.speechBubble,
      scaleX: 1,
      scaleY: 1,
      y: -105,
      duration: 300,
      ease: "Back.easeOut",
    });

    this.blushSprite.setAlpha(0.6);

    this.bubbleTimer = this.scene.time.delayedCall(3000, () => {
      if (this.speechBubble) {
        this.scene.tweens.add({
          targets: this.speechBubble,
          alpha: 0,
          y: -120,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 400,
          onComplete: () => {
            this.speechBubble?.destroy();
            this.speechBubble = null;
            this.blushSprite.setAlpha(0);
          },
        });
      }
    });
  }

  // --- Flower Gift Animation Receiver ---
  public receiveFlower(flowerType: string) {
    cozyAudio.playGiftBell();

    const particles = this.scene.add.particles(this.x, this.y - 20, "part_heart", {
      speed: { min: -40, max: 40 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 1.2 },
      alpha: { start: 1, end: 0 },
      gravityY: -10,
      lifespan: 1500,
      frequency: 80,
      maxParticles: 15,
    });
    particles.setDepth(this.depth + 5);

    // Spawn dynamic floating flower or fish emoji above head
    let giftVisual: any;
    if (flowerType.startsWith("fish_")) {
      const inv = this.scene.registry.get("inventory") || [];
      const item = inv.find((i: any) => i.id === flowerType);
      const icon = item ? item.icon : (flowerType.endsWith("_cooked") ? "🍽️" : "🐟");
      giftVisual = this.scene.add.text(0, -110, icon, {
        fontSize: "36px",
        fontFamily: "Apple Color Emoji, Segoe UI Emoji, Roboto, sans-serif"
      });
      giftVisual.setOrigin(0.5, 0.5);
      giftVisual.setScale(0);
    } else {
      giftVisual = this.scene.add.sprite(0, -110, `flower_${flowerType}`);
      giftVisual.setScale(0);
    }
    this.add(giftVisual);

    this.scene.tweens.add({
      targets: giftVisual,
      scaleX: 1.5,
      scaleY: 1.5,
      y: -125,
      duration: 600,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: giftVisual,
          alpha: 0,
          scaleX: 0.5,
          scaleY: 0.5,
          y: -150,
          delay: 1800,
          duration: 500,
          onComplete: () => {
            giftVisual.destroy();
            particles.destroy();
          }
        });
      }
    });

    this.displayEmote("🌸");
  }

  public receiveJewel(jewelType: string) {
    cozyAudio.playGiftBell();

    const particles = this.scene.add.particles(this.x, this.y - 20, "part_firefly", {
      speed: { min: -50, max: 50 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 1.3 },
      alpha: { start: 1, end: 0 },
      tint: 0x22d3ee, // cyan diamond glow
      lifespan: 1600,
      frequency: 60,
      maxParticles: 20,
    });
    particles.setDepth(this.depth + 5);

    const emojiMap: any = { ring: "💎 Yüzük", necklace: "💖 Kolye", bracelet: "✨ Bileklik" };
    const label = this.scene.add.text(0, -110, emojiMap[jewelType] || "🎁 Mücevher", {
      font: "bold 13px Outfit, Arial",
      color: "#22d3ee",
      backgroundColor: "rgba(15, 23, 42, 0.8)",
      padding: { x: 8, y: 4 }
    });
    label.setOrigin(0.5, 0.5);
    label.setScale(0);
    this.add(label);

    this.scene.tweens.add({
      targets: label,
      scaleX: 1.3,
      scaleY: 1.3,
      y: -125,
      duration: 700,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: label,
          alpha: 0,
          scaleX: 0.6,
          scaleY: 0.6,
          y: -150,
          delay: 2000,
          duration: 500,
          onComplete: () => {
            label.destroy();
            particles.destroy();
          }
        });
      }
    });

    this.displayEmote("💎");
  }

  public displaySpeechBubble(message: string) {
    cozyAudio.playCuteBubble();

    if (this.speechBubble) {
      this.speechBubble.destroy();
      if (this.bubbleTimer) this.bubbleTimer.destroy();
    }

    this.speechBubble = this.scene.add.container(0, -96);
    this.add(this.speechBubble);

    const textWidth = Math.min(220, message.length * 6.5 + 24);
    const textHeight = message.length > 30 ? 44 : 26;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f172a, 0.9);
    bg.lineStyle(2, 0xc084fc, 0.95);
    bg.fillRoundedRect(-textWidth / 2, -textHeight / 2 - 10, textWidth, textHeight + 10, 10);
    bg.strokeRoundedRect(-textWidth / 2, -textHeight / 2 - 10, textWidth, textHeight + 10, 10);

    bg.beginPath();
    bg.moveTo(-8, textHeight / 2);
    bg.lineTo(0, textHeight / 2 + 8);
    bg.lineTo(8, textHeight / 2);
    bg.closePath();
    bg.fill();
    bg.stroke();

    this.speechBubble.add(bg);

    const txt = this.scene.add.text(0, -5, message, {
      font: "bold 11px Inter, Arial",
      color: "#fae8ff",
      align: "center",
      wordWrap: { width: textWidth - 16 }
    });
    txt.setOrigin(0.5, 0.5);
    this.speechBubble.add(txt);

    this.speechBubble.setScale(0);
    this.scene.tweens.add({
      targets: this.speechBubble,
      scaleX: 1,
      scaleY: 1,
      y: -105,
      duration: 350,
      ease: "Back.easeOut",
    });

    this.bubbleTimer = this.scene.time.delayedCall(4500, () => {
      if (this.speechBubble) {
        this.scene.tweens.add({
          targets: this.speechBubble,
          alpha: 0,
          y: -120,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 400,
          onComplete: () => {
            this.speechBubble?.destroy();
            this.speechBubble = null;
          }
        });
      }
    });
  }

  public receiveFood(foodType: string) {
    cozyAudio.playCuteBubble();

    // Spawn some warm steam or heart particles
    const particles = this.scene.add.particles(this.x, this.y - 30, "part_steam", {
      speedY: { min: -20, max: -45 },
      scale: { start: 0.5, end: 1.1 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 1500,
      frequency: 100,
      maxParticles: 12,
    });
    particles.setDepth(this.depth + 5);

    const emojiMap: any = {
      latte: "☕ Cozy Latte",
      cake: "🍰 Çilekli Pasta",
      bubbletea: "🧋 Matcha Bubble Tea",
      pancake: "🥞 Çikolatalı Pankek",
      ramen: "🍜 Ramen Kasesi"
    };

    const symbolMap: any = {
      latte: "☕",
      cake: "🍰",
      bubbletea: "🧋",
      pancake: "🥞",
      ramen: "🍜"
    };

    const label = this.scene.add.text(0, -110, emojiMap[foodType] || "🍲 Yiyecek", {
      font: "bold 13px Outfit, Arial",
      color: "#fca5a5",
      backgroundColor: "rgba(15, 23, 42, 0.85)",
      padding: { x: 8, y: 4 }
    });
    label.setOrigin(0.5, 0.5);
    label.setScale(0);
    this.add(label);

    this.scene.tweens.add({
      targets: label,
      scaleX: 1.3,
      scaleY: 1.3,
      y: -125,
      duration: 700,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: label,
          alpha: 0,
          scaleX: 0.6,
          scaleY: 0.6,
          y: -150,
          delay: 2500,
          duration: 500,
          onComplete: () => {
            label.destroy();
            particles.destroy();
          }
        });
      }
    });

    this.displayEmote(symbolMap[foodType] || "😋");
  }
}
