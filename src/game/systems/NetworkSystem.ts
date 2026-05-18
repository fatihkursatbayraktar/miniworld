import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface NetworkMessage {
  type: "join" | "move" | "emote" | "gift" | "sit" | "stand" | "coffee" | "hockey" | "bowling" | "order";
  senderId: string;
  payload: any;
}

export class NetworkSystem {
  private channelBroadcast: BroadcastChannel | null = null;
  private supabase: SupabaseClient | null = null;
  private channelSupabase: any = null;
  
  private senderId: string;
  private roomCode: string;
  private onMessageCallback: (msg: NetworkMessage) => void;
  private active = false;
  private useSupabase = false;

  constructor(roomCode: string, onMessage: (msg: NetworkMessage) => void) {
    this.roomCode = roomCode;
    this.onMessageCallback = onMessage;
    this.senderId = Math.random().toString(36).substr(2, 9);

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Check if real credentials are provided
    if (sbUrl && sbKey && !sbUrl.includes("your-project") && !sbKey.includes("your-anon-key")) {
      this.useSupabase = true;
      try {
        this.supabase = createClient(sbUrl, sbKey);
      } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
        this.useSupabase = false;
      }
    }
  }

  public start() {
    if (this.active) return;
    this.active = true;

    if (this.useSupabase && this.supabase) {
      try {
        this.channelSupabase = this.supabase.channel("together-cozy-room-" + this.roomCode, {
          config: {
            broadcast: { self: false }
          }
        });

        this.channelSupabase
          .on("broadcast", { event: "sync" }, (response: any) => {
            const data = response.payload as NetworkMessage;
            if (data && data.senderId !== this.senderId) {
              this.onMessageCallback(data);
            }
          })
          .subscribe((status: string) => {
            if (status === "SUBSCRIBED") {
              console.log(`[Supabase Realtime] Connected to room [${this.roomCode}]. Session ID:`, this.senderId);
              // Broadcast join!
              this.send("join", { timestamp: Date.now() });
            }
          });
      } catch (e) {
        console.error("[Supabase Realtime] Error subscribing to channel:", e);
      }
    } else {
      try {
        console.log(`[BroadcastChannel] Graceful fallback. Connected to room [${this.roomCode}]. Session ID:`, this.senderId);
        this.channelBroadcast = new BroadcastChannel("together-cozy-world-sync-" + this.roomCode);
        this.channelBroadcast.onmessage = (event: MessageEvent<NetworkMessage>) => {
          if (event.data.senderId !== this.senderId) {
            this.onMessageCallback(event.data);
          }
        };
        this.send("join", { timestamp: Date.now() });
      } catch (e) {
        console.error("Local BroadcastChannel not supported:", e);
      }
    }
  }

  public stop() {
    this.active = false;
    if (this.channelBroadcast) {
      this.channelBroadcast.close();
      this.channelBroadcast = null;
    }
    if (this.channelSupabase) {
      this.channelSupabase.unsubscribe();
      this.channelSupabase = null;
    }
  }

  public send(type: NetworkMessage["type"], payload: any) {
    if (!this.active) return;

    const message: NetworkMessage = {
      type,
      senderId: this.senderId,
      payload
    };

    if (this.useSupabase && this.channelSupabase) {
      this.channelSupabase.send({
        type: "broadcast",
        event: "sync",
        payload: message
      });
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
