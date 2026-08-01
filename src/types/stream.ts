import type { Session } from "next-auth";
import type { AnimeItem } from "./anime";
import type { EpisodeInfo } from "./episode";

export interface SavedEpisode {
  timeWatched: number;
}

export interface SkipTime {
  startTime: number;
  endTime: number;
  text: "Opening" | "Ending";
}

export interface GroupedEp {
  previousep?: EpisodeInfo;
  currentep?: EpisodeInfo;
  nextep?: EpisodeInfo;
}

export interface AniSkipInterval {
  startTime: number;
  endTime: number;
}

export interface AniSkipResult {
  skipType: "op" | "ed";
  interval: AniSkipInterval;
}

export interface AniSkipResponse {
  found: boolean;
  results: AniSkipResult[];
}

// ── Route watch/[...watchid] ────────────────────────────────────────────────
// URL shape: /anime/watch/{id}/{provider}/{epid đã encodeURIComponent}/{epnum}/{type}
export interface WatchRouteParams {
  id: string;
  provider: string;
  epId: string;
  epNum: string;
  subdub: string;
}

// ── PlayerComponent props ───────────────────────────────────────────────────
export interface PlayerComponentProps {
  id: string;
  epId: string;
  provider: string;
  epNum: string;
  subdub: string;
  data: AnimeItem | null;
  session: Session | null;
  savedep: SavedEpisode[];
}

export type ServerType = "sub" | "dub" | "hsub";

export interface ServerOption {
  key: string; 
  label: string; 
  type: ServerType;
  supported: boolean;
  raw: string;
}

export interface ServerListResponse {
  providerId: string;
  episodeId: string;
  servers: ServerOption[];
}
