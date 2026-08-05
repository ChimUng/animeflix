import { NextResponse } from "next/server";
import { redis } from "@/lib/rediscache";
import { RecentEpisode } from '@/types/episode';

export const recentlyAired = `
  query($page: Int, $perPage: Int, $airingAtLesser: Int) {
    Page(page: $page, perPage: $perPage) {
      airingSchedules(airingAt_lesser: $airingAtLesser, sort: TIME_DESC) {
        episode
        airingAt
        media {
          id
          idMal
          title { romaji english userPreferred }
          coverImage { large extraLarge color }
          bannerImage
          episodes
          status
          duration
          genres
          season
          seasonYear
          format
          averageScore
          popularity
          startDate { year month day }
          endDate { year month day }
          nextAiringEpisode { airingAt episode }
        }
      }
    }
  }
`;

const CACHE_KEY = "recent";
const CACHE_TTL = 60 * 60; // 1 hour

async function fetchRecentFromAnilist(): Promise<RecentEpisode[]> {
  const now = Math.floor(Date.now() / 1000);
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: recentlyAired, variables: { page: 1, perPage: 50, airingAtLesser: now } }),
    cache: "no-store",
  });
  const json = await res.json();
  const schedules = json?.data?.Page?.airingSchedules ?? [];

  const seen = new Set<number>();
  const result: RecentEpisode[] = [];
  for (const item of schedules) {
    if (!item?.media?.id || seen.has(item.media.id)) continue;
    seen.add(item.media.id);
    result.push({ ...item.media, currentEpisode: item.episode, airingAt: item.airingAt });
    if (result.length === 10) break;
  }
  return result;
}

export async function GET() {
  try {
    if (redis) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return NextResponse.json(JSON.parse(cached));
    }

    const data = await fetchRecentFromAnilist();

    if (redis && data.length > 0) {
      await redis.set(CACHE_KEY, JSON.stringify(data), "EX", CACHE_TTL);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Error fetching recent episodes:", error);
    return NextResponse.json([]);
  }
}