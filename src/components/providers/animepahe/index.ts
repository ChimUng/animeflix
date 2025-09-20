import Provider, { type ProviderName } from '../generic';
// import { redis } from '@/lib/rediscache';
import { load } from 'cheerio';
import { MalSync } from '@/lib/malsync';
import { extractSource } from './kwik';
import { getHlsDuration } from '../utils';
import axios from 'axios';
import { getDurationFromString } from './utils';

// Export các type để sử dụng ở route.tsx
export interface AnimePaheEpisodeInfo {
  duration: string; // 00:25:43
  session: string;
  title?: string;
  episode: number;
  snapshot?: string; // Thêm snapshot
  filler?: number; // Thêm filler
  audio?: string; // Thêm audio
}

export type AnimePaheEpisodes = {
  current_page: number;
  data: AnimePaheEpisodeInfo[];
  last_page: number;
};

export default class AnimePahe extends Provider {
  public identifier: ProviderName = 'animepahe';
  private baseUrl = 'https://animepahe.ru/';
  public malSyncId = 'animepahe';
  private client = axios.create({ 
    baseURL: this.baseUrl,
    headers: {
        'Referer': 'https://animepahe.ru/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    }
  });

  async getProviderId(): Promise<string> {
    const int_id = await MalSync.getProviderId(this.malId, 'animepahe');
    const originialresp = await this.client.get(`/a/${int_id}`);
    const id = originialresp.request.res.responseUrl.split('/').at(-1);
    return id;
  }

  async getEpisodes(page: number) {
    const id = await this.getId();
    console.log(id);
    const response = await this.client.get<AnimePaheEpisodes>(`/api`, {
      maxRedirects: 1,
      params: {
        m: 'release',
        sort: 'episode_asc',
        page,
        id
      }
    });

    console.log(response.data);

    return response.data.data.map((ep) => ({
      id: ep.session,
      title: ep.title,
      number: ep.episode,
      length: getDurationFromString(ep.duration),
      snapshot: ep.snapshot, // Thêm snapshot
      filler: ep.filler, // Thêm filler
      audio: ep.audio // Thêm audio
    }));
  }

  async getSourceInfo(
    episodeId: string,
    getLength = true
  ): Promise<{ url: string; length: number }> {
    const animeId = await this.getId();
    const url = `/play/${animeId}/${episodeId}`;
    const resp = await this.client.get(url);
    const $ = load(resp.data);

    const sources = $('#resolutionMenu > button')
      .map((index, elem) => {
        const elem$ = $(elem);
        return {
          src: elem$.data('src') as string,
          resolution: elem$.data('resolution') as number,
          audio: elem$.data('audio') as 'jpn' | 'eng'
        };
      })
      .toArray();

    const bestSubSource = sources
      .filter((src) => src.audio === 'jpn')
      .sort((src1, src2) => src2.resolution - src1.resolution)[0];

    const src = ((await extractSource(bestSubSource.src)) as string).replace('.cache', '.files');

    if (!getLength) return { url: src, length: 0 };

    const length = await getHlsDuration(src, false);

    return { url: src, length };
  }
}