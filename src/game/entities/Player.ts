import Phaser from "phaser";
import { cozyAudio } from "@/utils/audio";

export default class Player extends Phaser.GameObjects.Container {
  public speed = 160;
  
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
  private heldFlowerSprite: Phaser.GameObjects.Sprite;
  private heldEmojiText: Phaser.GameObjects.Text;
  private heldImageSprite: Phaser.GameObjects.Sprite;

  // Bubble / Chat UI
  private speechBubble: Phaser.GameObjects.Container | null = null;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;

  // Movement keys
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // State flags
  public isSitting = false;
  public isDrinking = false;
  private walkTime = 0;
  private blinkTimer = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    nickname = "Me",
    avatarColor = 0xfb7185,
    hairStyle = "short",
    hairColor = 0x78350f
  ) {
    super(scene, x, y);

    this.nickname = nickname;
    this.avatarColor = avatarColor;
    this.hairStyle = hairStyle;
    this.hairColor = hairColor;

    // Create the visual elements inside this container
    // 1. Drop Shadow
    this.shadow = scene.add.sprite(0, 16, "av_shadow");
    this.shadow.setOrigin(0.5, 0.5);
    this.shadow.setAlpha(0.65);
    this.add(this.shadow);

    // 2. Torso (Sweater / Overalls)
    this.bodySprite = scene.add.sprite(0, -6, "av_body");
    this.bodySprite.setOrigin(0.5, 0.5);
    this.bodySprite.setTint(this.avatarColor);
    this.add(this.bodySprite);

    // 3. Head (Face and blush)
    this.headSprite = scene.add.sprite(0, -32, "av_head");
    this.headSprite.setOrigin(0.5, 0.5);
    this.add(this.headSprite);

    // 4. Eyes (Left and Right)
    this.leftEye = scene.add.sprite(-8, -32, "av_eye_open");
    this.leftEye.setOrigin(0.5, 0.5);
    this.add(this.leftEye);

    this.rightEye = scene.add.sprite(8, -32, "av_eye_open");
    this.rightEye.setOrigin(0.5, 0.5);
    this.add(this.rightEye);

    // 5. Hair
    const hairTexture = `av_hair_${this.hairStyle}`;
    this.hairSprite = scene.add.sprite(0, -38, this.texturesExists(hairTexture) ? hairTexture : "av_hair_short");
    this.hairSprite.setOrigin(0.5, 0.5);
    this.hairSprite.setTint(this.hairColor);
    this.add(this.hairSprite);

    // 6. Blushing cheeks overlay
    this.blushSprite = scene.add.sprite(0, -32, "av_head");
    this.blushSprite.setOrigin(0.5, 0.5);
    this.blushSprite.setAlpha(0); // active only when happy/emoting
    this.add(this.blushSprite);
 
    // 6.5. Held flower sprite overlay
    this.heldFlowerSprite = scene.add.sprite(12, -10, "flower_rose");
    this.heldFlowerSprite.setOrigin(0.5, 0.5);
    this.heldFlowerSprite.setScale(0.85);
    this.heldFlowerSprite.setDepth(95); // above body, below head
    this.heldFlowerSprite.setVisible(false);
    this.add(this.heldFlowerSprite);
 
    // 6.6. Held emoji text overlay (for jewelry items fallback)
    this.heldEmojiText = scene.add.text(12, -10, "💍", { font: "18px Arial" });
    this.heldEmojiText.setOrigin(0.5, 0.5);
    this.heldEmojiText.setDepth(96);
    this.heldEmojiText.setVisible(false);
    this.add(this.heldEmojiText);
 
    // 6.7. Held 2D Image asset (for luxury jewelry)
    this.heldImageSprite = scene.add.sprite(12, -10, "img_silver_ring");
    this.heldImageSprite.setOrigin(0.5, 0.5);
    this.heldImageSprite.setScale(0.035); // beautifully fit in hand without being huge
    this.heldImageSprite.setDepth(97);
    this.heldImageSprite.setVisible(false);
    this.add(this.heldImageSprite);
 
    // 7. Text tag for name
    const nameTag = scene.add.text(0, -70, this.nickname, {
      font: "bold 13px Outfit, Inter, Arial",
      color: "#f5f5f5",
      backgroundColor: "rgba(15, 23, 42, 0.6)",
      padding: { x: 8, y: 3 },
    });
    nameTag.setOrigin(0.5, 0.5);
    // Round tag corners via standard drawing or styled overlay
    this.add(nameTag);

    // Enable physics body inside scene
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(32, 24);
    body.setOffset(-16, -4);

    // Bind movement controls
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = scene.input.keyboard.addKeys("W,A,S,D") as any;
    }

    // Add to game scene update list
    scene.add.existing(this);
  }

  private texturesExists(key: string): boolean {
    return this.scene.textures.exists(key);
  }

  public update(time: number, delta: number, joystickVelocity?: { x: number; y: number }) {
    if (this.isSitting) {
      // Sitting logic: gently breathe
      const breathe = Math.sin(time / 400) * 0.4;
      this.bodySprite.y = -6 + breathe;
      this.headSprite.y = -32 + breathe * 1.5;
      this.hairSprite.y = -38 + breathe * 1.5;
      this.leftEye.y = -32 + breathe * 1.5;
      this.rightEye.y = -32 + breathe * 1.5;
      
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;

    // Use joystick input if present, else fallback to keyboard inputs
    if (joystickVelocity && (joystickVelocity.x !== 0 || joystickVelocity.y !== 0)) {
      vx = joystickVelocity.x * this.speed;
      vy = joystickVelocity.y * this.speed;
    } else if (this.cursors) {
      // Keyboard input calculation
      if (this.cursors.left.isDown || this.wasd.A.isDown) {
        vx = -this.speed;
      } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
        vx = this.speed;
      }

      if (this.cursors.up.isDown || this.wasd.W.isDown) {
        vy = -this.speed;
      } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
        vy = this.speed;
      }

      // Normalize diagonal speeds
      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }
    }

    body.setVelocity(vx, vy);

    // Walk bouncing animations & footstep dust effects
    if (vx !== 0 || vy !== 0) {
      this.walkTime += delta * 0.012;
      
      // Cozy squeeze-stretch physics walk cycle
      const bounce = Math.abs(Math.sin(this.walkTime)) * 6;
      this.bodySprite.y = -6 - bounce;
      this.bodySprite.scaleY = 1 + Math.sin(this.walkTime * 2) * 0.05;
      this.bodySprite.scaleX = 1 - Math.sin(this.walkTime * 2) * 0.03;

      this.headSprite.y = -32 - bounce * 1.25;
      this.hairSprite.y = -38 - bounce * 1.25;
      this.leftEye.y = -32 - bounce * 1.25;
      this.rightEye.y = -32 - bounce * 1.25;
      this.heldFlowerSprite.y = -10 - bounce * 0.75;
      this.heldEmojiText.y = -10 - bounce * 0.75;

      // Handle sprite orientation
      if (vx > 0) {
        this.bodySprite.scaleX = Math.abs(this.bodySprite.scaleX);
        this.headSprite.scaleX = 1;
        this.hairSprite.scaleX = 1;
      } else if (vx < 0) {
        this.bodySprite.scaleX = -Math.abs(this.bodySprite.scaleX);
        this.headSprite.scaleX = -1;
        this.hairSprite.scaleX = -1;
      }

      // Footstep dust puff generation
      if (Math.floor(this.walkTime) % 3 === 0 && Math.random() < 0.25) {
        this.spawnFootstepDust();
      }
    } else {
      // Idle breathing physics
      const breathe = Math.sin(time / 500) * 0.6;
      this.bodySprite.y = -6 + breathe * 0.5;
      this.headSprite.y = -32 + breathe;
      this.hairSprite.y = -38 + breathe;
      this.leftEye.y = -32 + breathe;
      this.rightEye.y = -32 + breathe;
      this.heldFlowerSprite.y = -10 + breathe * 0.5;
      this.heldEmojiText.y = -10 + breathe * 0.5;
      this.heldImageSprite.y = -10 + breathe * 0.5;
      
      this.bodySprite.scaleY = 1;
      this.bodySprite.scaleX = this.bodySprite.scaleX > 0 ? 1 : -1;
    }

    // Periodic blinking anims
    this.blinkTimer += delta;
    if (this.blinkTimer > 3500) {
      this.triggerBlink();
      this.blinkTimer = 0;
    }

    // Update held item visibility (Flowers or Jewelry)
    const activeId = (window as any).selectedCartFlower || (window as any).activeHeldFlower;
    if (activeId) {
      if (activeId.startsWith("j_")) {
        // It's a jewelry item
        const inv = this.scene.registry.get("inventory") || [];
        const item = inv.find((i: any) => i.id === activeId);
        
        this.heldFlowerSprite.setVisible(false);
        this.heldImageSprite.setVisible(false);
        this.heldEmojiText.setVisible(false);
 
        if (item) {
          if (item.image) {
             // Map the item.image path back to Phaser texture key
             const imgMap: any = {
               "/assets/silver_ring.png": "img_silver_ring",
               "/assets/silver_necklace.png": "img_silver_necklace",
               "/assets/silver_earring.png": "img_silver_earring",
               "/assets/silver_bracelet.png": "img_silver_bracelet",
               "/assets/silver_crown.png": "img_silver_crown"
             };
             const phaserKey = imgMap[item.image];
             if (this.scene.textures.exists(phaserKey)) {
               this.heldImageSprite.setTexture(phaserKey);
               // Apply tint if cssFilter indicates gold or sapphire
               if (item.cssFilter && item.cssFilter.includes("sepia")) {
                 if (item.cssFilter.includes("-45deg")) this.heldImageSprite.setTint(0xffb6c1); // Rose Gold
                 else this.heldImageSprite.setTint(0xfcd34d); // Gold
               } else if (item.cssFilter && item.cssFilter.includes("200deg")) {
                 this.heldImageSprite.setTint(0x60a5fa); // Sapphire
               } else if (item.cssFilter && item.cssFilter.includes("150deg")) {
                 this.heldImageSprite.setTint(0xf87171); // Ruby
               } else {
                 this.heldImageSprite.clearTint();
               }
               this.heldImageSprite.setVisible(true);
             } else {
               // Fallback if image not loaded
               this.heldEmojiText.setText(item.icon);
               this.heldEmojiText.setVisible(true);
             }
          } else {
             // Emoji only
             this.heldEmojiText.setText(item.icon);
             this.heldEmojiText.setVisible(true);
          }
        } else {
          // Fallback
          this.heldEmojiText.setText("💎");
          this.heldEmojiText.setVisible(true);
        }
      } else if (activeId.startsWith("fish_")) {
        // It's a fish item!
        const inv = this.scene.registry.get("inventory") || [];
        const item = inv.find((i: any) => i.id === activeId);

        this.heldFlowerSprite.setVisible(false);
        this.heldImageSprite.setVisible(false);
        this.heldEmojiText.setVisible(false);

        if (item) {
          this.heldEmojiText.setText(item.icon);
          this.heldEmojiText.setVisible(true);
        } else {
          this.heldEmojiText.setText(activeId.endsWith("_cooked") ? "🍽️" : "🐟");
          this.heldEmojiText.setVisible(true);
        }
      } else {
        // It's a flower sprite
        const textureMap: any = {
          rose: "flower_rose",
          hydrangea: "flower_lily",
          sunflower: "flower_sunflower",
          lavender: "flower_tulip",
          tulip: "flower_tulip"
        };
        const texKey = textureMap[activeId] || "flower_rose";
        if (this.scene.textures.exists(texKey)) {
          this.heldFlowerSprite.setTexture(texKey);
          this.heldFlowerSprite.setVisible(true);
          this.heldEmojiText.setVisible(false);
        } else {
          this.heldFlowerSprite.setVisible(false);
          this.heldEmojiText.setVisible(false);
          this.heldImageSprite.setVisible(false);
        }
      }
    } else {
      this.heldFlowerSprite.setVisible(false);
      this.heldEmojiText.setVisible(false);
      this.heldImageSprite.setVisible(false);
    }
 
    // Flip held items depending on walking direction
    this.heldFlowerSprite.x = this.bodySprite.scaleX > 0 ? 12 : -12;
    this.heldEmojiText.x = this.bodySprite.scaleX > 0 ? 12 : -12;
    this.heldImageSprite.x = this.bodySprite.scaleX > 0 ? 12 : -12;
 
    // Dynamic 2.5D layer depth sort based on Y height
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

  // --- Sit State Trigger ---
  public sitDown(seatX: number, seatY: number, angle = 0) {
    if (this.isSitting) return;

    this.isSitting = true;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    
    // Smooth seating transition
    this.scene.tweens.add({
      targets: this,
      x: seatX,
      y: seatY,
      duration: 250,
      ease: "Power1",
      onComplete: () => {
        cozyAudio.playClick();
        this.setDepth(seatY + 2); // Sit properly aligned in depth sorting
      }
    });
  }

  public standUp() {
    if (!this.isSitting) return;
    this.isSitting = false;
    this.isDrinking = false;
  }

  // --- Cozy Speech & Emoji Bubble System ---
  public displayEmote(emoji: string) {
    cozyAudio.playCuteBubble();
    
    // Clear old bubble
    if (this.speechBubble) {
      this.speechBubble.destroy();
      if (this.bubbleTimer) this.bubbleTimer.destroy();
    }

    this.speechBubble = this.scene.add.container(0, -96);
    this.add(this.speechBubble);

    // Bubble Backdrop
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f172a, 0.85); // glass effect deep blue
    bg.lineStyle(2, 0xd8b4fe, 0.9); // glow outline
    bg.fillRoundedRect(-24, -24, 48, 48, 24);
    bg.strokeRoundedRect(-24, -24, 48, 48, 24);
    
    // Triangle tail pointing down
    bg.beginPath();
    bg.moveTo(-8, 24);
    bg.lineTo(0, 32);
    bg.lineTo(8, 24);
    bg.closePath();
    bg.fill();
    bg.stroke();

    this.speechBubble.add(bg);

    // Glowing Emoji text
    const emojiText = this.scene.add.text(0, 0, emoji, {
      font: "24px Outfit, Arial",
      align: "center",
    });
    emojiText.setOrigin(0.5, 0.5);
    this.speechBubble.add(emojiText);

    // Animate bubble entry
    this.speechBubble.setScale(0);
    this.scene.tweens.add({
      targets: this.speechBubble,
      scaleX: 1,
      scaleY: 1,
      y: -105,
      duration: 300,
      ease: "Back.easeOut",
    });

    // Make blush red cheek active
    this.blushSprite.setAlpha(0.6);

    // Dissolve bubble after duration
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
 
  // --- Drink Coffee Emote ---
  public drinkCoffee() {
    if (this.isDrinking) return;
    this.isDrinking = true;

    // Trigger steam particle overlays
    const emitter = this.scene.add.particles(this.x, this.y - 48, "part_steam", {
      speedY: { min: -15, max: -35 },
      scale: { start: 0.4, end: 1.0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 1400,
      frequency: 200,
      maxParticles: 8,
    });
    emitter.setDepth(this.depth + 1);

    this.displayEmote("☕");

    this.scene.time.delayedCall(3000, () => {
      emitter.destroy();
      this.isDrinking = false;
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
