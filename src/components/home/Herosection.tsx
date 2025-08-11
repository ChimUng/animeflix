"use client"
import React, { useEffect, useState, useCallback } from 'react'; // Thêm useCallback
import styles from '../../styles/Herosection.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings, useTitle } from '@/lib/store';
import { useStore } from 'zustand';

// Định nghĩa kiểu cho một đối tượng AnimeItem (giữ nguyên)
interface AnimeItem {
    id: number;
    title: {
        romaji: string;
        english?: string;
        native?: string;
    };
    bannerImage: string | null;
    trailer?: {
        id: string;
        site?: string;
        thumbnail?: string;
    };
    format?: string;
    status?: string;
    startDate?: {
        year: number;
        month: number;
        day: number;
    };
    nextAiringEpisode?: {
        episode: number;
    };
    episodes?: number;
    description: string;
}

interface HerosectionProps {
    data: AnimeItem[];
}

function Herosection({ data }: HerosectionProps) {
    const settings = useStore(useSettings, (state) => state.settings);
    const animetitle = useStore(useTitle, (state) => state.animetitle);

    // THAY ĐỔI 1: Lưu trữ tất cả các banner có thể hiển thị
    const [allBanners, setAllBanners] = useState<AnimeItem[]>([]);
    // THAY ĐỔI 2: Index của banner hiện tại
    const [currentIndex, setCurrentIndex] = useState<number>(0);

    const [trailer, setTrailer] = useState<string | null>(null);
    const [videoEnded, setVideoEnded] = useState<boolean>(false);

    // Lấy dữ liệu banner khi data thay đổi
    useEffect(() => {
        if (data && Array.isArray(data) && data.length > 0) {
            const filteredData = data.filter(
                (item: AnimeItem) =>
                    item.trailer &&
                    item.trailer.id &&
                    item.id !== 21 && // Giữ nguyên điều kiện lọc của bạn
                    item.bannerImage !== null &&
                    item.status !== 'NOT_YET_RELEASED'
            );
            setAllBanners(filteredData);
            setCurrentIndex(0); // Reset về banner đầu tiên khi dữ liệu thay đổi
        }
    }, [data]);

    // Lấy banner hiện tại từ allBanners
    const currentBanner = allBanners[currentIndex] || null;

    // Hàm fetchTrailer được tách ra và sử dụng useCallback
    const fetchTrailer = useCallback(async (trailerId: string) => {
        // setTrailer(null); // Reset trailer khi chuyển banner
        // setVideoEnded(false); // Reset trạng thái video
        // try {
        //     const response = await fetch(`https://pipedapi.kavin.rocks/streams/${trailerId}`);
        //     const res = await response.json();

        //     // console.log("Piped API Full Response for trailerId", trailerId, ":", res);

        //     if (!Array.isArray(res.videoStreams) || res.videoStreams.length === 0) {
        //         // console.warn("No valid videoStreams found in API response for trailerId:", trailerId, res);
        //         setVideoEnded(true);
        //         return;
        //     }

        //     let item = res.videoStreams.find(
        //         (i: { quality: string; format: string; url: string }) =>
        //             i.quality === '1080p' && i.format === 'WEBM'
        //     );
        //     // Thêm logic tìm kiếm định dạng khác nếu cần (như đã thảo luận trước)
        //     if (!item) item = res.videoStreams.find((i: { quality: string; format: string; url: string }) => i.quality === '720p' && i.format === 'WEBM');
        //     if (!item) item = res.videoStreams.find((i: { quality: string; format: string; url: string }) => i.quality === '1080p');
        //     if (!item) item = res.videoStreams.find((i: { quality: string; format: string; url: string }) => i.quality === '720p');
        //     if (!item && res.videoStreams.length > 0) item = res.videoStreams[0];


        //     if (item && item.url) {
        //         setTrailer(item.url);
        //     } else {
        //         console.warn("Found video stream item but no URL:", item);
        //         setVideoEnded(true);
        //     }
        // } catch (error) {
        //     // console.error('Error fetching trailer for ID', trailerId, ':', error);
        //     setVideoEnded(true);
        // }
    }, []); // Dependencies của useCallback: không có gì nếu fetchTrailer không dùng state/props bên ngoài

    // useEffect để fetch trailer cho banner hiện tại
    useEffect(() => {
        if (currentBanner && currentBanner.trailer && settings.herotrailer !== false) {
            fetchTrailer(currentBanner.trailer.id);
        } else {
            // Nếu không có trailer hoặc tính năng bị tắt, đảm bảo hiển thị ảnh
            setVideoEnded(true);
            setTrailer(null); // Đảm bảo trailer là null để render ảnh
        }
    }, [currentBanner, settings, fetchTrailer]); // currentBanner và settings là dependencies

    const handleVideoEnded = () => {
        setVideoEnded(true);
    };

    const handleVideoError = () => {
        setVideoEnded(true);
    };

    const Month: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Hàm xử lý khi click vào dot
    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    // Hàm xử lý nút Next/Prev (tùy chọn)
    const goToNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % allBanners.length);
    };

    const goToPrev = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + allBanners.length) % allBanners.length);
    };

    // Tự động chuyển đổi sau một khoảng thời gian (Tùy chọn)
    useEffect(() => {
        if (allBanners.length > 1) { // Chỉ tự động chuyển nếu có nhiều hơn 1 banner
            const interval = setInterval(() => {
                goToNext();
            }, 8000); // Chuyển đổi mỗi 8 giây

            return () => clearInterval(interval); // Dọn dẹp interval khi component unmount hoặc dependencies thay đổi
        }
    }, [allBanners, goToNext]); // Thêm goToNext vào dependencies

    return (
        <div className={`${styles.herosection}`}>
            <div className={styles.herogradient}></div>
            {currentBanner && ( // Đảm bảo có banner để hiển thị
                <>
                    {/* Phần hiển thị Video hoặc Image */}
                    {trailer && !videoEnded && settings.herotrailer !== false ? (
                        <span className={styles.heroimgcon}>
                            {/* Nếu dùng iframe YouTube, thay thế thẻ <video> này */}
                            <video
                                src={trailer}
                                preload="auto"
                                autoPlay
                                muted
                                className={styles.herovideo}
                                onEnded={handleVideoEnded}
                                onError={handleVideoError}
                            ></video>
                        </span>
                    ) : (
                        <span className={`${styles.heroimgcon} relative`}>
                            {currentBanner.bannerImage && (
                                <Image
                                    src={currentBanner.bannerImage}
                                    alt={currentBanner.title?.[animetitle as keyof typeof currentBanner.title] || currentBanner.title?.romaji || "Anime Image"}
                                    loading='eager'
                                    priority={true}
                                    width={1920}
                                    height={1080}
                                    className={styles.heroimg}
                                />
                            )}
                        </span>
                    )}

                    {/* Phần thông tin Anime */}
                    <div className={`${styles.heroinfo} opacity-100 translate-y-0 transition-all duration-700 ease-in-out`}>
                        <h3 className={styles.spotlight}>
                            #Top {allBanners.indexOf(currentBanner) !== -1 ? allBanners.indexOf(currentBanner) + 1 : ''} xu hướng
                        </h3>
                        <h1 className={styles.herotitle}>
                            {currentBanner.title?.[animetitle as keyof typeof currentBanner.title] || currentBanner.title?.romaji}
                        </h1>
                        <div className={styles.herocontent}>
                            <span className='flex'>
                                <svg xmlns="http://www.w3.org/2000/svg" className='w-5 h-5 mr-1 text-d234' viewBox="0 0 48 48"><defs><mask id="ipSPlay0"><g fill="none" strokeLinejoin="round" strokeWidth="4"><path fill="#fff" stroke="#fff" d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4S4 12.954 4 24s8.954 20 20 20Z"/><path fill="#000" stroke="#000" d="M20 24v-6.928l6 3.464L32 24l-6 3.464l-6 3.464z"/></g></mask></defs><path fill="currentColor" d="M0 0h48v48H0z" mask="url(#ipSPlay0)"/></svg>
                                {currentBanner.format}
                            </span>
                            <span className={`${currentBanner.status === 'RELEASING' ? styles.activestatus : styles.notactive}`}>
                                {currentBanner.status}
                            </span>
                            <span className='flex '>
                                <svg className="w-5 h-5 mr-1 text-d656" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 10h16M8 14h8m-4-7V4M7 7V4m10 3V4M5 20h14c.6 0 1-.4 1-1V7c0-.6-.4-1-1-1H5a1 1 0 0 0-1 1v12c0 .6.4 1 1 1Z" />
                                </svg>
                                {currentBanner.startDate && `${Month[currentBanner.startDate.month - 1]} ${currentBanner.startDate.day}, ${currentBanner.startDate.year}`}
                            </span>
                            <span className="flex items-center">
                                <svg viewBox="0 0 32 32" className="w-5 h-5 mb-1 mr-1 text-d234" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M4.6661 6.66699C4.29791 6.66699 3.99943 6.96547 3.99943 7.33366V24.667C3.99943 25.0352 4.29791 25.3337 4.6661 25.3337H27.3328C27.701 25.3337 27.9994 25.0352 27.9994 24.667V7.33366C27.9994 6.96547 27.701 6.66699 27.3328 6.66699H4.6661ZM8.66667 21.3333C8.29848 21.3333 8 21.0349 8 20.6667V11.3333C8 10.9651 8.29848 10.6667 8.66667 10.6667H14C14.3682 10.6667 14.6667 10.9651 14.6667 11.3333V12.6667C14.6667 13.0349 14.3682 13.3333 14 13.3333H10.8C10.7264 13.3333 10.6667 13.393 10.6667 13.4667V18.5333C10.6667 18.607 10.7264 18.6667 10.8 18.6667H14C14.3682 18.6667 14.6667 18.9651 14.6667 19.3333V20.6667C14.6667 21.0349 14.3682 21.3333 14 21.3333H8.66667ZM18 21.3333C17.6318 21.3333 17.3333 21.0349 17.3333 20.6667V11.3333C17.3333 10.9651 17.6318 10.6667 18 10.6667H23.3333C23.7015 10.6667 24 10.9651 24 11.3333V12.6667C24 13.0349 23.7015 13.3333 23.3333 13.3333H20.1333C20.0597 13.3333 20 13.393 20 13.4667V18.5333C20 18.607 20.0597 18.6667 20.1333 18.6667H23.3333C23.7015 18.6667 24 18.9651 24 19.3333V20.6667C24 21.0349 23.7015 21.3333 23.3333 21.3333H18Z" fill="currentColor"></path></svg>
                                Tập {currentBanner.nextAiringEpisode?.episode ? currentBanner.nextAiringEpisode.episode - 1 : currentBanner.episodes}
                            </span>
                        </div>
                        <p className={styles.herodescription}>
                            {currentBanner.description?.replace(/<.*?>/g, '') || "No description available"}
                        </p>
                        <div className={styles.herobuttons}>
                            <Link href={`/anime/info/${currentBanner.id}`}>
                                <button className="flex items-center px-4 py-2 rounded-full font-medium text-white bg-d234 transition-all duration-300 ease-in-out hover:scale-105 hover:bg-[#d14836] animate-in fade-in">
                                    <svg xmlns="http://www.w3.org/2000/svg" className='w-5 h-5 mr-1' viewBox="0 0 48 48"><defs><mask id="ipSPlay0"><g fill="none" strokeLinejoin="round" strokeWidth="4"><path fill="#fff" stroke="#fff" d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4S4 12.954 4 24s8.954 20 20 20Z"/><path fill="#000" stroke="#000" d="M20 24v-6.928l6 3.464L32 24l-6 3.464l-6 3.464z"/></g></mask></defs><path fill="currentColor" d="M0 0h48v48H0z" mask="url(#ipSPlay0)"/></svg>
                                    Xem Ngay
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* THÊM CÁC DOTS VÀO ĐÂY */}
                    {allBanners.length > 1 && ( // Chỉ hiển thị dots nếu có nhiều hơn 1 banner
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