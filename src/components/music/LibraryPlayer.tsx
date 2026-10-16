import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import {
  useLibrary,
  toggleLibrary,
  seekLibrary,
  configureLibrary,
} from "../../services/library";
import { clockTime } from "../../hooks/useTimer";
import { act } from "../../stores/ui";
export default function LibraryPlayer() {
  const s = useLibrary();
  if (!s.id) return null;
  return (
    <div className="library-player">
      <h4>{s.name}</h4>
      <div className="row">
        <button
          aria-label="Toggle imported audio"
          onClick={() => act(toggleLibrary())}
        >
          {s.playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <span>{clockTime(s.position)}</span>
        <input
          aria-label="Seek audio"
          type="range"
          min="0"
          max={s.duration || 1}
          step=".1"
          value={s.position}
          onChange={(e) => seekLibrary(Number(e.target.value))}
        />
        <span>{clockTime(s.duration)}</span>
      </div>
      <div className="row">
        <button
          className="icon"
          aria-label="Mute imported audio"
          onClick={() => configureLibrary({ muted: !s.muted })}
        >
          {s.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <input
          aria-label="Imported audio volume"
          type="range"
          min="0"
          max="1"
          step=".01"
          value={s.volume}
          onChange={(e) => configureLibrary({ volume: Number(e.target.value) })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={s.loop}
            onChange={(e) => configureLibrary({ loop: e.target.checked })}
          />
          Loop
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.shuffle}
            onChange={(e) => configureLibrary({ shuffle: e.target.checked })}
          />
          Shuffle
        </label>
      </div>
    </div>
  );
}
