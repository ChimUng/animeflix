"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "zustand";
import { useEffect, useState } from "react";
import styles from '../../styles/Animecard.module.css';
import type { ScheduleAnimeItem } from "@/types/schedule";
import type { AnimeTitle } from "@/types/anime";
import { useTitle } from "@/lib/store";
import { CheckCircleIcon, ClockIcon } from "@/lib/SvgIcons";

interface CountdownParts {
    ngay: number;
    gio: number;
    phut: number;
    giay: number;
}

function useCountdown(airingAt?: number | null): CountdownParts | null {
  const [timeLeft, setTimeLeft] = useState<CountdownParts | null>(null);

  useEffect(() => {
    if (!airingAt) {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const diff = airingAt * 1000 - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return false;
      }
      setTimeLeft({
        ngay: Math.floor(diff / 86400000),
        gio: Math.floor((diff % 86400000) / 3600000),
        phut: Math.floor((diff % 3600000) / 60000),
        giay: Math.floor((diff % 60000) / 1000),
      });
      return true;
    };

    if (!tick()) return;
    const intervalId = setInterval(() => {
      if (!tick()) clearInterval(intervalId);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [airingAt]);

  return timeLeft;
}

function formatCountdown(t: CountdownParts, short = false): string {
  if (short) {
    if (t.ngay > 0) return `${t.ngay} ngày ${t.gio} giờ`;
    if (t.gio > 0) return `${t.gio} giờ ${t.phut} phút`;
    return `${t.phut} phút ${t.giay} giây`;
  }
  return `${t.ngay} ngày, ${t.gio} giờ, ${t.phut} phút, ${t.giay} giây`;
}
// ──────────────────────────────────────────────────────────────────────────

function ScheduleBadge({ airingAt }: { airingAt: number }) {
  const isAired = airingAt * 1000 <= Date.now();
  const timeLeft = useCountdown(isAired ? null : airingAt);

  if (isAired || !timeLeft) {
    return (
      <div className="absolute left-0 top-0 sm:top-2 sm:left-2 px-1.5 w-[60px] sm:w-fit sm:px-2 py-1 rounded-lg text-xs shadow-2xl font-semibold !backdrop-blur-2xl flex items-center gap-1 bg-green-700 text-green-50">
        <CheckCircleIcon className="w-3 h-3" />
        Aired
      </div>
    );
  }

  return (
    <div className="absolute left-0 top-0 sm:top-2 sm:left-2 px-1.5 w-fit sm:px-2 py-1 rounded-lg text-xs shadow-2xl font-semibold !backdrop-blur-2xl flex items-center gap-1 bg-d234 text-white">
      <ClockIcon className="w-3 h-3" />
      {formatCountdown(timeLeft, true)}
    </div>
  );
}

export default function AnimeCardList({ data }: { data: ScheduleAnimeItem[] }) {
  const animetitle = useStore(useTitle, (state) => state.animetitle) as keyof AnimeTitle;

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="group relative bg-[#18181b] rounded-lg lg:rounded-2xl overflow-hidden flex h-full">
          <div className={`relative w-[60px] min-h-[75px] sm:w-[125px] sm:h-[180px] md:w-[140px] md:h-[200px] flex-shrink-0 rounded-lg lg:rounded-2xl ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15}s` }} />
          <div className="pr-3 flex flex-col justify-between w-full">
            <div className="flex flex-col my-3 mx-3 w-[95%] gap-1">
              <div className={`font-semibold text-base lg:text-lg bg-[#2a2a2e] h-6 w-4/5 rounded-md ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15 + 0.05}s` }}></div>
              <div className={`bg-[#2a2a2e] h-6 w-3/5 rounded-md ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15 + 0.1}s` }}></div>
              <div className={`flex items-center gap-1 bg-[#2a2a2e] h-4 w-3/5 rounded-md mt-1 ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15 + 0.15}s` }}></div>
              <div className={`bg-[#2a2a2e] h-4 w-full rounded-md mt-2 hidden sm:block ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15 + 0.2}s` }}></div>
              <div className={`bg-[#2a2a2e] h-4 w-4/5 rounded-md mt-1 hidden sm:block ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15 + 0.25}s` }}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (!data) return renderSkeleton();

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-40 w-full bg-[#18181b] rounded-lg lg:rounded-2xl border border-dashed border-[#2c2c2c]">
        <p className="text-gray-400 font-medium text-sm md:text-base">
          Hôm nay không có bộ anime nào lên sóng.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        {data.map((anime, idx) => {
          const displayTitle = anime.title[animetitle] || anime.title.romaji;

          return (
            <Link
              key={`${anime.id}-${idx}`}
              href={`/anime/info/${anime.id}`}
              className="group relative bg-card-background backdrop-blur-sm rounded-lg lg:rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] flex h-full"
            >
              <div className="relative w-[60px] min-h-[75px] sm:w-[125px] sm:h-[180px] md:w-[140px] md:h-[200px] flex-shrink-0 rounded-lg lg:rounded-2xl">
                <Image
                  src={anime.coverImage?.large || anime.coverImage?.extraLarge || "/default.png"}
                  alt={displayTitle ?? "Anime"}
                  width={140}
                  height={200}
                  className="w-full h-full object-cover rounded-lg lg:rounded-2xl opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t to-black/60 via-transparent from-transparent rounded-lg lg:rounded-2xl" />
                <ScheduleBadge airingAt={anime.airingAt} />
              </div>

              <div className="pr-3 flex flex-col justify-between w-full">
                <div className="flex flex-col my-3 mx-3 w-[95%] gap-1">
                  <p className="font-semibold text-base lg:text-lg text-white line-clamp-2 leading-tight mb-1">
                    {displayTitle}
                  </p>

                  <div className="flex items-center gap-1 text-gray-300 text-sm">
                    <ClockIcon className="w-4 h-4" />
                    <span className="font-medium">Tập {anime.episode}</span>
                    <span>• {anime.airingTime}</span>
                  </div>

                  {anime.description && (
                    <span className="text-gray-400 mt-1 hidden text-xs sm:line-clamp-2 md:line-clamp-3 tracking-wider">
                      <span dangerouslySetInnerHTML={{ __html: anime.description }} />
                    </span>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-d234 to-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}