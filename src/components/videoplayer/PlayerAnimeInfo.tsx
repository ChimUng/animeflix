"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from 'zustand';
import { useTitle } from '@/lib/store';
import { AnimeItem, AnimeTitle } from '@/types/anime';
import { StarScoreIcon } from '@/lib/SvgIcons';

const ACCENT_GREEN = '#A4E745';

const AnimeDescription = ({ description }: { description: string | null | undefined }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!description) return null;

  const isLongDescription = description.length > 300;
  const previewText = isLongDescription ? description.substring(0, 300) : description;

  return (
    <div className="bg-[#18181b] p-3 rounded-md my-4">
      <div className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <p
          className="text-gray-400 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: (isExpanded ? description : previewText).replace(/\n/g, '<br />') }}
        />
        {isLongDescription && (
          <span className="text-white font-medium text-sm ml-1">
            {isExpanded ? '...thu gọn' : '...xem thêm'}
          </span>
        )}
      </div>
    </div>
  );
};

const PlayerAnimeInfo: React.FC<{ data: AnimeItem | null }> = ({ data }) => {
  const animetitle = useStore(useTitle, (state) => state.animetitle) as keyof AnimeTitle;

  if (!data) return null;

  const {
    coverImage,
    title,
    status,
    seasonYear,
    format,
    season,
    countryOfOrigin,
    duration,
    popularity,
    genres,
    description,
    averageScore,
  } = data;

  const displayTitle = title?.[animetitle] || title?.romaji;
  const genreList = genres?.slice(0, 5) ?? [];

  return (
    <div className="flex-grow w-full h-full">
      <div className="border-t border-solid border-gray-600/30 pt-4">
        <div className="flex flex-row gap-4 md:gap-5 w-full">
          <div className="aspect-[8/12] h-[200px] md:h-[240px] relative flex-shrink-0 overflow-hidden rounded-lg bg-[#18181b]">
            <Image
              alt={`${displayTitle} cover`}
              className="w-full h-full object-cover"
              priority
              sizes="(max-width: 768px) 200px, 240px"
              src={coverImage?.extraLarge || coverImage?.large || ""}
              width={240}
              height={360}
            />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <h1 className="font-semibold text-white/90 tracking-wide text-xl sm:text-2xl leading-snug w-full">
              {displayTitle}
            </h1>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-medium items-center text-gray-300">
              {averageScore != null && (
                <span className="flex items-center gap-1 text-white">
                  <StarScoreIcon className="w-3.5 h-3.5 fill-star text-star" />
                  {(averageScore / 10).toFixed(1)}
                </span>
              )}
              {averageScore != null && (format || status || seasonYear) && <span>•</span>}
              {format && <span>{format}</span>}
              {status && <span>•</span>}
              {status && <span className={`${status === 'RELEASING' ? 'text-green-400' : 'text-gray-400'}`}>{status}</span>}
              {seasonYear && <span>•</span>}
              {seasonYear && <span>{seasonYear}</span>}
            </div>
            <div className="font-medium tracking-wide text-sm flex flex-col gap-1.5 capitalize mt-3">
              {season && <p>Mùa: <span style={{ color: ACCENT_GREEN }}>{season} {seasonYear}</span></p>}
              {countryOfOrigin && <p>Quốc gia: <span style={{ color: ACCENT_GREEN }}>{countryOfOrigin}</span></p>}
              {duration && <p>Thời lượng: <span className="text-gray-400">{duration} phút/tập</span></p>}
              {popularity && <p>Phổ biến: <span className="text-gray-400">{popularity.toLocaleString()} người theo dõi</span></p>}
            </div>
            {genreList.length > 0 && (
              <>
                <div className="hidden sm:flex flex-wrap gap-2 mt-2">
                  {genreList.map((genre: string) => (
                    <Link
                      key={genre}
                      href={`/anime/catalog?genre=${genre}`}
                      style={{ color: ACCENT_GREEN }}
                      className="px-3 py-1 text-xs font-medium bg-[#403c44] hover:bg-[#A4E745]/30 rounded-md transition-colors"
                    >
                      {genre}
                    </Link>
                  ))}
                </div>

                {/* Mobile: Dạng chữ inline nằm ngay dưới phần Info */}
                <p className="sm:hidden text-xs mt-1">
                  <span className="font-medium text-gray-300">Thể loại: </span>
                  {genreList.map((genre: string, i: number) => (
                    <React.Fragment key={genre}>
                      <Link href={`/anime/catalog?genre=${genre}`} style={{ color: ACCENT_GREEN }}>
                        {genre}
                      </Link>
                      {i < genreList.length - 1 && <span className="text-gray-300">, </span>}
                    </React.Fragment>
                  ))}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Mô tả */}
        <AnimeDescription description={description} />
      </div>
    </div>
  );
};

export default PlayerAnimeInfo;