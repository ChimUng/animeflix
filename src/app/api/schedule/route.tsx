import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { redis } from "@/lib/rediscache";

interface Anime {
  day: string; 
  [key: string]: any
}

const daysMap = [
  "sunday","monday","tuesday","wednesday","thursday","friday","saturday",
];

function getWeekTimestampRange() {
  const now = new Date();
  const day = now.getDay(); // 0=CN, 1=T2
  const mondayOffset = (day === 0 ? -6 : 1 - day);
  const sundayOffset = 7 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(now);
  sunday.setDate(now.getDate() + sundayOffset);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: Math.floor(monday.getTime() / 1000),
    end: Math.floor(sunday.getTime() / 1000),
  };
}

function getDayNameFromTimestamp(ts: number) {
  const date = new Date(ts * 1000);
  return daysMap[date.getDay()];
}

export async function GET(req: NextRequest) {
  const cacheKey = "schedule:week";

  try {
    // 1️⃣ Check cache
    if (redis) {
      console.log("use redis");
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(JSON.parse(cached));
    }

    // 2️⃣ Fetch AniList data
    const { start, end } = getWeekTimestampRange();
    const query = `
      query ($start: Int, $end: Int) {
        Page(perPage: 500) {
          airingSchedules(
            airingAt_greater: $start
            airingAt_lesser: $end
            sort: [TIME]
          ) {
            airingAt
            episode
            media {
              id
              title { romaji english native }
              coverImage { large }
              description
              siteUrl
              format
            }
          }
        }
      }
    `;

    const response = await axios.post(
      "https://graphql.anilist.co",
      { query, variables: { start, end } },
      { headers: { "Content-Type": "application/json" } }
    );

    const schedules = response.data?.data?.Page?.airingSchedules || [];

    const animes = schedules.map((item: any) => {
      const title = item.media.title;
      return {
        id: item.media.id,
        title: {
          romaji: title.romaji,
          english: title.english,
          native: title.native,
        },
        episode: item.episode,
        airingAt: item.airingAt,
        airingTime: new Date(item.airingAt * 1000).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        coverImage: item.media.coverImage.large,
        description: item.media.description,
        siteUrl: item.media.siteUrl,
        format: item.media.format,
        day: getDayNameFromTimestamp(item.airingAt),
      };
    });

    // 3️⃣ Gom nhóm để tính count theo ngày
    const counts = daysMap.map((day) => ({
    day,
    count: animes.filter((a: Anime) => a.day === day).length,
  }));

    const result = { days: counts, animes };

    // 4️⃣ Cache 24 tiếng
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(result), "EX", 60 * 60 * 24);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error fetching schedule:", error);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}
