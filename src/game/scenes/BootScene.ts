import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    // Show a cozy minimal loading progress overlay
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: "Creating Cozy Sanctuary...",
      style: {
        font: "20px Outfit, Arial",
        color: "#fae8ff"
      }
    });
    loadingText.setOrigin(0.5);

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1e1b4b, 0.6);
    progressBox.fillRoundedRect(width / 2 - 160, height / 2 - 20, 320, 24, 12);

    this.load.on("progress", (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xd8b4fe, 0.85);
      progressBar.fillRoundedRect(width / 2 - 156, height / 2 - 16, 312 * value, 16, 8);
    });

    this.load.on("complete", () => {
      // Programmatically remove white backgrounds from loaded 2D assets
      this.removeWhiteBackground("img_silver_ring");
      this.removeWhiteBackground("img_silver_necklace");
      this.removeWhiteBackground("img_silver_earring");
      this.removeWhiteBackground("img_silver_bracelet");
      this.removeWhiteBackground("img_silver_crown");
 
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      this.scene.start("MainScene");
    });

    // Load External High-Res 2D Assets
    this.load.image("img_silver_ring", "/assets/silver_ring.png");
    this.load.image("img_silver_necklace", "/assets/silver_necklace.png");
    this.load.image("img_silver_earring", "/assets/silver_earring.png");
    this.load.image("img_silver_bracelet", "/assets/silver_bracelet.png");
    this.load.image("img_silver_crown", "/assets/silver_crown.png");
 
    // We generate all textures procedurally to ensure crisp 2.5D graphics with 0KB overhead.
    this.generateProceduralTextures();
  }

  private removeWhiteBackground(textureKey: string) {
    if (!this.textures.exists(textureKey)) return;
    const srcTex = this.textures.get(textureKey);
    const srcImg = srcTex.getSourceImage();
    if (!srcImg || !(srcImg instanceof HTMLImageElement)) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = srcImg.width;
    canvas.height = srcImg.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    
    ctx.drawImage(srcImg, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert near-white pixels to transparent
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Strict white-keying threshold (catches white and very light gray/compression artifacts)
      if (r > 240 && g > 240 && b > 240) {
        data[i + 3] = 0; // Set Alpha to 0
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Overwrite the texture with the transparent version
    this.textures.remove(textureKey);
    this.textures.addCanvas(textureKey, canvas);
  }
 
  private generateProceduralTextures() {
    // 1. Chibi Base Shadow (Soft Oval Drop Shadow)
    this.drawCanvasTexture("av_shadow", 48, 24, (ctx) => {
      const grad = ctx.createRadialGradient(24, 12, 1, 24, 12, 24);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.5)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 48, 24);
    });

    // 2. Chibi Character Body (Cozy Sweater / Overalls)
    this.drawCanvasTexture("av_body", 40, 50, (ctx) => {
      // Draw standard cute torso
      ctx.fillStyle = "#ffffff"; // base texture, tinted dynamically in-game
      ctx.beginPath();
      // Draw rounded sweater body
      ctx.roundRect(4, 10, 32, 36, 12);
      ctx.fill();
      
      // Draw tiny white sleeves/arms
      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath();
      ctx.arc(8, 28, 6, 0, Math.PI * 2);
      ctx.arc(32, 28, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Chibi Head (Cute blushing anime face)
    this.drawCanvasTexture("av_head", 44, 44, (ctx) => {
      // Soft chibi face skin
      ctx.fillStyle = "#ffe4e6"; // soft warm peach blush skin tone
      ctx.beginPath();
      ctx.arc(22, 22, 18, 0, Math.PI * 2);
      ctx.fill();

      // Blushing Cheeks
      ctx.fillStyle = "rgba(251, 113, 133, 0.5)"; // pastel pink blush
      ctx.beginPath();
      ctx.arc(10, 24, 4, 0, Math.PI * 2);
      ctx.arc(34, 24, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Anime Eyes (Open state)
    this.drawCanvasTexture("av_eye_open", 12, 12, (ctx) => {
      // Draw warm shiny anime eyes
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(6, 6, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye glint particle (white shine)
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(5, 4, 1, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Anime Eyes (Closed / Happy State)
    this.drawCanvasTexture("av_eye_closed", 12, 12, (ctx) => {
      // Draw happy arch line eyes (^^)
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(6, 9, 4, Math.PI, 0, false);
      ctx.stroke();
    });

    // 6. Hairstyles
    // Short hair (Classic, clean styling)
    this.drawCanvasTexture("av_hair_short", 48, 48, (ctx) => {
      ctx.fillStyle = "#ffffff"; // tinted dynamically
      ctx.beginPath();
      ctx.arc(24, 24, 20, Math.PI, 0, false); // top cap
      ctx.fill();

      // Short hair strands (left and right side strands framing face)
      ctx.beginPath();
      ctx.roundRect(4, 22, 10, 16, 4);
      ctx.roundRect(34, 22, 10, 16, 4);
      ctx.fill();
    });

    // Long hair (Curly buns)
    this.drawCanvasTexture("av_hair_long", 48, 48, (ctx) => {
      ctx.fillStyle = "#ffffff"; // tinted
      ctx.beginPath();
      ctx.arc(24, 24, 20, Math.PI, 0, false); // main top cap
      ctx.fill();
      
      // Dual high space-buns
      ctx.beginPath();
      ctx.arc(8, 12, 10, 0, Math.PI * 2);
      ctx.arc(40, 12, 10, 0, Math.PI * 2);
      ctx.fill();

      // Long side locks
      ctx.beginPath();
      ctx.roundRect(4, 22, 8, 24, 4);
      ctx.roundRect(36, 22, 8, 24, 4);
      ctx.fill();
    });

    // Spiky hair (Cute visual-novel anime look)
    this.drawCanvasTexture("av_hair_spiky", 48, 48, (ctx) => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(24, 24, 20, Math.PI * 1.1, Math.PI * 1.9, false); // top
      ctx.fill();

      // Draw random dynamic locks
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(10 + i * 7, 20);
        ctx.lineTo(13 + i * 7, 30);
        ctx.lineTo(17 + i * 7, 20);
        ctx.closePath();
        ctx.fill();
      }
      // Hair side burns
      ctx.beginPath();
      ctx.roundRect(6, 20, 6, 12, 2);
      ctx.roundRect(36, 20, 6, 12, 2);
      ctx.fill();
    });

    // Messy boy hair (bed hair style)
    this.drawCanvasTexture("av_hair_messy", 48, 48, (ctx) => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(24, 24, 20, Math.PI, 0, false); // main top cap
      ctx.fill();

      // Messy spikes on top and side fringe
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(12 + i * 8, 20);
        ctx.quadraticCurveTo(15 + i * 8, 8, 18 + i * 8, 20);
        ctx.fill();
      }
      
      // Sweeping fringe strands framing the head
      ctx.beginPath();
      ctx.roundRect(6, 22, 8, 14, 4);
      ctx.roundRect(34, 22, 8, 14, 4);
      ctx.fill();
    });

    // Undercut boy hair (swept-back top, shaved side gradient)
    this.drawCanvasTexture("av_hair_undercut", 48, 48, (ctx) => {
      // Shaved sides (drawn darker or thinner overlay)
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)"; // translucent shaved look
      ctx.beginPath();
      ctx.roundRect(4, 20, 40, 18, 4);
      ctx.fill();

      // Swept back thick crown
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(24, 18, 18, 13, 0.05, 0, Math.PI * 2);
      ctx.fill();

      // Swoop fringe details
      ctx.beginPath();
      ctx.moveTo(10, 18);
      ctx.quadraticCurveTo(24, 8, 38, 18);
      ctx.lineTo(24, 22);
      ctx.closePath();
      ctx.fill();
    });

    // 7. Dynamic Ambient Environment Props
    // Weeping Willow Cozy Tree
    this.drawCanvasTexture("prop_tree", 100, 150, (ctx) => {
      // Curved trunk
      ctx.fillStyle = "#4a3728";
      ctx.beginPath();
      ctx.moveTo(45, 150);
      ctx.quadraticCurveTo(40, 110, 50, 80);
      ctx.lineTo(56, 80);
      ctx.quadraticCurveTo(48, 110, 55, 150);
      ctx.closePath();
      ctx.fill();

      // Hanging foliage (overlapping translucent green blobs)
      const layers = [
        { x: 50, y: 55, r: 40, col: "rgba(16, 185, 129, 0.75)" },
        { x: 30, y: 40, r: 30, col: "rgba(5, 150, 105, 0.8)" },
        { x: 70, y: 45, r: 32, col: "rgba(52, 211, 153, 0.7)" },
        { x: 50, y: 30, r: 35, col: "rgba(110, 231, 183, 0.65)" }
      ];
      layers.forEach((l) => {
        ctx.fillStyle = l.col;
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Cozy Outdoor Wooden Bench
    this.drawCanvasTexture("prop_bench", 96, 48, (ctx) => {
      // Wood boards
      ctx.fillStyle = "#854d0e"; // warm brown oak
      ctx.beginPath();
      ctx.roundRect(4, 12, 88, 12, 4); // bench seat
      ctx.roundRect(4, 28, 88, 10, 4); // backrest shadow
      ctx.fill();

      // Metal base frames & legs
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(16, 24);
      ctx.lineTo(16, 44);
      ctx.moveTo(80, 24);
      ctx.lineTo(80, 44);
      ctx.stroke();
    });

    // Hanging Lantern
    this.drawCanvasTexture("prop_lantern", 32, 48, (ctx) => {
      // String
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(16, 14);
      ctx.stroke();

      // Lantern body (Soft glow yellow capsule)
      const grad = ctx.createRadialGradient(16, 26, 2, 16, 26, 14);
      grad.addColorStop(0, "#fef08a"); // warm yellow neon glow
      grad.addColorStop(0.6, "#facc15");
      grad.addColorStop(1, "#ca8a04");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(6, 14, 20, 24, 6);
      ctx.fill();

      // Cap and tassel
      ctx.fillStyle = "#78350f";
      ctx.fillRect(10, 12, 12, 3); // top cap
      ctx.fillRect(10, 37, 12, 2); // bottom cap
      
      ctx.fillStyle = "#dc2626"; // red tassel
      ctx.fillRect(15, 39, 2, 8);
    });

    // Cozy Cafe Round Table
    this.drawCanvasTexture("prop_cafe_table", 64, 64, (ctx) => {
      // Table Leg/Shadow
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.ellipse(32, 54, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#334155";
      ctx.fillRect(30, 24, 4, 30); // center metal pillar

      // Tabletop circular board
      ctx.fillStyle = "#a16207"; // warm mahogany
      ctx.beginPath();
      ctx.ellipse(32, 22, 28, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tabletop edge highlight
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(32, 22, 28, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Cafe Sitting Chair
    this.drawCanvasTexture("prop_cafe_chair", 36, 44, (ctx) => {
      // Chair base
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(8, 22, 2, 20); // legs
      ctx.fillRect(26, 22, 2, 20);
      
      // Velvet cushion
      ctx.fillStyle = "#9f1239"; // dark warm rose velvet
      ctx.beginPath();
      ctx.ellipse(18, 20, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Backrest
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(18, 10, 10, 6, 0, Math.PI, 0); // curved top backrest
      ctx.stroke();
      ctx.moveTo(18, 10);
      ctx.lineTo(18, 20); // spine rod
      ctx.stroke();
    });

    // Arcade Machine Cabinet
    this.drawCanvasTexture("prop_arcade_cabinet", 54, 86, (ctx) => {
      // Outer cabinet
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 54, 86);

      // Glowing screen bezel
      ctx.fillStyle = "rgba(139, 92, 246, 0.2)"; // glowing purple frame
      ctx.fillRect(6, 12, 42, 30);
      ctx.strokeStyle = "#8b5cf6";
      ctx.lineWidth = 2;
      ctx.strokeRect(6, 12, 42, 30);

      // Cute screen graphic (procedural retro pixel elements)
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(20, 24, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(34, 28, 3, 0, Math.PI * 2);
      ctx.fill();

      // Control panel slope
      ctx.fillStyle = "#3b4252";
      ctx.beginPath();
      ctx.moveTo(0, 48);
      ctx.lineTo(54, 48);
      ctx.lineTo(48, 58);
      ctx.lineTo(6, 58);
      ctx.closePath();
      ctx.fill();

      // Joysticks and buttons (tiny glowing neon dots)
      ctx.fillStyle = "#f43f5e"; // red stick
      ctx.fillRect(14, 50, 2, 4);
      ctx.beginPath();
      ctx.arc(15, 49, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#10b981"; // green buttons
      ctx.beginPath();
      ctx.arc(30, 54, 1.5, 0, Math.PI * 2);
      ctx.arc(38, 54, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 8. Interactive Gifting Flowers
    const flowers = [
      { name: "flower_rose", fill: "#f43f5e", center: "#be123c" }, // red rose
      { name: "flower_tulip", fill: "#c084fc", center: "#e9d5ff" }, // purple tulip
      { name: "flower_sunflower", fill: "#fbbf24", center: "#78350f" }, // gold sunflower
      { name: "flower_lily", fill: "#ffffff", center: "#fef08a" } // white lily
    ];
    flowers.forEach((f) => {
      this.drawCanvasTexture(f.name, 24, 24, (ctx) => {
        ctx.fillStyle = f.fill;
        // 5 petals
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5;
          const px = 12 + Math.cos(angle) * 6;
          const py = 12 + Math.sin(angle) * 6;
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Center core
        ctx.fillStyle = f.center;
        ctx.beginPath();
        ctx.arc(12, 12, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // 9. Particle textures
    // Fireflies (glow particle)
    this.drawCanvasTexture("part_firefly", 16, 16, (ctx) => {
      const grad = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
      grad.addColorStop(0, "rgba(253, 224, 71, 1)"); // Bright yellow center
      grad.addColorStop(0.3, "rgba(234, 179, 8, 0.4)");
      grad.addColorStop(1, "rgba(234, 179, 8, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
    });

    // Water Ripple (oval outline ring)
    this.drawCanvasTexture("part_ripple", 32, 16, (ctx) => {
      ctx.strokeStyle = "rgba(147, 197, 253, 0.5)"; // soft pastel blue outline
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(16, 8, 14, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Heart Emote
    this.drawCanvasTexture("part_heart", 24, 24, (ctx) => {
      ctx.fillStyle = "#fb7185"; // rose blush
      ctx.beginPath();
      ctx.moveTo(12, 6);
      ctx.bezierCurveTo(12, 3, 7, 1, 4, 4);
      ctx.bezierCurveTo(1, 7, 5, 13, 12, 20);
      ctx.bezierCurveTo(19, 13, 23, 7, 20, 4);
      ctx.bezierCurveTo(17, 1, 12, 3, 12, 6);
      ctx.closePath();
      ctx.fill();
    });

    // Coffee Steam Particle (wavy soft puff)
    this.drawCanvasTexture("part_steam", 16, 24, (ctx) => {
      const grad = ctx.createLinearGradient(8, 24, 8, 0);
      grad.addColorStop(0, "rgba(255,255,255,0.4)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.2)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      
      ctx.beginPath();
      ctx.moveTo(8, 24);
      ctx.bezierCurveTo(4, 18, 12, 12, 8, 0);
      ctx.lineTo(10, 0);
      ctx.bezierCurveTo(14, 12, 6, 18, 10, 24);
      ctx.closePath();
      ctx.fill();
    });

    // Raindrop
    this.drawCanvasTexture("part_raindrop", 8, 24, (ctx) => {
      const grad = ctx.createLinearGradient(4, 0, 4, 24);
      grad.addColorStop(0, "rgba(147, 197, 253, 0.1)");
      grad.addColorStop(1, "rgba(147, 197, 253, 0.6)");
      ctx.fillStyle = grad;
      ctx.fillRect(3, 0, 2, 24);
    });

    // 10. Mini-game specific assets
    // Bowling Pin
    this.drawCanvasTexture("bowling_pin", 16, 40, (ctx) => {
      ctx.fillStyle = "#f8fafc";
      // Pin body shape
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.bezierCurveTo(12, 0, 14, 16, 14, 30);
      ctx.bezierCurveTo(14, 36, 12, 40, 8, 40);
      ctx.bezierCurveTo(4, 40, 2, 36, 2, 30);
      ctx.bezierCurveTo(2, 16, 4, 0, 8, 0);
      ctx.closePath();
      ctx.fill();

      // Red neck bands (classic bowling aesthetic)
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(5, 10, 6, 3);
      ctx.fillRect(5, 15, 6, 2.5);
    });

    // Bowling Ball
    this.drawCanvasTexture("bowling_ball", 28, 28, (ctx) => {
      ctx.fillStyle = "#312e81"; // Indigo core ball
      ctx.beginPath();
      ctx.arc(14, 14, 14, 0, Math.PI * 2);
      ctx.fill();

      // Three white grip holes
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(10, 10, 2, 0, Math.PI * 2);
      ctx.arc(18, 10, 2, 0, Math.PI * 2);
      ctx.arc(14, 16, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Air Hockey Mallet
    this.drawCanvasTexture("hockey_mallet", 36, 36, (ctx) => {
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.arc(18, 18, 17, 0, Math.PI * 2);
      ctx.fill();

      // Bottom base plate (tinted in-game)
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(18, 18, 15, 0, Math.PI * 2);
      ctx.fill();

      // Center knob/handle
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(18, 18, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Air Hockey Puck
    this.drawCanvasTexture("hockey_puck", 24, 24, (ctx) => {
      ctx.fillStyle = "#f43f5e"; // bright glowing pink puck
      ctx.beginPath();
      ctx.arc(12, 12, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ffe4e6";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(12, 12, 6, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // Utility to create HTML5 canvas, render into it, and generate a Phaser texture key
  private drawCanvasTexture(
    key: string,
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D) => void
  ) {
    if (this.textures.exists(key)) return;

    const canvas = this.textures.createCanvas(key, width, height);
    if (!canvas) return;
    const ctx = canvas.getContext();
    if (!ctx) return;
    drawFn(ctx);
    canvas.refresh();
  }
}
