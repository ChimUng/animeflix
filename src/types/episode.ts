import { AnimeItem } from './anime';

export interface RecentEpisode extends AnimeItem {
    currentEpisode: number;
    airingAt: number;
}