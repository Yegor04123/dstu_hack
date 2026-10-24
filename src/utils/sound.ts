let audioContext: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  audioContext ??= new window.AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function tone(frequency: number, duration: number, volume: number, offset = 0) {
  const context = getContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + offset;
  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

export function playIncoming(channel: "call" | "chat") {
  if (channel === "call") {
    tone(660, 0.16, 0.045);
    tone(880, 0.16, 0.04, 0.2);
  } else {
    tone(740, 0.12, 0.035);
    tone(980, 0.12, 0.03, 0.14);
  }
}

export function playTemperatureAlert() {
  tone(520, 0.1, 0.03);
  tone(390, 0.18, 0.035, 0.12);
}
