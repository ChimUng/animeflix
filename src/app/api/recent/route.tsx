// src/app/api/recent/route.ts
import axios from "axios";
import { redis } from "@/lib/rediscache";
import { NextResponse } from "next/server";
import { AnimeItem } from "@/lib/types";

axios.interceptors.request.use(config => {
  config.timeout = 9000;
  return config;
});

interface EpisodeItem {
  id: string;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  status: string;
  format: string;
  currentEpisode: number;
  totalEpisodes?: number;
  coverImage: {
    large?: string;
    medium?: string;
  };
  episodes?: {
    data?: Array<{
      providerId: string;
      episodes: Array<{
        id: string;
        number: number;
      }>;
    }>;
  };
}

export interface RecentEpisode {
  id: string;
  title: EpisodeItem['title'];
  status: string;
  format: string;
  totalEpisodes?: number | null;
  currentEpisode: number;
  coverImage: EpisodeItem['coverImage'];
  latestEpisode: string;
  genres?: string[];
}

interface ConsumetEpisodeItem {
  id: string;
  title: string;
  image: string;
  episodeId: string;
  episodeNumber: number;
}


async function fetchRecent(): Promise<RecentEpisode[]> {
  try {
    const { data } = await axios.post<EpisodeItem[]>(
      `https://api.anify.tv/recent?type=anime&page=1&perPage=20&fields=[id,title,status,format,currentEpisode,coverImage,episodes,totalEpisodes]`
    );

    const mappedData: RecentEpisode[] = data.map((i) => {
      const episodesData = i?.episodes?.data;
      const getEpisodes = episodesData?.find(x => x.providerId === "gogoanime") || episodesData?.[0];
      const getEpisode = getEpisodes?.episodes?.find(x => x.number === i.currentEpisode);

      return {
        id: i.id,
        title: i.title,
        status: i.status,
        format: i.format,
        totalEpisodes: i.totalEpisodes,
        currentEpisode: i.currentEpisode,
        coverImage: i.coverImage,
        latestEpisode: getEpisode?.id ? getEpisode.id.substring(1) : '',
      };
    });

    return mappedData;
  } catch (error) {
    console.error("Error fetching Recent Episodes:", error);
    return [];
  }
}

async function fetchRecentFromConsumet(): Promise<RecentEpisode[]> {
  try {
    const { data } = await axios.get<{ results: ConsumetEpisodeItem[] }>(
      `http://localhost:4000/anime/gogoanime/top-airing?page=1`
    );

    console.log("✅ Received data from Consumet:", data);

    return data.results.map((i) => ({
      id: i.id,
      latestEpisode: i.episodeId,
      title: { romaji: i.title },
      status: "Unknown",
      format: "TV",
      totalEpisodes: null,
      currentEpisode: i.episodeNumber,
      coverImage: { medium: i.image },
    }));
  } catch (error) {
    console.error("❌ Error fetching from Consumet fallback:", error);
    return [];
  }
}

export async function fetchRecentFromAnilist(): Promise<RecentEpisode[]> {
  const query = `
    query {
      Page(page: 1, perPage: 20) {
        media(sort: TRENDING_DESC, type: ANIME, status: RELEASING) {
          id
          title {
            romaji
            english
          }
          coverImage {
            medium
            large
          }
          episodes
          nextAiringEpisode {
            episode
            airingAt
          }
          status
          format
        }
      }
    }
  `;

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store"
  });

  const json = await res.json();

  return json.data.Page.media.map((item: AnimeItem) => ({
    id: item.id.toString(),
    title: item.title,
    coverImage: item.coverImage,
    status: item.status,
    format: item.format,
    currentEpisode: item.nextAiringEpisode?.episode ? item.nextAiringEpisode.episode - 1 : null,
    totalEpisodes: item.episodes,
    latestEpisode: item.nextAiringEpisode?.episode?.toString() || "1",
  }));
}

export const GET = async () => {
  let cached: string | null = null;

  if (redis) {
    console.log("using redis");
    cached = await redis.get("recent");
  }

  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }  let data = [];

    try {
    data = await fetchRecent();
    // console.log("Fetched recent from Anify");
    // console.log("Recent Episodes Data:", data);
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error fetching from Anify:", err.message);
    console.log("⏪ Falling back to Consumet...");
    try {
      data = await fetchRecentFromConsumet();
    } catch (fallbackError) {
      const fallbackErr = fallbackError as Error;
      console.error("❌ Fallback to Consumet failed:", fallbackErr.message);
      return NextResponse.json({ message: "Recent Episodes not available" });
    }
  }
  try {
    data = await fetchRecentFromAnilist();
    console.log("Fetched recent from Anilist");
  } catch (error) {
    console.error("Anilist failed. Falling back to AniList...", error);
    data = await fetchRecentFromAnilist();
  }

  if (data && data.length > 0 && redis) {
    await redis.set("recent", JSON.stringify(data), "EX", 60 * 60); // 1h cache
  }

  return NextResponse.json(data);
};