'use client';
import React from 'react';
import Image from 'next/image';
import { AnimeItem } from '@/types/anime'; 

interface Props {
    anime: AnimeItem;
    index: number;
}

const Top1AnimeCard: React.FC<Props> = ({ anime, index }) => {
    return (
        <div className="relative w-full h-[220px] sm:h-[280px] md:h-[350px] rounded-lg overflow-hidden shadow-md mb-5">
            <Image
                src={anime.bannerImage || anime.coverImage?.large || '/default.png'}
                alt={anime.title?.romaji || 'Anime'}
                fill
                priority
                className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/50 to-black/30 p-4 flex flex-col sm:flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold text-red-500">0{index + 1}</span>
                    <Image
                        src={anime.coverImage?.large || '/default.png'}
                        alt={anime.title?.romaji || 'Anime'}
                        width={80}
                        height={112}
                        className="rounded object-cover"
                    />
                    <div>
                        <h2 className="text-white text-lg sm:text-2xl font-bold uppercase">
                            {anime.title?.romaji}
                        </h2>
                        <p className="text-sm text-gray-300 mt-1">
                            {anime.title?.english || anime.title?.native || 'No Title'}
                        </p>
                        <p className="text-white text-sm mt-2">
                            {anime.format} • {anime.episodes ? `${anime.episodes} tập` : 'Đang cập nhật'}
                        </p>
                    </div>
                </div>
                <div className="text-white font-semibold text-lg">
                    {anime.nextAiringEpisode?.episode ? (
                        <>Tập {anime.nextAiringEpisode.episode - 1}</>
                    ) : (
                        <>Full</>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Top1AnimeCard;