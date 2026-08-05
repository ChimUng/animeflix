"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTitle } from '@/lib/store';
import { useStore } from 'zustand';
import { AnimeItem, AnimeTitle } from '@/types/anime';
import { RecentEpisode } from '@/types/episode';
import { StarScoreIcon } from '@/lib/SvgIcons';

interface PlayerVerticalListProps {
  recentData: RecentEpisode[];
  popularData: AnimeItem[];
  title?: string;
  compact?: boolean;
}

function statusDotColor(status?: AnimeItem['status']): string {
  if (status === 'RELEASING') return 'bg-green-500';
  if (status === 'FINISHED') return 'bg-blue-400';
  if (status === 'NOT_YET_RELEASED') return 'bg-red-500';
  return 'bg-gray-400';
}

function statusLabel(status?: AnimeItem['status']): string {
  if (status === 'RELEASING') return 'Đang phát hành';
  if (status === 'FINISHED') return 'Đã hoàn thành';
  if (status === 'NOT_YET_RELEASED') return 'Chưa phát hành';
  return status || 'Không xác định';
}

function episodeLabel(anime: AnimeItem | RecentEpisode): string {
  if ('currentEpisode' in anime && anime.currentEpisode != null) {
    return `Tập ${anime.currentEpisode}`;
  }
  if (anime.nextAiringEpisode?.episode) {
    return `Tập ${anime.nextAiringEpisode.episode - 1}`;
  }
  if (anime.episodes) {
    return `${anime.episodes} tập`;
  }
  return 'Tập 1';
}

function formatLabel(format?: string | null): string {
  if (!format) return 'TV Show';
  if (format === 'TV') return 'TV Show';
  return format;
}

const DEFAULT_VISIBLE = 6;
const EXPANDED_VISIBLE = 12;

const PlayerVerticalList: React.FC<PlayerVerticalListProps> = ({
  recentData,
  popularData,
  title = 'Khám phá',
  compact = true,
}) => {
  const animetitle = useStore(useTitle, (state) => state.animetitle) as keyof AnimeTitle;
  const [activeTab, setActiveTab] = useState<'recent' | 'popular'>('recent');
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [visibleItems, setVisibleItems] = useState<number>(DEFAULT_VISIBLE);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset lại số lượng hiển thị mỗi khi đổi tab, tránh giữ trạng thái "mở rộng" lệch dữ liệu
  useEffect(() => {
    setVisibleItems(DEFAULT_VISIBLE);
  }, [activeTab]);

  const useCompactUI = compact && !isMobileScreen;
  const currentData: (AnimeItem | RecentEpisode)[] = activeTab === 'recent' ? recentData : popularData;
  const visibleData = currentData?.slice(0, visibleItems) ?? [];

  const handleShowMore = () => setVisibleItems(EXPANDED_VISIBLE);
  const handleShowLess = () => setVisibleItems(DEFAULT_VISIBLE);

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div className="px-[10px] mb-[8px] mx-0 mt-0 leading-tight lg:px-[2px] lg:mx-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-6 md:h-8 rounded-md w-[.35rem] md:w-[.3rem] bg-white shrink-0" />
          <h2 className="lg:text-[22px] text-[21px] font-medium text-white truncate">{title}</h2>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab((prev) => (prev === 'recent' ? 'popular' : 'recent'))}
          className="bg-[#4d148c] hover:bg-[#5f19ad] text-white px-3 py-1.5 rounded-lg text-xs font-medium border-none outline-none cursor-pointer transition-colors shrink-0"
        >
          {activeTab === 'recent' ? 'Tập mới' : 'Hot tuần'}
        </button>
      </div>

      <div className="w-full flex flex-col gap-2 min-w-0">
        {visibleData.map((anime, index) => {
          const displayTitle = anime.title?.[animetitle] || anime.title?.romaji;
          const scoreLabel = anime.averageScore != null ? (anime.averageScore / 10).toFixed(1) : 'NA';
          const coverColor = anime.coverImage?.color;
          const hoverColor = coverColor || '#A4E745';

          return (
            <div key={anime.id} className="w-full flex items-center gap-2 min-w-0">
              {useCompactUI ? (
                <span
                  className="w-6 shrink-0 text-center text-sm sm:text-base font-bold text-gray-400"
                  style={index < 3 && coverColor ? { color: coverColor } : {}}
                >
                  #{index + 1}
                </span>
              ) : (
                <span
                  className="shrink-0 text-[10px] font-bold text-black w-5 h-5 flex items-center justify-center rounded-full bg-white/80 shadow"
                  style={index < 3 && coverColor ? { backgroundColor: coverColor, color: '#000' } : {}}
                >
                  #{index + 1}
                </span>
              )}

              <div
                className="group flex items-center bg-[#18181b] rounded-lg p-2 sm:p-2.5 transition-colors flex-1 min-w-0"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#202024';
                  e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${hoverColor}66`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#18181b';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {useCompactUI ? (
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <Link href={`/anime/info/${anime.id}`} className="shrink-0">
                      <img
                        src={anime.coverImage?.large || anime.coverImage?.extraLarge || '/default.png'}
                        alt={displayTitle || 'anime'}
                        width={70}
                        height={90}
                        className="w-[70px] h-[90px] object-cover rounded-md"
                      />
                    </Link>

                    <div className="flex flex-col justify-center min-w-0 flex-1 gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 w-full">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${statusDotColor(anime.status)}`}
                          title={statusLabel(anime.status)}
                        />
                        <Link
                          href={`/anime/info/${anime.id}`}
                          className="text-sm sm:text-[15px] text-white font-medium line-clamp-1 transition-colors min-w-0 flex-1"
                          onMouseOver={(e) => (e.currentTarget.style.color = hoverColor)}
                          onMouseOut={(e) => (e.currentTarget.style.color = '#fff')}
                        >
                          {displayTitle}
                        </Link>
                      </div>

                      <div className="flex items-center flex-wrap gap-x-1.5 text-xs text-[#ffffffb2] min-w-0">
                        {scoreLabel !== 'NA' && (
                          <>
                            <span className="flex items-center gap-0.5 text-amber-400 font-medium shrink-0">
                              <StarScoreIcon className="w-3 h-3 fill-star text-star" />
                              {scoreLabel}
                            </span>
                            <span className="shrink-0">.</span>
                          </>
                        )}
                        {anime.season && (
                          <>
                            <span className="shrink-0">{anime.season}</span>
                            <span className="shrink-0">.</span>
                          </>
                        )}
                        <span className="text-white font-medium shrink-0">{episodeLabel(anime)}</span>
                        <span className="shrink-0">.</span>
                        <span className="shrink-0">{formatLabel(anime.format)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full gap-2 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={anime.coverImage?.large || anime.coverImage?.extraLarge || '/default.png'}
                        alt={displayTitle || 'anime'}
                        className="w-[55px] h-[70px] object-cover rounded shrink-0"
                      />

                      <div className="flex flex-col min-w-0 gap-1 flex-1">
                        <Link
                          href={`/anime/info/${anime.id}`}
                          className="text-sm sm:text-[15px] text-white font-medium truncate block flex-1 transition-colors min-w-0"
                          onMouseOver={(e) => (e.currentTarget.style.color = hoverColor)}
                          onMouseOut={(e) => (e.currentTarget.style.color = '#fff')}
                        >
                          {displayTitle}
                        </Link>

                        <div className="flex items-center gap-1.5 text-xs text-[#ffffffb2] flex-wrap min-w-0">
                          {scoreLabel !== 'NA' && (
                            <span className="flex items-center text-amber-400 shrink-0">
                              <StarScoreIcon className="w-3 h-3 mr-0.5 fill-star text-star" />
                              {scoreLabel}
                            </span>
                          )}
                          <span className="shrink-0">.</span>
                          <span className="shrink-0">{anime.season || 'Không xác định'}</span>
                          <span className="shrink-0">.</span>
                          <span
                            className={`shrink-0 ${anime.status === 'RELEASING' ? 'text-green-500' : 'text-[#ffffffb2]'
                              }`}
                          >
                            {statusLabel(anime.status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end text-xs shrink-0 pl-2">
                      <span className="text-white font-medium">{formatLabel(anime.format)}</span>
                      <span className="text-[#ffffffb2] text-[11px] mt-0.5">{episodeLabel(anime)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {currentData.length > visibleItems && (
        <div
          className="text-center cursor-pointer mt-5 text-[.9em] font-semibold rounded-[0.4rem] py-3 px-[1.2rem] bg-[#d14836] hover:bg-[#e0553f] text-white transition-colors"
          onClick={handleShowMore}
        >
          Mở rộng
        </div>
      )}
      {visibleItems > DEFAULT_VISIBLE && (
        <div
          className="text-center cursor-pointer mt-2 text-[.9em] font-semibold rounded-[0.4rem] py-3 px-[1.2rem] bg-[#d14836] hover:bg-[#e0553f] text-white transition-colors"
          onClick={handleShowLess}
        >
          Thu gọn
        </div>
      )}
    </div>
  );
};

export default PlayerVerticalList;