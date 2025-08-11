import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const daysMap = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// Tính timestamp cho ngày cụ thể
function getDayTimestampRange(day: string): { start: number; end: number } {
  const now = new Date();
  const todayIndex = now.getDay();
  const targetIndex = daysMap.indexOf(day.toLowerCase());
  const offset = (targetIndex - todayIndex + 7) % 7;

  const targetDate = new Date();
  targetDate.setDate(now.getDate() + offset);
  targetDate.setHours(0, 0, 0, 0);

  const start = Math.floor(targetDate.getTime() / 1000);
  const end = start + 86400;

  return { start, end };
}

export async function GET(req: NextRequest) {
  const day = req.nextUrl.searchParams.get("day") || "sunday";
  const { start, end } = getDayTimestampRange(day);

    const query = `
    query ($start: Int, $end: Int) {
      Page(perPage: 100) {
        airingSchedules(
          airingAt_greater: $start
          airingAt_lesser: $end
          sort: [TIME]
        ) {
          airingAt
          episode
          media {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
            }
            description
            siteUrl
            format
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      "https://graphql.anilist.co",
      { query, variables: { start, end } },
      { headers: { "Content-Type": "application/json" } }
    );

    const schedules = response.data?.data?.Page?.airingSchedules || [];

    const formatted = schedules.map((item: any) => {
    const title = item.media.title;
    return {
      id: item.media.id,
      title: {
        romaji: title.romaji,
        english: title.english,
        native: title.native,
      },
      episode: item.episode,
      airingTime: new Date(item.airingAt * 1000).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      coverImage: item.media.coverImage.large,
      description: item.media.description,
      siteUrl: item.media.siteUrl,
      format: item.media.format,
    };
  });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("❌ Error fetching schedule:", error);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}
