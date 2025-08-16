'use client';
import React, { useRef, useState , useEffect } from 'react';
import styles from '../../styles/Animecard.module.css';
import { useDraggable } from 'react-use-draggable-scroll';
import Link from 'next/link';
import ItemContent from './ItemContent';
import { AnimeItem } from '@/lib/types'; // Import interface chung

// interface AnimeTitle {
//     romaji: string;
//     english?: string;
//     native?: string;
//     vi?: string;
// }

// interface CoverImage {
//     large: string;
//     medium?: string;
//     extraLarge?: string;
// }

// interface NextAiringEpisode {
//     episode: number;
//     timeUntilAiring: number;
// }

// interface GogoEpisode {
//     id: string;
//     number: number;
// }

// interface AnimeItem {
//     id: number | string;
//     title: AnimeTitle;
//     coverImage: CoverImage;
//     bannerImage?: string | null;
//     description?: string;
//     trailer?: any;
//     status: string;
//     format: string;
//     episodes?: number;
//     totalEpisodes?: number;
//     currentEpisode?: number;
//     nextAiringEpisode?: NextAiringEpisode;
//     relationType?: string;
//     episodesData?: {
//         data: {
//         providerId: string;
//         episodes: GogoEpisode[];
//         }[];
//     };
//     mediaRecommendation?: AnimeItem;
//     node?: AnimeItem;
// }

interface AnimecardsProps {
    data: AnimeItem[] | null;
    cardid: string;
    show?: boolean;
}

function Animecards({ data, cardid, show = true }: AnimecardsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { events } = useDraggable(containerRef as React.MutableRefObject<HTMLDivElement>);
    const [isLeftArrowActive, setIsLeftArrowActive] = useState(false);
    const [isRightArrowActive, setIsRightArrowActive] = useState(false);

    useEffect(() => {
        handleScroll();
    }, [data]);

    function handleScroll() {
        const container = containerRef.current;
        if (container) {
        const scrollPosition = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;
        setIsLeftArrowActive(scrollPosition > 30);
        setIsRightArrowActive(scrollPosition < maxScroll - 30);
        }
    }

    const smoothScroll = (amount: number) => {
        const container = containerRef.current;
        const cont = document.getElementById(cardid);
        if (cont && container) {
        cont.classList.add('scroll-smooth');
        container.scrollLeft += amount;
        setTimeout(() => {
            cont.classList.remove('scroll-smooth');
        }, 300);
        }
    };

    const scrollLeft = () => smoothScroll(-500);
    const scrollRight = () => smoothScroll(500);

    const renderItem = (item: AnimeItem) => {
        // console.log('Item trong renderItem:', item);
        let anime: AnimeItem;
        // console.log('anime:', item);
        // console.log('item:', item.title?.romaji, '| currentEpisode:', item.currentEpisode);
        // console.log('Trending:', item.title?.romaji, '| next:', item.nextAiringEpisode?.episode);
        let href = '';

        if (cardid === 'Các tập gần đây') {
        anime = {
            ...item,
            coverImage: item.coverImage,
            title: item.title,
            status: item.status,
            format: item.format,
            episodes: item.episodes,
            totalEpisodes: item.totalEpisodes,
            currentEpisode: item.currentEpisode,
            description: item.description || "No description available", // Thêm description mặc định cho bản vi hoạt động
        };

        const gogo = item.episodesData?.data.find((x) => x.providerId === 'gogoanime');
        const currentEp = gogo?.episodes.find((x) => x.number === item.currentEpisode);
        href = `/anime/watch/${anime.id}/gogoanime/${item.currentEpisode}?epid=${encodeURIComponent(currentEp?.id || '')}&type=sub`;
        } else if (cardid === 'Đề xuất' && item.mediaRecommendation) {
        anime = {
            ...item.mediaRecommendation,
        };
        href = `/anime/info/${anime.id}`;
        } else if (cardid === 'Related Anime' && item.node) {
        anime = {
            ...item.node,
            relationType: item.relationType,
        };
        href = `/anime/info/${anime.id}`;
        } else {
        anime = item;
        href = `/anime/info/${anime.id}`;
        }
        // console.log('Rendering ItemContent, cardid:', cardid, 'anime id:', anime.id);
    return (
        <Link href={href} key={String(anime.id)}>
            <ItemContent anime={anime} cardid={cardid} />
        </Link>
        );
    };
    
    return (
        <div className={styles.animecard}>
        {show && (
            <div className={styles.cardhead}>
            <span className={styles.bar}></span>
            <h1 className={styles.headtitle}>{cardid}</h1>
            </div>
        )}
        <div className={styles.animeitems}>
            <span className={`${styles.leftarrow} ${isLeftArrowActive ? styles.active : styles.notactive}`}>
            <svg onClick={scrollLeft} xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mb-4"><path d="m15 18-6-6 6-6"></path></svg>
            </span>
            <span className={`${styles.rightarrow} ${isRightArrowActive ? styles.active : styles.notactive}`}>
            <svg onClick={scrollRight} xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mb-4"><path d="m9 18 6-6-6-6"></path></svg>
            </span>
            <div className={styles.cardcontainer} id={cardid} {...events} ref={containerRef} onScroll={handleScroll}>
            {data?.length ? data.map(renderItem) : Array.from({ length: 15 }, (_, i) => (
                <div key={i} className={`${styles.carditem} ${styles.loading}`}>
                <div className={`${styles.cardimgcontainer} ${styles.pulse}`} style={{ animationDelay: `${(i + 2) * 0.3}s` }}></div>
                </div>
            ))}
            </div>
        </div>
        </div>
    );
}

export default Animecards;
