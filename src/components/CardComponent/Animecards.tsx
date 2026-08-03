'use client';
import React, { useRef, useState , useEffect } from 'react';
import styles from '../../styles/Animecard.module.css';
import { useDraggable } from 'react-use-draggable-scroll';
import Link from 'next/link';
import ItemContent from './ItemContent';
import { LeftArrowIcon, RightArrowIcon } from '@/lib/SvgIcons'; 
import { AnimeItem } from '@/types/anime'; 

interface AnimecardsProps {
    data: AnimeItem[];
    cardid: string;
    show?: boolean;
    viewMoreHref?: string;
}

function Animecards({ data, cardid, show = true, viewMoreHref }: AnimecardsProps) {
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
        let anime: AnimeItem;
        let href = '';

        if (cardid === 'Các tập gần đây') {
            anime = { ...item };
            href = `/anime/info/${anime.id}`;
            
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
                <div className="flex items-center gap-2">
                    <span className={styles.bar}></span>
                    <h1 className={styles.headtitle}>{cardid}</h1>
                </div>

                {viewMoreHref && (
                    <Link
                        href={viewMoreHref}
                        className="group/more flex items-center rounded-full border border-white/25 px-2.5 py-1 overflow-hidden transition-all duration-300 hover:gap-1.5 hover:border-star"
                    >
                        <span className="max-w-0 opacity-0 whitespace-nowrap overflow-hidden text-star text-sm font-medium transition-all duration-300 group-hover/more:max-w-[80px] group-hover/more:opacity-100">
                            Xem thêm
                        </span>
                        <RightArrowIcon className="w-4 h-4 text-white/70 transition-colors duration-300 group-hover/more:text-star" />
                    </Link>
                )}
            </div>
        )}
        <div className={styles.animeitems}>
            <span className={`${styles.leftarrow} ${isLeftArrowActive ? styles.active : styles.notactive}`}>
                <LeftArrowIcon onClick={scrollLeft} width="28" height="28" className="mb-4" />
            </span>
            <span className={`${styles.rightarrow} ${isRightArrowActive ? styles.active : styles.notactive}`}>
                <RightArrowIcon onClick={scrollRight} width="28" height="28" className="mb-4" />
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
