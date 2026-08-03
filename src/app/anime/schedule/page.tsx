import React from "react";
import { Metadata } from "next";
import Navbarcomponent from "@/components/navbar/Navbar";
import Schedule from "@/components/schedule/Schedule";
import { WeeklyScheduleAnilist } from "@/lib/Anilistfunctions";
import { redis } from "@/lib/rediscache";
import { ScheduleAnimeItem, ScheduleResponse } from "@/types/schedule";

const daysOfWeekVi = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
const CACHE_KEY = "schedule:weekly";
const CACHE_TTL = 60 * 60; // 1h

function transformSchedules(schedules: any[]): ScheduleResponse {
    const dayCountMap = new Map<string, number>();
    const animes: ScheduleAnimeItem[] = [];

    for (const item of schedules) {
        if (!item?.media?.id) continue;
        const dayIndex = new Date(item.airingAt * 1000).getDay();
        const day = daysOfWeekVi[dayIndex];
        dayCountMap.set(day, (dayCountMap.get(day) || 0) + 1);

        animes.push({
            ...item.media,
            day,
            episode: item.episode,
            airingAt: item.airingAt,
            airingTime: new Date(item.airingAt * 1000).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
            }),
        });
    }

    const days = daysOfWeekVi.map((day) => ({ day, count: dayCountMap.get(day) || 0 }));
    return { days, animes };
}

async function getSchedule(): Promise<ScheduleResponse> {
    try {
        if (redis) {
            const cachedData = await redis.get(CACHE_KEY);
            const parsedData = cachedData ? JSON.parse(cachedData) : null;

            if (!parsedData) {
                await redis.del(CACHE_KEY);
            } else {
                return parsedData;
            }
        }

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const from = Math.floor(startOfWeek.getTime() / 1000);
        const to = Math.floor(endOfWeek.getTime() / 1000);

        const schedules = await WeeklyScheduleAnilist(from, to);
        const result = transformSchedules(schedules);

        if (redis && result.animes.length > 0) {
            await redis.set(CACHE_KEY, JSON.stringify(result), "EX", CACHE_TTL);
        }

        return result;
    } catch (error) {
        console.error("Error fetching schedule:", error);
        return { days: [], animes: [] };
    }
}

export const metadata: Metadata = {
    title: "Lịch chiếu Anime | Animeflix",
    description: "Cập nhật lịch chiếu anime mới nhất theo từng ngày trong tuần, không bỏ lỡ tập mới nào.",
    alternates: { canonical: "/anime/schedule" },
    openGraph: {
        type: "website",
        siteName: "Animeflix",
        locale: "vi_VN",
        title: "Lịch chiếu Anime",
        description: "Cập nhật lịch chiếu anime mới nhất theo từng ngày trong tuần.",
    },
};


export default async function Page() {
    const data = await getSchedule();

    return (
        <div>
            <Navbarcomponent />
            <Schedule initialDays={data.days} initialAnimes={data.animes} />
        </div>
    );
}