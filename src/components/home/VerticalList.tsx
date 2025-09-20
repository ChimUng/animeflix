'use client';
import React, { useState, useEffect } from 'react';
import styles from '../../styles/VerticalList.module.css';
import Link from 'next/link';
import { useTitle } from '@/lib/store';
import { useStore } from 'zustand';

interface AnimeTitle {
    romaji: string;
    english?: string;
    native?: string;
    vi?: string; // Thêm trường vi để lưu trữ tiêu đề tiếng Việt
}

interface CoverImage {
    large: string;
    color?: string;
}

interface NextAiringEpisode {
    episode: number;
    timeUntilAiring: number;
}

interface AnimeItem {
    id: number | string;
    title: AnimeTitle;
    coverImage: CoverImage;
    averageScore?: number;
    season?: string;
    status: string;
    format: string;
    episodes?: number;
    nextAiringEpisode?: NextAiringEpisode;
    duration?: number;
    description?: string; // Thêm description để truyền vào useTranslationCache
}

interface VerticalListProps {
    data: AnimeItem[];
    mobiledata?: AnimeItem[];
    id: string;
    fullWidth?: boolean; // ✅ thêm prop
}

const VerticalList: React.FC<VerticalListProps> = ({ data, id, mobiledata, fullWidth }) => {
    const animetitle = useStore(useTitle, (state) => state.animetitle);
    const [maxWidth, setMaxWidth] = useState<number>(0);
    const [isSeasonal, setIsSeasonal] = useState<boolean>(true);

    useEffect(() => {
        const handleResize = () => {
        setMaxWidth(window.innerWidth);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => {
        window.removeEventListener('resize', handleResize);
        };
    }, []);

    const convertMinutesToHoursAndMinutes = (minutes?: number): string => {
        if (!minutes) return 'NA';
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours} giờ, ${remainingMinutes} phút`;
    };

    const getColorStyle = (coverColor?: string) => {
        if (!coverColor) return {};
        return maxWidth <= 900
        ? { backgroundColor: coverColor, color: 'black' }
        : { backgroundColor: 'transparent', color: coverColor };
    };

    const handleButtonClick = () => {
        setIsSeasonal((prev) => !prev);
    };

    const currentData = isSeasonal ? data : mobiledata;
    // if (id === 'Yêu thích') {
    //     console.log("📦 Yêu thích Anime Data:", currentData);
    // }

    return (
        <div
        className={`${styles.verticalcard} ${fullWidth ? styles.fullwidth : ''}`}
        style={{ display: id === 'Yêu thích' && maxWidth < 1024 ? 'none' : 'flex' }}
        >
        <div className={styles.tophead}>
            <span className={styles.bar}></span>
            <h1 className={styles.headtitle}>{id}</h1>
        </div>
        <div className={styles.mobiletop}>
            <div className="flex flex-row gap-[8px] items-center">
            <span className={styles.bar}></span>
            <h1 className={styles.mobiletitle}>Top Anime</h1>
            </div>
            <button onClick={handleButtonClick} className={styles.mobilebtn}>
            {isSeasonal ? 'Toàn mùa' : 'Yêu Thích'}
            </button>
        </div>
        {currentData?.map((anime, index) => {
            // Thêm một giá trị description mặc định nếu không có
                // const animeDescription = anime.description || "Không có mô tả";

                // const { titleVI } = useTranslationCache(
                //     Number(anime.id),
                //     anime.title.romaji,
                //     animeDescription
                // );

                const displayTitle = anime.title[animetitle as keyof AnimeTitle] || anime.title.romaji;
            return (
                <div className={`${styles.vcarditem} group`} key={anime.id}>
                <div
                    className={styles.vcardindex}
                    style={index < 3 ? getColorStyle(anime.coverImage.color) : {}}
                >
                    #{index + 1}
                </div>
                <div className={styles.vcardcontent}>
                    <div className={styles.vcardleft}>
                    <img src={anime.coverImage.large} alt="" className={styles.vcardimg} />
                    <div className={styles.vcardinfo}>
                        <div className={styles.linktitle}>
                        <Link
                            href={`/anime/info/${anime.id}`}
                            onMouseOver={(e) =>
                            (e.currentTarget.style.color = anime.coverImage.color || 'white')
                            }
                            onMouseOut={(e) => (e.currentTarget.style.color = 'white')}
                        >
                            {displayTitle}
                        </Link>
                        </div>
                        <div className={styles.vcardleftb}>
                        <span className={styles.score}>
                            <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="w-[14px] h-[14px] mt-[1px] mr-[2px]"
                            >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                            />
                            </svg>
                            {anime.averageScore ? `${anime.averageScore / 10}` : 'NA'}
                        </span>
                        <span className={styles.dot}>.</span>
                        <span className={styles.season}>{anime.season || 'Không xác định'}</span>
                        <span className={styles.dot}>.</span>
                        <span
                            className={
                            anime.status === 'RELEASING'
                                ? styles.vstatusc
                                : styles.vstatus
                            }
                        >
                            {anime.status === 'RELEASING' ? 'Đang phát hành' : anime.status === 'FINISHED' ? 'Đã hoàn thành' : anime.status === 'NOT_YET_RELEASED' ? 'Chưa phát hành' : anime.status}
                        </span>
                        </div>
                    </div>
                    </div>
                    <div className={styles.vcardright}>
                    <div className={styles.vpopular}>
                        <span className={styles.format}>
                        {anime.format === 'TV' ? 'TV Show' : anime.format}
                        </span>
                        <div className={styles.vcardformat}>
                        {anime.episodes === 1 ? (
                            <span className={styles.bpopular}>
                            {convertMinutesToHoursAndMinutes(anime.duration)}
                            </span>
                        ) : (
                            <span className={styles.bpopular}>
                                {anime.status === 'RELEASING' && anime.nextAiringEpisode?.episode ? (
                                `Tập ${anime.nextAiringEpisode.episode - 1}`
                                ) : anime.episodes ? (
                                `${anime.episodes} tập`
                                ) : (
                                'Không xác định'
                                )}
                            </span>
                        )}
                        </div>
                    </div>
                    </div>
                </div>
                </div>
        )})}
        </div>
    );
};

export default VerticalList;
