"use client";

import { useState } from "react";
import ScheduleTabs from "@/components/schedule/ScheduleTabs";
import AnimeCardList from "@/components/schedule/AnimeCardList";
import type { ScheduleAnimeItem, ScheduleDayCount } from "@/types/schedule";

const getTodayName = (): string => {
    const daysOfWeek = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
    return daysOfWeek[new Date().getDay()];
};

interface ScheduleProps {
    initialDays: ScheduleDayCount[];
    initialAnimes: ScheduleAnimeItem[];
}

export default function Schedule({ initialDays, initialAnimes }: ScheduleProps) {
    const [selectedDay, setSelectedDay] = useState<string>(getTodayName());
    const animeList = initialAnimes.filter((a) => a.day === selectedDay);

    return (
        <div className="min-h-screen max-w-[95.5%] sm:max-w-[95%] md:max-w-[95%] mx-auto flex flex-col lg:pl-12 xl:pl-15 mt-[75px]">
            <div className="mb-6 text-center">
                <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-2 tracking-tight">Lịch chiếu Anime</h1>
                <p className="text-d234 text-base md:text-lg">Cập nhật những tập anime mới nhất</p>
            </div>

            <div className="space-y-8">
                <div className="relative">
                    <ScheduleTabs days={initialDays} onSelectDay={setSelectedDay} defaultDay={getTodayName()} />
                </div>
                <div className="transition-all duration-300 opacity-100">
                    <AnimeCardList data={animeList} />
                </div>
            </div>
        </div>
    );
}