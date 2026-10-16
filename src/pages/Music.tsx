import Visualizer from "../components/music/Visualizer";
import { useState } from "react";
import { useLibrary, playTrack, clearLibrary } from "../services/library";
import LibraryPlayer from "../components/music/LibraryPlayer";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CloudRain,
  Waves,
  Trees,
  Wind,
  Upload,
  Heart,
  Play,
  Pause,
  Headphones,
} from "lucide-react";
import { db, uid } from "../db";
import {
  useAudio,
  playAudio,
  stopAudio,
  setLevel,
  setSleep,
  sounds,
} from "../services/audio";
import { act, toast } from "../stores/ui";
import { PageHeading, Empty } from "../components/ui";
const presets: {
  name: string;
  icon: typeof CloudRain;
  levels: Record<string, number>;
}[] = [
  {
    name: "Rainy Library",
    icon: CloudRain,
    levels: { Rain: 0.65, "Brown noise": 0.2 },
  },
  { name: "Deep Forest", icon: Trees, levels: { Forest: 0.6, Wind: 0.2 } },
  {
    name: "Ocean Night",
    icon: Waves,
    levels: { Ocean: 0.6, "Pink noise": 0.2 },
  },
  {
    name: "Quiet Cafe",
    icon: Headphones,
    levels: { Cafe: 0.6, "Brown noise": 0.15 },
  },
];
export default function Music() {
  const audio = useAudio();
  const tracks = useLiveQuery(() => db.tracks.toArray()) ?? [];
  const mixes = useLiveQuery(() => db.mixes.toArray()) ?? [];
  const current = useLibrary((state) => state.id);
  const [playlist, setPlaylist] = useState("All tracks");
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const visible = tracks.filter(
    (t) =>
      playlist === "All tracks" ||
      (playlist === "Favorites" && t.favorite) ||
      (playlist === "Recently played" && t.lastPlayed > 0) ||
      t.playlist === playlist,
  );
  async function importFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("audio/")) {
        toast("Please choose audio files.");
        continue;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast("Each audio file must be under 100 MB.");
        continue;
      }
      await db.tracks.add({
        id: uid(),
        name: file.name,
        blob: file,
        favorite: false,
        lastPlayed: 0,
        playlist: "My library",
      });
    }
    toast("Audio imported into this browser.");
  }
  return (
    <>
      <PageHeading
        title="Music & Ambience"
        description="Build a soundscape. Find a little stillness."
      >
        <label className="button">
          <Upload size={17} />
          Import audio
          <input
            className="sr-only"
            type="file"
            accept="audio/*"
            multiple
            onChange={(e) => act(importFiles(e.target.files))}
          />
        </label>
      </PageHeading>
      <div className="sound-hero panel">
        <div>
          <span className="eyebrow">YOUR PERSONAL SOUNDSCAPE</span>
          <h2>
            A world outside
            <br />
            the noise.
          </h2>
          <p>Layer soft textures. Settle into your own rhythm.</p>
          <button
            className="primary"
            onClick={() => (audio.playing ? stopAudio() : act(playAudio()))}
          >
            {audio.playing ? <Pause size={18} /> : <Play size={18} />}{" "}
            {audio.playing ? "Pause soundscape" : "Play soundscape"}
          </button>
        </div>
        <Visualizer large />
      </div>
      {audio.error && (
        <p role="alert" className="warning">
          {audio.error}
        </p>
      )}
      <div className="four-grid">
        {presets.map(({ name, icon: Icon, levels }) => (
          <button
            className="preset panel"
            key={name}
            onClick={() => {
              useAudio.setState({ levels });
              act(playAudio());
            }}
          >
            <Icon size={30} />
            <strong>{name}</strong>
            <span>Synthesized texture</span>
          </button>
        ))}
      </div>
      <div className="two-grid">
        <section className="panel">
          <div className="section-heading">
            <h3>Ambient mixer</h3>
            <button
              onClick={() => {
                const name = prompt("Name your mix");
                if (name)
                  act(
                    db.mixes
                      .add({ id: uid(), name, levels: audio.levels })
                      .then(() => toast("Mix saved")),
                  );
              }}
            >
              Save mix
            </button>
          </div>
          <p className="small muted">
            Procedurally generated sound textures, not field recordings or
            streamed music. Soft instrumental is a sustained tonal drone.
          </p>
          {sounds.map((name) => (
            <label className="mixer-row" key={name}>
              <Wind size={16} />
              <span>{name}</span>
              <input
                aria-label={name + " volume"}
                type="range"
                min="0"
                max="1"
                step=".01"
                value={audio.levels[name] ?? 0}
                onChange={(e) => act(setLevel(name, Number(e.target.value)))}
              />
              <small>{Math.round((audio.levels[name] ?? 0) * 100)}%</small>
            </label>
          ))}
          <div className="row wrap">
            {mixes.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  useAudio.setState({ levels: m.levels });
                  act(playAudio());
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
          <label>
            Sleep timer
            <select
              value={sleepMinutes}
              onChange={(e) => {
                const n = Number(e.target.value);
                setSleepMinutes(n);
                setSleep(n);
                toast(
                  n
                    ? `Ambient sound will stop in ${n} minutes`
                    : "Sleep timer off",
                );
              }}
            >
              {[0, 15, 30, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n ? n + " minutes" : "Off"}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h3>Your audio library</h3>
            <button
              onClick={() => {
                const name = prompt("Playlist name");
                if (name && current)
                  act(db.tracks.update(current, { playlist: name }));
                else if (name)
                  toast("Select a track first, then create its playlist.");
              }}
            >
              Create playlist
            </button>
          </div>
          <select
            aria-label="Playlist"
            value={playlist}
            onChange={(e) => setPlaylist(e.target.value)}
          >
            {[
              "All tracks",
              "Favorites",
              "Recently played",
              ...new Set(tracks.map((t) => t.playlist)),
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          {visible.map((t) => (
            <div className="track-row" key={t.id}>
              <button
                className="icon"
                aria-label={"Play " + t.name}
                onClick={() => {
                  act(
                    playTrack(
                      t.id,
                      visible.map((track) => track.id),
                    ),
                  );
                }}
              >
                <Play size={17} />
              </button>
              <span>{t.name}</span>
              <button
                className={"icon " + (t.favorite ? "accent" : "")}
                aria-label={"Favorite " + t.name}
                onClick={() =>
                  act(db.tracks.update(t.id, { favorite: !t.favorite }))
                }
              >
                <Heart size={17} />
              </button>
              <button
                className="icon"
                aria-label={"Delete " + t.name}
                onClick={() => {
                  if (confirm("Remove this audio file?")) {
                    if (current === t.id) {
                      clearLibrary();
                    }
                    act(db.tracks.delete(t.id));
                  }
                }}
              >
                ×
              </button>
            </div>
          ))}
          {!visible.length && (
            <Empty
              title="Your own listening room"
              body="Import audio you have permission to use. Files stay in this browser."
            />
          )}
          <LibraryPlayer />
        </section>
      </div>
    </>
  );
}
