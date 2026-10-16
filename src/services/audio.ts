import { create } from "zustand";
import { pauseLibrary } from "./library";
export const sounds = [
  "Brown noise",
  "Pink noise",
  "White noise",
  "Rain",
  "Ocean",
  "Wind",
  "Forest",
  "Fireplace",
  "Cafe",
  "Thunderstorm",
  "Soft instrumental",
  "Lo-fi study",
] as const;
export const useAudio = create<{
  playing: boolean;
  levels: Record<string, number>;
  error: string;
}>(() => ({
  playing: false,
  levels: { "Brown noise": 0.3, Rain: 0.25 },
  error: "",
}));
let context: AudioContext | undefined;
let analyser: AnalyserNode | undefined;
let generation = 0;
const layers = new Map<
  string,
  { source: AudioBufferSourceNode; gain: GainNode }
>();
let sleep: ReturnType<typeof setTimeout> | undefined;
const buffers = new Map<string, AudioBuffer>();
export const getAnalyser = () => analyser;
function synthesize(name: string, ctx: AudioContext) {
  const cached = buffers.get(name);
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 8, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  let brown = 0,
    b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const time = i / ctx.sampleRate,
      white = Math.random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    const pink = (b0 + b1 + b2 + white * 0.1848) * 0.05;
    let sample = brown * 3.5;
    switch (name) {
      case "White noise":
        sample = white * 0.65;
        break;
      case "Pink noise":
        sample = pink;
        break;
      case "Rain":
        sample = white * 0.25 + pink * 0.7;
        break;
      case "Ocean":
        sample = pink * (0.5 + 0.45 * Math.sin((time * Math.PI) / 4));
        break;
      case "Wind":
        sample = brown * 3 * (0.6 + 0.3 * Math.sin((time * Math.PI) / 2));
        break;
      case "Forest":
        sample =
          brown * 0.8 +
          Math.sin(2 * Math.PI * (1800 + 400 * Math.sin(time * 12)) * time) *
            Math.max(0, Math.sin(time * Math.PI * 2)) ** 20 *
            0.1;
        break;
      case "Fireplace":
        sample = brown * 2 + (Math.random() > 0.999 ? white * 0.9 : 0);
        break;
      case "Cafe":
        sample =
          pink * 0.5 +
          Math.sin(2 * Math.PI * 180 * time) *
            (0.08 + 0.04 * Math.sin(time * 6));
        break;
      case "Thunderstorm":
        sample =
          white * 0.12 +
          brown * 4 * Math.max(0.1, Math.sin((time * Math.PI) / 4)) ** 4;
        break;
      case "Soft instrumental":
        sample =
          (Math.sin(2 * Math.PI * 174.625 * time) +
            Math.sin(2 * Math.PI * 220 * time) +
            Math.sin(2 * Math.PI * 261.625 * time)) *
          0.06 *
          (0.6 + 0.4 * Math.sin((time * Math.PI) / 4) ** 2);
        break;
      case "Lo-fi study": {
        const beat = time % 0.75;
        sample =
          Math.sin(2 * Math.PI * (65 + 80 * Math.exp(-beat * 35)) * time) *
            Math.exp(-beat * 18) *
            0.35 +
          pink * 0.1 +
          Math.sin(
            2 *
              Math.PI *
              [174.625, 220, 261.625, 220][Math.floor(time * 2) % 4] *
              time,
          ) *
            0.07;
        break;
      }
    }
    const edge = Math.min(1, i / 300, (samples.length - i) / 300);
    samples[i] = Math.max(-1, Math.min(1, sample)) * edge;
  }
  buffers.set(name, buffer);
  return buffer;
}
function createLayer(name: string, volume: number) {
  if (!context || !analyser) return;
  const source = context.createBufferSource();
  source.buffer = synthesize(name, context);
  source.loop = true;
  const gain = context.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(volume * 0.3, context.currentTime + 0.3);
  source.connect(gain).connect(analyser);
  source.start();
  layers.set(name, { source, gain });
}
export function stopAudio() {
  generation++;
  for (const layer of layers.values()) {
    if (context) {
      layer.gain.gain.cancelScheduledValues(context.currentTime);
      layer.gain.gain.setTargetAtTime(0, context.currentTime, 0.08);
    }
    setTimeout(() => {
      try {
        layer.source.stop();
      } catch {
        /* already stopped */
      }
      layer.source.disconnect();
      layer.gain.disconnect();
    }, 350);
  }
  layers.clear();
  useAudio.setState({ playing: false });
}
export async function playAudio() {
  stopAudio();
  const attempt = generation;
  try {
    context ??= new AudioContext();
    if (!analyser) {
      analyser = context.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyser.connect(context.destination);
    }
    await context.resume();
    if (attempt !== generation) return;
    if (context.state !== "running")
      throw Error("Audio is unavailable. Press play to retry.");
    for (const [name, volume] of Object.entries(useAudio.getState().levels))
      if (volume > 0) createLayer(name, volume);
    useAudio.setState({ playing: true, error: "" });
  } catch (error) {
    stopAudio();
    useAudio.setState({
      error:
        error instanceof Error ? error.message : "Audio device unavailable",
    });
  }
}
export async function setLevel(name: string, value: number) {
  const level = Math.max(0, Math.min(1, value));
  useAudio.setState((s) => ({ levels: { ...s.levels, [name]: level } }));
  if (!useAudio.getState().playing || !context) return;
  const layer = layers.get(name);
  if (layer)
    layer.gain.gain.setTargetAtTime(level * 0.3, context.currentTime, 0.08);
  else if (level > 0) createLayer(name, level);
}
export function setSleep(minutes: number) {
  clearTimeout(sleep);
  if (minutes > 0)
    sleep = setTimeout(() => {
      stopAudio();
      pauseLibrary();
    }, minutes * 60000);
}
export function chime(volume = 0.5) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(Math.max(0.001, volume * 0.15), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
      void ctx.close();
    }, 700);
  } catch {
    /* optional sound */
  }
}
window.addEventListener("pagehide", () => {
  stopAudio();
  clearTimeout(sleep);
  void context?.close();
  context = undefined;
  analyser = undefined;
  buffers.clear();
});
