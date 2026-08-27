let ctx: AudioContext | null = null;
let unlocked = false;

export function unlockAudio() {
    if (!ctx) ctx = new AudioContext();
    ctx.resume();
    // play a silent blip — this is what actually "unlocks" audio on mobile
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
    unlocked = true;
    localStorage.setItem("orbit_audio_unlocked", "1");
}

export function isUnlocked() {
    return unlocked || localStorage.getItem("orbit_audio_unlocked") === "1";
}

export function getAudioContext(): AudioContext {
    if (!ctx) ctx = new AudioContext();
    ctx.resume();
    return ctx;
}