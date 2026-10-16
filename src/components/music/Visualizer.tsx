import { useEffect, useRef } from "react";
import { getAnalyser, useAudio } from "../../services/audio";
import { usePrefs } from "../../hooks/useData";
export default function Visualizer({ large = false }: { large?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const playing = useAudio((s) => s.playing);
  const p = usePrefs();
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    const reduced =
      p.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const values = new Uint8Array(64);
    const draw = () => {
      const analyser = getAnalyser();
      if (playing && !reduced && analyser)
        analyser.getByteFrequencyData(values);
      else values.fill(0);
      context.clearRect(0, 0, 400, 160);
      context.fillStyle = p.accent;
      for (let i = 0; i < 40; i++) {
        const height =
          playing && !reduced ? Math.max(4, (values[i + 2] / 255) * 145) : 5;
        context.globalAlpha = playing ? 0.65 : 0.3;
        context.beginPath();
        context.roundRect(i * 10 + 2, (160 - height) / 2, 4, height, 2);
        context.fill();
      }
      if (playing && !reduced) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [playing, p.accent, p.reducedMotion]);
  return (
    <canvas
      aria-label={playing ? "Live audio spectrum" : "Audio is paused"}
      ref={ref}
      width={400}
      height={160}
      className={"audio-spectrum " + (large ? "large-spectrum" : "")}
    />
  );
}
