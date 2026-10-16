import { create } from "zustand";
import { db } from "../db";
import { toast } from "../stores/ui";
interface LibraryState {
  id: string;
  name: string;
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  loop: boolean;
  shuffle: boolean;
  queue: string[];
}
export const useLibrary = create<LibraryState>(() => ({
  id: "",
  name: "",
  playing: false,
  position: 0,
  duration: 0,
  volume: 0.7,
  muted: false,
  loop: false,
  shuffle: false,
  queue: [],
}));
let player: HTMLAudioElement | undefined;
let url = "";
function getPlayer() {
  if (player) return player;
  player = new Audio();
  player.volume = 0.7;
  player.addEventListener("timeupdate", () =>
    useLibrary.setState({ position: player!.currentTime }),
  );
  player.addEventListener("loadedmetadata", () =>
    useLibrary.setState({
      duration: Number.isFinite(player!.duration) ? player!.duration : 0,
    }),
  );
  player.addEventListener("play", () => useLibrary.setState({ playing: true }));
  player.addEventListener("pause", () =>
    useLibrary.setState({ playing: false }),
  );
  player.addEventListener("error", () =>
    toast("This imported audio could not be decoded. Try MP3, WAV, or OGG."),
  );
  player.addEventListener("ended", () => {
    const s = useLibrary.getState();
    const index = s.shuffle
      ? Math.floor(Math.random() * s.queue.length)
      : (s.queue.indexOf(s.id) + 1) % s.queue.length;
    const id = s.queue[index];
    if (id) void playTrack(id, s.queue).catch((e) => toast(String(e)));
  });
  return player;
}
export async function playTrack(id: string, queue?: string[]) {
  const track = await db.tracks.get(id);
  if (!track) throw Error("Track no longer exists.");
  const audio = getPlayer();
  audio.pause();
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(track.blob);
  audio.src = url;
  useLibrary.setState({
    id,
    name: track.name,
    position: 0,
    queue: queue ?? useLibrary.getState().queue,
  });
  await audio.play();
  await db.tracks.update(id, { lastPlayed: Date.now() });
}
export async function toggleLibrary() {
  if (!player) return;
  if (player.paused) await player.play();
  else player.pause();
}
export function pauseLibrary() {
  player?.pause();
}
export function seekLibrary(seconds: number) {
  if (player)
    player.currentTime = Math.min(
      useLibrary.getState().duration,
      Math.max(0, seconds),
    );
}
export function configureLibrary(
  patch: Partial<Pick<LibraryState, "volume" | "muted" | "loop" | "shuffle">>,
) {
  useLibrary.setState(patch);
  if (player) {
    const s = useLibrary.getState();
    player.volume = s.volume;
    player.muted = s.muted;
    player.loop = s.loop;
  }
}
export function clearLibrary() {
  player?.pause();
  if (player) {
    player.removeAttribute("src");
    player.load();
  }
  if (url) URL.revokeObjectURL(url);
  url = "";
  useLibrary.setState({
    id: "",
    name: "",
    playing: false,
    position: 0,
    duration: 0,
  });
}
window.addEventListener("pagehide", clearLibrary);
