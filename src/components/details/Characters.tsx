"use client";
import React, { useRef, useState } from 'react';
import styles from '../../styles/Animecard.module.css';
import { useDraggable } from 'react-use-draggable-scroll';
import Image from 'next/image';
import { CharacterEdge } from '@/types/anime';
import { LeftArrowIcon, RightArrowIcon } from '@/lib/SvgIcons'; 

interface CharactersProps {
    data: CharacterEdge[];
}

function Characters({ data }: CharactersProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { events } = useDraggable(containerRef as React.MutableRefObject<HTMLDivElement>);
    const [isLeftArrowActive, setIsLeftArrowActive] = useState(false);
    const [isRightArrowActive, setIsRightArrowActive] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    function handleScroll() {
        const container = containerRef.current;
        if (!container) return;

        const scrollPosition = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;

        setIsLeftArrowActive(scrollPosition > 30);
        setIsRightArrowActive(scrollPosition < maxScroll - 30);
    }

    const smoothScroll = (amount: number) => {
        const container = containerRef.current;
        const cont = document.getElementById("cardid");

        if (cont && container) {
        cont.classList.add('scroll-smooth');
        container.scrollLeft += amount;

        setTimeout(() => {
            cont.classList.remove('scroll-smooth');
        }, 300);
        }
    };

    function scrollLeft() {
        smoothScroll(-500);
    }

    function scrollRight() {
        smoothScroll(500);
    }

    return (
        <div className={styles.animecard}>
        <div className={styles.animeitems}>
            <span className={`${styles.leftarrow} ${isLeftArrowActive ? styles.active : styles.notactive}`}>
                <LeftArrowIcon onClick={scrollLeft} width="28" height="28" className="mb-4" />
            </span>
            <span className={`${styles.rightarrow} ${isRightArrowActive ? styles.active : styles.notactive}`}>
                <RightArrowIcon onClick={scrollRight} width="28" height="28" className="mb-4" />
            </span>
            <div
            className={styles.cardcontainer}
            id="cardid"
            {...events}
            ref={containerRef}
            onScroll={handleScroll}
            >
            {data?.map((character, index) => (
                <div className="h-full" key={character.id ?? index}>
                <div
                    className="w-[135px] md:w-[155px] xl:w-[175px] h-[200px] md:h-[230px] xl:h-[265px] relative rounded-lg cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                >
                    <Image
                    className={`w-full h-full rounded-lg transition-opacity duration-500 absolute ${hoveredIndex === index ? 'opacity-0' : 'opacity-100'} top-0 left-0`}
                    src={character?.node?.image?.large}
                    alt={character?.node?.name?.full ?? ''}
                    width={170}
                    height={230}
                    />
                    {character?.voiceActorRoles?.[0]?.voiceActor?.image?.large && (
                        <Image
                        className="w-full h-full top-0 left-0 rounded-lg"
                        src={character.voiceActorRoles[0].voiceActor.image.large}
                        alt={character?.node?.name?.full ?? ''}
                        width={170}
                        height={230}
                        />
                    )}
                    <div className="p-2 absolute top-0 left-0 align-bottom flex flex-col-reverse w-full h-full bg-gradient-to-b from-transparent via-transparent to-black">
                    <div className="font-medium text-xs opacity-80 text-white">{character.role}</div>
                    <div className="font-semibold text-white text-sm">
                        {hoveredIndex === index
                        ? character?.voiceActorRoles?.[0]?.voiceActor?.name?.full
                        : character?.node?.name?.full}
                    </div>
                    </div>
                </div>
                </div>
            ))}
            </div>
        </div>
        </div>
    );
}

export default Characters;
