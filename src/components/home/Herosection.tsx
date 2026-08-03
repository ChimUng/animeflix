"use client"
import React, { useEffect, useState, useCallback, useRef } from 'react'
import styles from '../../styles/Herosection.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings, useTitle } from '@/lib/store';
import { useStore } from 'zustand';
import { AnimeItem } from '@/types/anime';
import { PlayIcon, CalendarIcon, EpisodeCountIcon, TagIcon } from '@/lib/SvgIcons';

interface PipedInstance {
    name: string;
    api_url: string;
    locations: string;
    version: string;
    up_to_date: boolean;
    cdn: boolean;
    registered: number;
    last_checked: number;
    cache: boolean;
    s3_enabled: boolean;
    image_proxy_url: string;
    registration_disabled: boolean;
    uptime_24h: number;
    uptime_7d: number;
    uptime_30d: number;
}

interface HerosectionProps {
    data: AnimeItem[];
}

const INSTANCE_LIST_API = 'https://piped-instances.kavin.rocks/'; //https://github.com/teampiped/piped
const INSTANCE_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 tiếng

function Herosection({ data }: HerosectionProps) {
    const settings = useStore(useSettings, (state) => state.settings);
    const setSettings = useStore(useSettings, (state) => state.setSettings);
    const animetitle = useStore(useTitle, (state) => state.animetitle);
    const embedRef = useRef<HTMLIFrameElement>(null);

    const [allBanners, setAllBanners] = useState<AnimeItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [trailer, setTrailer] = useState<string | null>(null);
    const [useEmbed, setUseEmbed] = useState<boolean>(false);
    const [embedFailed, setEmbedFailed] = useState<boolean>(false);
    const [videoEnded, setVideoEnded] = useState<boolean>(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (data && Array.isArray(data) && data.length > 0) {
            const filteredData = data.filter(
                (item) =>
                    item.trailer &&
                    item.trailer.id &&
                    item.id !== 21 &&
                    item.bannerImage !== null &&
                    item.status !== 'NOT_YET_RELEASED'
            );
            setAllBanners(filteredData);
            setCurrentIndex(0);
        }
    }, [data]);

    const currentBanner = allBanners[currentIndex] || null;

    const getLiveInstances = useCallback(async (): Promise<string[]> => {
        const now = Date.now();
        if (
            settings.pipedInstance &&
            settings.pipedCheckedAt &&
            now - settings.pipedCheckedAt < INSTANCE_CACHE_TTL
        ) {
            return [settings.pipedInstance];
        }

        try {
            const res = await fetch(INSTANCE_LIST_API, { signal: AbortSignal.timeout(5000) });
            const list: PipedInstance[] = await res.json();
            const sorted = list
                .filter((i) => i.api_url && i.cache) // cache: true để chắc chắn instance hỗ trợ endpoint /streams được cache tốt
                .sort((a, b) => (b.uptime_24h ?? 0) - (a.uptime_24h ?? 0))
                .slice(0, 5)
                .map((i) => i.api_url);
            return sorted.length > 0 ? sorted : ['https://pipedapi.kavin.rocks'];
        } catch {
            return ['https://pipedapi.kavin.rocks'];
        }
    }, [settings.pipedInstance, settings.pipedCheckedAt]);

    const fetchTrailer = useCallback(async (trailerId: string) => {
        setTrailer(null);
        setUseEmbed(false);
        setVideoEnded(false);

        const instances = await getLiveInstances();

        for (const instance of instances) {
            try {
                const response = await fetch(`${instance}/streams/${trailerId}`, {
                    signal: AbortSignal.timeout(5000),
                });
                if (!response.ok) continue;
                const res = await response.json();

                if (!Array.isArray(res.videoStreams) || res.videoStreams.length === 0) continue;

                let item = res.videoStreams.find(
                    (i: { quality: string; format: string }) => i.quality === '1080p' && i.format === 'WEBM'
                );
                if (!item) item = res.videoStreams.find((i: { quality: string; format: string }) => i.quality === '720p' && i.format === 'WEBM');
                if (!item) item = res.videoStreams.find((i: { quality: string }) => i.quality === '1080p');
                if (!item) item = res.videoStreams.find((i: { quality: string }) => i.quality === '720p');
                if (!item) item = res.videoStreams[0];

                if (item?.url) {
                    setTrailer(item.url);
                    setSettings({ ...settings, pipedInstance: instance, pipedCheckedAt: Date.now() });
                    return;
                }
            } catch {
                continue; 
            }
        }
        setUseEmbed(true);
    }, [getLiveInstances, settings, setSettings]);

    useEffect(() => {
        setEmbedFailed(false);
        if (!isMobile && currentBanner && currentBanner.trailer && settings.herotrailer !== false) {
            fetchTrailer(currentBanner.trailer.id);
        } else {
            setVideoEnded(true);
            setTrailer(null);
            setUseEmbed(false);
        }
    }, [currentBanner, settings.herotrailer, fetchTrailer, isMobile]);

    useEffect(() => {
        if (!useEmbed) return;

        const handleYoutubeMessage = (event: MessageEvent) => {
            if (!event.origin.includes('youtube.com')) return;
            let data: any;
            try {
                data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            } catch {
                return;
            }
            // Video không nhúng được / bị chặn / không tồn tại → fallback ảnh banner
            if (data?.event === 'onError') {
                console.warn('YouTube embed lỗi, fallback sang banner:', data.info);
                setEmbedFailed(true);
            }
            // playerState 0 = ended → chuyển sang banner tiếp theo
            if (data?.event === 'infoDelivery' && data?.info?.playerState === 0) {
                handleVideoEnded();
            }
        };

        window.addEventListener('message', handleYoutubeMessage);
        return () => window.removeEventListener('message', handleYoutubeMessage);
    }, [useEmbed]);

    const handleVideoEnded = () => setVideoEnded(true);
    const handleVideoError = () => setUseEmbed(true);

    const Month: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const handleDotClick = (index: number) => setCurrentIndex(index);

    const goToNext = useCallback(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % allBanners.length);
    }, [allBanners.length]);

    const handleEmbedLoad = () => {
        embedRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'listening', id: currentBanner?.trailer?.id }),
            '*'
        );
    };

    const isTrailerPlaying =
        settings.herotrailer !== false &&
        !videoEnded &&
        ((trailer && !useEmbed) || (useEmbed && !embedFailed && !!currentBanner?.trailer?.id));

    useEffect(() => {
        if (allBanners.length > 1 && !isTrailerPlaying) {
            const interval = setInterval(() => goToNext(), 8000);
            return () => clearInterval(interval);
        }
    }, [allBanners, goToNext, isTrailerPlaying]);

    return (
        <div className={styles.herosection}>
            <div className={styles.herogradient}></div>
            {currentBanner && (
                <>
                    {!isMobile && trailer && !useEmbed && !videoEnded && settings.herotrailer !== false ? (
                        <span className={styles.heroimgcon}>
                            <video
                                src={trailer}
                                preload="auto"
                                autoPlay
                                muted
                                playsInline
                                disablePictureInPicture
                                className={styles.herovideo}
                                onEnded={handleVideoEnded}
                                onError={handleVideoError}
                            ></video>
                        </span>
                    ) : !isMobile && useEmbed && !embedFailed && currentBanner.trailer?.id && !videoEnded && settings.herotrailer !== false ? (
                        <span className={`${styles.heroimgcon} relative overflow-hidden`}>
                            <iframe
                                ref={embedRef}
                                src={`https://www.youtube.com/embed/${currentBanner.trailer.id}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&loop=1&playlist=${currentBanner.trailer.id}&enablejsapi=1&playsinline=1`}
                                title="Hero Trailer"
                                allow="autoplay; encrypted-media"
                                className={styles.heroembed}
                                onLoad={handleEmbedLoad}
                            ></iframe>
                        </span>
                    ) : (
                        <span className={`${styles.heroimgcon} relative`}>
                            {currentBanner.bannerImage && (
                                <Image
                                    src={currentBanner.bannerImage}
                                    alt={currentBanner.title?.[animetitle] || currentBanner.title?.romaji || "Anime Image"}
                                    loading='eager'
                                    priority={true}
                                    width={1920}
                                    height={1080}
                                    className={styles.heroimg}
                                />
                            )}
                        </span>
                    )}

                    <div className={`${styles.heroinfo} opacity-100 translate-y-0 transition-all duration-700 ease-in-out`}>
                        <h3 className={styles.spotlight}>
                            #Top {allBanners.indexOf(currentBanner) !== -1 ? allBanners.indexOf(currentBanner) + 1 : ''} xu hướng
                        </h3>
                        <h1 className={styles.herotitle}>
                            {currentBanner.title?.[animetitle] || currentBanner.title?.romaji}
                        </h1>
                        <div className={styles.herocontent}>
                            <span className='flex'>
                                <PlayIcon className='w-5 h-5 mr-1 text-d234' />
                                {currentBanner.format}
                            </span>
                            <span className={`${currentBanner.status === 'RELEASING' ? styles.activestatus : styles.notactive}`}>
                                {currentBanner.status}
                            </span>
                            <span className='flex'>
                                <CalendarIcon className="w-5 h-5 mr-1 text-d656" />
                                {currentBanner.startDate && `${Month[currentBanner.startDate.month! - 1]} ${currentBanner.startDate.day}, ${currentBanner.startDate.year}`}
                            </span>
                            <span className="flex items-center">
                                <EpisodeCountIcon className="w-5 h-5 mb-1 mr-1 text-d234" />
                                Tập {currentBanner.nextAiringEpisode?.episode ? currentBanner.nextAiringEpisode.episode - 1 : currentBanner.episodes}
                            </span>
                        </div>
                        {currentBanner.genres && currentBanner.genres.length > 0 && (
                            <span className="flex items-center gap-1 text-sm text-white mt-0 mb-2">
                                <TagIcon className="w-4 h-4 fill-green-400 text-white/70" />
                                Thể loại: {currentBanner.genres.slice(0, 3).join(', ')}
                            </span>
                        )}
                        <p className={styles.herodescription}>
                            {currentBanner.description?.replace(/<.*?>/g, '') || "No description available"}
                        </p>
                        <div className={styles.herobuttons}>
                            <Link href={`/anime/info/${currentBanner.id}`}>
                                <button className="flex items-center px-4 py-2 rounded-full font-medium text-white bg-d234 transition-all duration-300 ease-in-out hover:scale-105 hover:bg-d148h animate-in fade-in">
                                    <PlayIcon className='w-5 h-5 mr-1' />
                                    Xem Ngay
                                </button>
                            </Link>
                        </div>
                    </div>

                    {allBanners.length > 1 && (
                        <div className={styles.carouselDots}>
                            {allBanners.map((_, index) => (
                                <span
                                    key={index}
                                    className={`
                                            ${styles.dot}
                                            ${index === currentIndex ? `${styles.activeDot} animate-in zoom-in` : 'opacity-70'}
                                            hover:scale-125 hover:bg-d234
                                            transition-all duration-300 ease-in-out
                                            `}
                                    onClick={() => handleDotClick(index)}
                                ></span>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Herosection;