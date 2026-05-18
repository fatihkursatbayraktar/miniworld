// Procedural Cozy Audio Synthesizer - Muted Mock Version
// This mock class completely disables Web Audio API sound outputs while keeping method signatures intact.
 
class CozyAudioEngine {
  constructor() {}
 
  public init() {}
  public startRain() {}
  public stopRain() {}
  public setRainVolume(vol: number) {}
  public startRiver() {}
  public stopRiver() {}
  public setRiverVolume(vol: number) {}
  public startPiano() {}
  public stopPiano() {}
  public setPianoVolume(vol: number) {}
  public playChime() {}
  public playClick() {}
  public playCuteBubble() {}
  public playGiftBell() {}
  public activateAutoChimes() {}
  public stopAutoChimes() {}
}
 
export const cozyAudio = new CozyAudioEngine();
