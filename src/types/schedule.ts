import { AnimeItem } from "./anime";

export interface ScheduleAnimeItem extends AnimeItem {
    day: string;
    episode: number;
    airingAt: number;
    airingTime: string;
}

export interface ScheduleDayCount {
    day: string;
    count: number;
}

export interface ScheduleResponse {
    days: ScheduleDayCount[];
    animes: ScheduleAnimeItem[];
}