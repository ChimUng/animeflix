"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimeItem } from '@/lib/types';

// Component con để xử lý logic "Xem thêm/Thu gọn" cho mô tả
const AnimeDescription = ({ description }: { description: string | null | undefined }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!description) return null;

  // Giới hạn mô tả ban đầu để tránh quá dài
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
  } = data;

  return (
    <div className="flex-grow w-full h-full">
      <div className="border-t border-solid border-gray-600/30 pt-4">
        {/* Phần thông tin chính */}
        <div className="flex flex-row gap-4 md:gap-5 w-full">
          {/* Ảnh bìa */}
          <div className="aspect-[8/12] h-[200px] md:h-[240px] relative flex-shrink-0 overflow-hidden rounded-lg bg-[#18181b]">
            <Image
              alt={`${title?.english || title?.romaji} cover`}
              className="w-full h-full object-cover"
              priority
              sizes="(max-width: 768px) 200px, 240px"
              src={coverImage?.extraLarge || coverImage?.large || ""}
              width={240}
              height={360}
            />
          </div>
          {/* Chi tiết */}
          <div className="flex flex-col gap-2 w-full">
            <h1 className="font-semibold text-white/90 tracking-wide text-xl sm:text-2xl leading-snug w-full">
              {title?.english || title?.romaji}
            </h1>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-medium items-center text-gray-300">
              {format && <span>{format}</span>}
              {status && <span>•</span>}
              {status && <span className={`${status === 'RELEASING' ? 'text-green-400' : 'text-gray-400'}`}>{status}</span>}
              {seasonYear && <span>•</span>}
              {seasonYear && <span>{seasonYear}</span>}
            </div>
            <div className="font-medium tracking-wide text-sm flex flex-col gap-1.5 capitalize mt-3">
              {season && <p>Mùa: <span className="text-gray-400">{season} {seasonYear}</span></p>}
              {countryOfOrigin && <p>Quốc gia: <span className="text-gray-400">{countryOfOrigin}</span></p>}
              {duration && <p>Thời lượng: <span className="text-gray-400">{duration} phút/tập</span></p>}
              {popularity && <p>Phổ biến: <span className="text-gray-400">{popularity.toLocaleString()} người theo dõi</span></p>}
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 mt-auto pt-2">
              {genres?.slice(0, 5).map((genre: string) => (
                <Link key={genre} className="px-2.5 py-1 text-xs text-gray-200 bg-[#27272a] hover:bg-[#3f3f46] rounded-full transition-colors" href={`/catalog?genres=${genre}`}>
                  {genre}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mô tả */}
        <AnimeDescription description={description} />

        {/* Genres cho mobile */}
        <div className="sm:hidden flex flex-wrap gap-2">
            {genres?.slice(0, 5).map((genre: string) => (
                <Link key={genre} className="px-2.5 py-1 text-xs text-gray-200 hover:brightness-150 ring-1 ring-cyan-500 rounded-full transition-colors" href={`/catalog?genres=${genre}`}>
                    {genre}
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerAnimeInfo;
