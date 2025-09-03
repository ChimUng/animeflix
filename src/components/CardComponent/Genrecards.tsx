'use client';
import React, { useRef, useState, useEffect } from 'react';
import { useDraggable } from 'react-use-draggable-scroll';
import Link from 'next/link';
import styles from '../../styles/Genrecard.module.css'; // dùng riêng style này
import { genreCovers, genreOptions } from '../catalogcomponent/options';

function GenreCard() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { events } = useDraggable(containerRef as React.MutableRefObject<HTMLDivElement>);
    const [leftActive, setLeftActive] = useState(false);
    const [rightActive, setRightActive] = useState(false);

    useEffect(() => {
        handleScroll();
    }, [genreOptions]);

    const handleScroll = () => {
        const container = containerRef.current;
        if (container) {
        const scrollPos = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;
        setLeftActive(scrollPos > 10);
        setRightActive(scrollPos < maxScroll - 10);
        }
    };

    const scroll = (amount: number) => {
        const container = containerRef.current;
        if (container) {
        container.scrollBy({ left: amount, behavior: 'smooth' });
        setTimeout(() => handleScroll(), 350);
        }
    };

    return (
        <div className={styles.genrecard}>
        <div className={styles.genrehead}>
            <span className={styles.genrebar}></span>
            <h1 className={styles.genretitle}>Thể Loại</h1>
        </div>

        <div className={styles.genreitems}>
            <span className={`${styles.leftarrow}`}>
            <button
                className={`${styles.arrowbtn} ${leftActive ? styles.arrowactive : styles.arrowinactive}`}
                onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                scroll(-500);
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" fill="none"><path d="M15 18L9 12L15 6" /></svg>
            </button>
            </span>

            <span className={`${styles.rightarrow}`}>
            <button
                className={`${styles.arrowbtn} ${rightActive ? styles.arrowactive : styles.arrowinactive}`}
                onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                scroll(500);
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" fill="none"><path d="M9 6L15 12L9 18" /></svg>
            </button>
            </span>

            <div
            ref={containerRef}
            className={styles.genrecontainer}
            onScroll={handleScroll}
            {...events} 
            >
            {genreOptions.map((genre) => {
                const cover = genreCovers[genre.value as keyof typeof genreCovers];
                if (!cover) return null;
                return (
                <Link href={`anime/catalog?genres=${genre.value}&year=2025`} key={genre.value} className="mr-3">
                    <div className="relative group w-44 h-24 md:w-48 md:h-28 lg:w-60 lg:h-32 rounded-2xl overflow-hidden">
                    <img
                        src={cover}
                        alt={genre.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-black opacity-20 z-10"></div>
                    <div className="absolute inset-x-0 bottom-0 text-white font-medium bg-black/30 backdrop-blur-sm text-sm md:text-base text-center py-1 sm:py-2 z-20">
                        {genre.name}
                    </div>
                    </div>
                </Link>
                );
            })}
            </div>
        </div>
        </div>
    );
}

export default GenreCard;
