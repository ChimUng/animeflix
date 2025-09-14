"use client"
import React, { useState } from 'react';
import Image from 'next/image';
import styles from '../../styles/Animecard.module.css';
import { useTitle } from '@/lib/store'; // Giữ import này
import { useStore } from 'zustand';   // Giữ import này
import { useTranslationCache } from '@/lib/useTranslationCache';
import { AnimeItem, AnimeTitle } from '@/lib/types'; // Import AnimeTitle và AnimeItem

    // Định nghĩa kiểu props cho component ItemContent
    interface ItemContentProps {
    anime: AnimeItem; // Sử dụng kiểu AnimeItem đã định nghĩa ở trên
    cardid: string;
    }

    function ItemContent({ anime, cardid }: ItemContentProps) {
    // Gán kiểu cụ thể cho giá trị trả về từ useStore
    const { titleVI } = useTranslationCache(
    Number(anime.id),
    anime.title.romaji || "Unknown Title", // Fallback nếu romaji là null
    anime.description || "Không có mô tả"
    );
    const animetitle = useStore(useTitle, (state) => state.animetitle) as keyof AnimeTitle;
    const displayTitle = titleVI || anime.title[animetitle] || anime.title.romaji;

    if (titleVI) {
        anime.title.vi = titleVI;
    }
    const [imageLoaded, setImageLoaded] = useState<boolean>(false);

    // Gán kiểu cho tham số `text`
    function containsEngChar(text: string): boolean {
        const englishRegex = /[a-zA-Z!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/;
        return englishRegex.test(text);
    }

    

    return (
        <div className={`${styles.carditem} group`}>
            {(cardid === 'Các tập gần đây' || cardid === 'Xu hướng') && (
                anime?.currentEpisode !== undefined || anime?.nextAiringEpisode?.episode !== undefined ? (
                <div className="z-[10] flex-shrink-0 absolute top-0 right-0 flex items-center justify-center gap-[.4rem] bg-black/60 backdrop-blur font-light xl:font-normal text-white !text-xs line-clamp-1 px-2 p-1 rounded-bl-lg tracking-wider">
                    <span className='hidden md:flex bg-gradient-to-r from-red-500 via-white to-red-500 bg-[length:200%_100%] animate-gradient-x text-transparent bg-clip-text font-semibold'>Tập</span>
                    <span className='md:hidden'>Tập</span>
                    <span className='font-medium bg-gradient-to-r from-red-500 via-white to-red-500 bg-[length:200%_100%] animate-gradient-x text-transparent bg-clip-text font-semibold'>
                        {(anime?.currentEpisode !== undefined)
                            ? anime.currentEpisode
                            : (anime?.nextAiringEpisode?.episode !== undefined)
                            ? anime.nextAiringEpisode.episode - 1
                            : anime.episodes || '?'}
                    </span>
                </div>
                ) : null
            )}

            {/* Image section */}
            <div className={styles.cardimgcontainer}>
                {!imageLoaded && <div className={`${styles.cardimgcontainer} ${styles.pulse}`} />}
                <Image
                    src={anime?.coverImage?.extraLarge || anime?.coverImage?.large || anime?.coverImage?.medium || '/default.png'}
                    alt={anime?.title?.romaji || 'Anime Image'}
                    fill
                    quality={100}
                    onLoad={() => setImageLoaded(true)}
                    className={styles.cardimage}
                />
            </div>

            {/* Overlay on hover */}
            <div className="cardinfo flex flex-col justify-between items-center text-white backdrop-blur-sm bg-gradient-to-t from-black/90 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out absolute inset-0 px-2 py-3">
                <div className="flex-1 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-white/80 hover:text-[#d14836] transition duration-300 ease-in-out transform hover:scale-110" viewBox="0 0 48 48">
                    <defs>
                        <mask id="ipSPlay0">
                        <g fill="none" strokeLinejoin="round" strokeWidth="4">
                            <path fill="#fff" stroke="#fff" d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4S4 12.954 4 24s8.954 20 20 20Z"/>
                            <path fill="#000" stroke="#000" d="M20 24v-6.928l6 3.464L32 24l-6 3.464l-6 3.464z"/>
                        </g>
                        </mask>
                    </defs>
                    <path fill="currentColor" d="M0 0h48v48H0z" mask="url(#ipSPlay0)"/>
                    </svg>
                </div>
                <div className="text-xs font-light flex flex-wrap items-center justify-center gap-[.3rem] z-10 w-full">
                    <span className="uppercase">{anime.format || "?"}</span>
                    <span className='text-[10px]'>&#8226;</span>
                    <span className={anime.status === 'RELEASING' ? 'text-green-400 font-normal' : anime.status === 'NOT_YET_RELEASED' ? 'text-red-600 font-normal' : 'text-white font-normal'}>
                        {anime.status}
                    </span>
                    <span className='text-[10px]'>&#8226;</span>
                    <span>
                        Tập {(cardid === 'Recent Episodes')
                            ? (anime?.totalEpisodes || anime?.currentEpisode || '?')
                            : (anime?.nextAiringEpisode?.episode
                            ? anime.nextAiringEpisode.episode - 1
                            : anime.episodes || '?')}
                    </span>
                </div>
            </div>

            {/* Title */}
            <span className={styles.cardtitle}>
                <span className={`aspect-square w-2 h-2 inline-block mr-1 rounded-full ${anime.status === "NOT_YET_RELEASED" ? 'bg-red-500' : anime.status === 'RELEASING' ? 'bg-green-500' : 'hidden'} xl:hidden`} />
                    {displayTitle}
            </span>
    </div>

    );
}

export default ItemContent;