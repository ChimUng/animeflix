"use client"
import React, { useState } from 'react';
import Image from 'next/image';
import styles from '../../styles/Animecard.module.css';
import { useTitle } from '@/lib/store';
import { useStore } from 'zustand';
import { NotificationTime } from '@/utils/TimeFunctions';
import { AnimeItem, AnimeTitle } from '@/types/anime';
import { PlayIcon, StarScoreIcon } from '@/lib/SvgIcons';

interface ItemContentProps {
    anime: AnimeItem;
    cardid: string;
}

const formatViews = (num?: number | null) => {
    if (!num) return null;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M lượt xem`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K lượt xem`;
    return `${num} lượt xem`;
};

function ItemContent({ anime, cardid }: ItemContentProps) {
    const animetitle = useStore(useTitle, (state) => state.animetitle) as keyof AnimeTitle;
    const displayTitle = anime.title[animetitle] || anime.title.romaji;
    const [imageLoaded, setImageLoaded] = useState<boolean>(false);
    const viewsLabel = formatViews(anime?.popularity);

    return (
        <div className={`${styles.carditem} group`}>
            {cardid === 'Các tập gần đây' ? (
                anime.airingAt != null && (
                    <div className="z-[10] absolute top-0 left-0 flex items-center justify-center gap-0.5 sm:gap-1 bg-black/60 backdrop-blur font-light text-white text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-br-lg tracking-wider">
                        <span>{NotificationTime(anime.airingAt)}</span>
                    </div>
                )
            ) : (
                anime?.averageScore != null &&
                cardid !== 'Mùa tiếp theo' &&
                anime.status !== 'NOT_YET_RELEASED' && (
                    <div className="z-[10] absolute top-0 left-0 flex items-center justify-center gap-0.5 sm:gap-1 bg-black/60 backdrop-blur font-light text-white text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-br-lg tracking-wider">
                        <StarScoreIcon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-star text-star" />
                        <span className="font-semibold text-white">{(anime.averageScore / 10).toFixed(1)}</span>
                    </div>
                )
            )}
            
            {(cardid === 'Các tập gần đây' || cardid === 'Xu hướng') && (
                anime?.currentEpisode !== undefined || anime?.nextAiringEpisode?.episode !== undefined ? (
                <div className="z-[10] flex-shrink-0 absolute top-0 right-0 flex items-center justify-center gap-1 sm:gap-[.4rem] bg-black/60 backdrop-blur font-light xl:font-normal text-white !text-[10px] sm:!text-xs line-clamp-1 px-1.5 py-0.5 sm:px-2 sm:p-1 rounded-bl-lg tracking-wider">
                    <span className='hidden md:flex text-animate-red'>Tập</span>
                    <span className='md:hidden'>Tập</span>
                    <span className='font-medium text-animate-red'>
                        {(anime?.currentEpisode !== undefined)
                            ? anime.currentEpisode
                            : (anime?.nextAiringEpisode?.episode !== undefined)
                            ? anime.nextAiringEpisode.episode - 1
                            : anime.episodes || '?'}
                    </span>
                </div>
                ) : null
            )}

            <div className={styles.cardimgcontainer}>
                {!imageLoaded && <div className={`${styles.cardimgcontainer} ${styles.pulse}`} />}
                <Image
                    src={anime?.coverImage?.extraLarge || anime?.coverImage?.large || '/default.png'}
                    alt={anime?.title?.romaji || 'Anime Image'}
                    fill
                    onLoad={() => setImageLoaded(true)}
                    className={styles.cardimage}
                />
            </div>

            <div className="cardinfo flex flex-col justify-between items-center px-2 py-3 card-hover-overlay">
                <div className="flex-1 flex items-center justify-center">
                    <PlayIcon className="w-14 h-14 text-white/80 hover:text-d148h transition duration-300 ease-in-out transform hover:scale-110" />
                </div>
                <div className="text-xs font-light flex flex-wrap items-center justify-center gap-[.3rem] z-10 w-full">
                    <span className="uppercase">{anime.format || "?"}</span>
                    <span className='text-[10px]'>&#8226;</span>
                    <span className={anime.status === 'RELEASING' ? 'text-green-400 font-normal' : anime.status === 'NOT_YET_RELEASED' ? 'text-red-600 font-normal' : 'text-white font-normal'}>
                        {anime.status}
                    </span>
                    <span className='text-[10px]'>&#8226;</span>
                    <span>
                        Tập {(cardid === 'Các tập gần đây')
                            ? (anime?.currentEpisode ?? anime?.totalEpisodes ?? '?')
                            : (anime?.nextAiringEpisode?.episode
                            ? anime.nextAiringEpisode.episode - 1
                            : anime.episodes || '?')}
                    </span>
                </div>
            </div>

            <div className="flex flex-col items-center w-full">
                <span className={styles.cardtitle}>
                    <span className={`aspect-square w-2 h-2 inline-block mr-1 rounded-full ${anime.status === "NOT_YET_RELEASED" ? 'bg-red-500' : anime.status === 'RELEASING' ? 'bg-green-500' : 'hidden'} xl:hidden`} />
                    {displayTitle}
                </span>
                {viewsLabel && (
                    <span className="text-[11px] text-d656 mt-0.5 line-clamp-1">
                        {viewsLabel}
                    </span>
                )}
            </div>
        </div>
    );
}

export default ItemContent;