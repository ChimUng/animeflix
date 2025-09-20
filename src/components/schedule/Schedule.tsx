"use client";

import { useEffect, useState } from "react";
import ScheduleTabs from "@/components/schedule/ScheduleTabs";
import AnimeCardList from "@/components/schedule/AnimeCardList";
import type { AnimeItem } from "@/lib/types";

const daysOfWeek = [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy"
];

// Lấy tên ngày hôm nay theo `daysOfWeek`
const getTodayName = (): string => {
    const todayIndex = new Date().getDay(); // 0 (CN) -> 6 (T7)
    return daysOfWeek[todayIndex];
};

export default function Schedule() {
    const [selectedDay, setSelectedDay] = useState<string>(getTodayName());
    const [episodeCounts, setEpisodeCounts] = useState<{ day: string; count: number }[]>([]);
    const [allAnimes, setAllAnimes] = useState<AnimeItem[]>([]);

    // Fetch số tập của từng ngày (1 lần)
    useEffect(() => {
        const fetchSchedule = async () => {
        try {   
            const res = await fetch("/api/schedule");
            const data = await res.json();
            setEpisodeCounts(data.days || []);
            console.log("Fetched schedule days:", data);
            setAllAnimes(data.animes || []);
        } catch (err) {
            console.error("Lỗi khi fetch schedule:", err);
        }
        };
        fetchSchedule();
    }, []);

    const animeList = allAnimes.filter((a) => a.day === selectedDay);

    return (
        <div className="min-h-screen max-w-[95.5%] sm:max-w-[95%] md:max-w-[95%] mx-auto flex flex-col lg:pl-12 xl:pl-15 mt-[75px]">
        <div className="mb-6 text-center">
            <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-2 tracking-tight">Lịch chiếu Anime</h1>
            <p className="text-[#d14836] text-base md:text-lg">Cập nhật những tập anime mới nhất</p>
        </div>

        <div className="space-y-8">
            <div className="relative">
            <ScheduleTabs
                days={episodeCounts}
                onSelectDay={setSelectedDay}
                defaultDay={getTodayName()} // truyền vào để tab biết ngày cần active
            />
            </div>
            <div className="transition-all duration-300 opacity-100">
            <AnimeCardList data={animeList} />
            </div>
        </div>
        </div>
    );
}
