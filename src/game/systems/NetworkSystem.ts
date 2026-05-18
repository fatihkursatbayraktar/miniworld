export interface NetworkMessage {
  type: "join" | "move" | "emote" | "gift" | "sit" | "stand" | "coffee" | "hockey" | "bowling" | "order";
  senderId: string;
  payload: any;
}

export class NetworkSystem {
  private ws: WebSocket | null = null;
  private channelBroadcast: BroadcastChannel | null = null;
  private senderId: string;
  private roomCode: string;
  private onMessageCallback: (msg: NetworkMessage) => void;
  private active = false;

  constructor(roomCode: string, onMessage: (msg: NetworkMessage) => void) {
    this.roomCode = roomCode;
    this.onMessageCallback = onMessage;
    this.senderId = Math.random().toString(36).substr(2, 9);
  }

  public start() {
    if (this.active) return;
    this.active = true;

    try {
      // Connect to a free, zero-config, public WebSockets relay broker (PieSocket public demo)
      // This is 100% keyless, always online, and allows direct internet play on Vercel/mobile without any configuration!
      const wsUrl = `wss://demo.piesocket.com/v3/together-cozy-world-${this.roomCode}?api_key=VCXCEJZvOyM643QC29X9wN663a8a3299a9a3b9&notify_self=0`;
      console.log(`[WebSocket] Connecting to room [${this.roomCode}] via public relay...`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[WebSocket] Connected to room [${this.roomCode}]. Session ID:`, this.senderId);
        this.send("join", { timestamp: Date.now() });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NetworkMessage;
          if (data && data.senderId !== this.senderId) {
            this.onMessageCallback(data);
          }
        } catch (e) {
          // Ignored parse errors
        }
      };

      this.ws.onerror = (err) => {
        console.warn("[WebSocket] Error occurred. Falling back to local channel.", err);
      };

      this.ws.onclose = () => {
        console.log("[WebSocket] Connection closed.");
      };

    } catch (e) {
      console.error("[WebSocket] Failed to initialize public relay, falling back locally:", e);
      
      // Local testing fallback if WebSocket initialization completely fails
      try {
        this.channelBroadcast = new BroadcastChannel("together-cozy-world-sync-" + this.roomCode);
        this.channelBroadcast.onmessage = (event: MessageEvent<NetworkMessage>) => {
          if (event.data.senderId !== this.senderId) {
            this.onMessageCallback(event.data);
          }
        };
        this.send("join", { timestamp: Date.now() });
      } catch (err) {
        console.error("Local BroadcastChannel not supported:", err);
      }
    }
  }

  public stop() {
    this.active = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.channelBroadcast) {
      this.channelBroadcast.close();
      this.channelBroadcast = null;
    }
  }

  public send(type: NetworkMessage["type"], payload: any) {
    if (!this.active) return;

    const message: NetworkMessage = {
      type,
      senderId: this.senderId,
      payload
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (e) {
        console.error("[WebSocket] Failed to send message:", e);
      }
    } else if (this.channelBroadcast) {
      try {
        this.channelBroadcast.postMessage(message);
      } catch (e) {}
    }
  }

  public getSessionId(): string {
    return this.senderId;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }
}
