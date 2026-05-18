import Phaser from "phaser";

export default class WeatherSystem {
  private scene: Phaser.Scene;

  // Visual systems
  private rainParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private fireflyParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private clouds: Phaser.GameObjects.Group;
  private nightOverlay: Phaser.GameObjects.Graphics | null = null;

  // Configuration settings
  private isRaining = true;
  private isNightTime = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.clouds = scene.add.group();
  }

  public init() {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // 1. Create a beautiful twilight / night color overlay
    this.nightOverlay = this.scene.add.graphics();
    this.nightOverlay.setDepth(9000); // draw underneath UI HUD layers, but above props

    // 2. Initialize dynamic Rain particles (slanted droplets)
    if (this.isRaining) {
      this.rainParticles = this.scene.add.particles(0, 0, "part_raindrop", {
        x: { min: -200, max: 2000 },
        y: -50,
        speedY: { min: 400, max: 600 },
        speedX: { min: -80, max: -120 }, // slanted wind angle
        scaleY: { min: 0.8, max: 1.4 },
        scaleX: 0.6,
        alpha: { start: 0.1, end: 0.4 },
        lifespan: 1600,
        frequency: 20, // high density rain
      });
      this.rainParticles.setDepth(9100); // draw above chibis
    }

    // 3. Initialize riverbanks glowing fireflies
    this.fireflyParticles = this.scene.add.particles(250, 600, "part_firefly", {
      x: { min: -100, max: 400 }, // bounds of the river
      y: { min: 450, max: 800 },
      speedY: { min: -15, max: -35 },
      speedX: { min: -10, max: 10 },
      scale: { min: 0.4, max: 0.8 },
      alpha: { start: 0, end: 0.85, ease: "Sine.easeIn" },
      lifespan: 6000,
      frequency: 250,
    });
    this.fireflyParticles.setDepth(80); // float behind trees but near banks

    // 4. Create slowly moving puffy night clouds
    this.spawnDynamicClouds();
  }

  private spawnDynamicClouds() {
    // Generate 4-5 lazy atmospheric clouds
    for (let i = 0; i < 4; i++) {
      const cloudX = Phaser.Math.Between(100, 1600);
      const cloudY = Phaser.Math.Between(50, 300);
      
      const cloudCanvasKey = `cloud_${i}`;
      if (!this.scene.textures.exists(cloudCanvasKey)) {
        const canvas = this.scene.textures.createCanvas(cloudCanvasKey, 180, 80);
        if (canvas) {
          const ctx = canvas.getContext();
          if (ctx) {
            ctx.fillStyle = "rgba(107, 114, 128, 0.12)"; // highly transparent soft ambient grey-blue
            ctx.beginPath();
            ctx.arc(60, 40, 30, 0, Math.PI * 2);
            ctx.arc(100, 35, 38, 0, Math.PI * 2);
            ctx.arc(130, 45, 26, 0, Math.PI * 2);
            ctx.fill();
            canvas.refresh();
          }
        }
      }

      const cloud = this.scene.add.sprite(cloudX, cloudY, cloudCanvasKey);
      cloud.setDepth(9200); // cloud silhouettes high in sky overlay
      this.clouds.add(cloud);
    }
  }

  public update(time: number, delta: number) {
    // 1. Slow drift logic for clouds
    this.clouds.getChildren().forEach((c: any) => {
      c.x -= delta * 0.008; // extremely slow drift
      if (c.x < -200) {
        c.x = 1800; // warp around Harita boundaries
        c.y = Phaser.Math.Between(50, 300);
      }
    });

    // 2. Spawn dynamic ripples in random spots on ground or river
    if (this.isRaining && Math.random() < 0.12) {
      this.triggerSplatterRipple();
    }

    // 3. Keep visual day-night overlay synced with the global clock!
    if (typeof window !== "undefined") {
      const clock = (window as any).gameClock;
      if (clock) {
        this.updateTimeOfDay(clock.hour, clock.minute);
      }
    }
  }

  private triggerSplatterRipple() {
    // Draw water ripple rings
    const rx = Phaser.Math.Between(50, 1500);
    const ry = Phaser.Math.Between(100, 900);

    const rip = this.scene.add.sprite(rx, ry, "part_ripple");
    rip.setScale(0.2);
    rip.setAlpha(0.7);
    
    // Sort in drawing depth correctly
    rip.setDepth(ry - 5);

    this.scene.tweens.add({
      targets: rip,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0,
      duration: 650,
      ease: "Quad.easeOut",
      onComplete: () => rip.destroy(),
    });
  }

  public toggleRain() {
    this.isRaining = !this.isRaining;
    if (this.rainParticles) {
      if (this.isRaining) {
        this.rainParticles.start();
      } else {
        this.rainParticles.stop();
      }
    }
  }

  public updateTimeOfDay(hour: number, minute: number) {
    if (!this.nightOverlay) return;

    const timeVal = hour + minute / 60;
    
    // Keyframe list for smooth lighting interpolations
    const keyframes = [
      { time: 0, color: 0x070a13, alpha: 0.62 },   // Midnight
      { time: 5.5, color: 0x070a13, alpha: 0.62 }, // Pre-dawn
      { time: 6.8, color: 0xf97316, alpha: 0.35 }, // Sunrise Orange
      { time: 8.5, color: 0xfef08a, alpha: 0.05 }, // Warm Morning Sun Glow
      { time: 16.5, color: 0xfef08a, alpha: 0.05 },// Sunny Afternoon
      { time: 18.5, color: 0xf43f5e, alpha: 0.42 },// Sunset Crimson Pink
      { time: 20.5, color: 0x070a13, alpha: 0.62 },// Night onset
      { time: 24, color: 0x070a13, alpha: 0.62 }   // Midnight warp
    ];

    let lower = keyframes[0];
    let upper = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (timeVal >= keyframes[i].time && timeVal < keyframes[i+1].time) {
        lower = keyframes[i];
        upper = keyframes[i+1];
        break;
      }
    }

    const range = upper.time - lower.time;
    const factor = range > 0 ? (timeVal - lower.time) / range : 0;

    const color = this.interpolateColor(lower.color, upper.color, factor);
    const alpha = lower.alpha + (upper.alpha - lower.alpha) * factor;

    // Enable/disable rain based on night-time (keeps rain particles running during late night cozy times)
    const isActuallyNight = (hour >= 20 || hour < 6);
    if (isActuallyNight && !this.isRaining) {
      this.isRaining = true;
      if (this.rainParticles) this.rainParticles.start();
    } else if (!isActuallyNight && this.isRaining) {
      this.isRaining = false;
      if (this.rainParticles) this.rainParticles.stop();
    }

    this.nightOverlay.clear();
    this.nightOverlay.fillStyle(color, alpha);
    this.nightOverlay.fillRect(0, 0, 3000, 3000);
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
}
