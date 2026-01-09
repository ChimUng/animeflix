"use client"

import React, { useState } from 'react'
import styles from '../../../styles/AnimeDetailsBottom.module.css'
import { Tooltip } from "@nextui-org/react"
import { useTranslationCache } from '@/lib/useTranslationCache'; 
import { AnimeItem } from '@/lib/types';

interface OverviewProps {
    data: AnimeItem
    id: number; 
}

const Overview: React.FC<OverviewProps> = ({ data, id }) => {
    const [showFullDescription, setShowFullDescription] = useState(false)
    // GỌI HOOK Ở ĐÂY
    const { descriptionVI } = useTranslationCache(
        id,
        data.title.romaji || "", 
        data.description || "Không có mô tả"
    );

    const toggleDescription = () => {
        setShowFullDescription(!showFullDescription)
    }

    const getAiringTime = (airingdate: number): string => {
        const timeDifference = airingdate * 1000 - Date.now()
        const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60))
        return `${days}d ${hours}h ${minutes}m`
    }

    const getAiringTimeUnix = (seconds: number): string => {
        const date = new Date(seconds * 1000)
        const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
        }
        return date.toLocaleString('en-US', options)
    }

    const aired = (m: number): string => {
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return month[m] || ''
    }

     const displayDescription = descriptionVI || data.description || '';

    return (
        <div className={styles.detailscard}>
        <div className={styles.card1}>
            <h3 className={styles.detailsheading}>Chi tiết</h3>
            <div className={styles.detailscontent}>
            {data?.status === 'RELEASING' && data?.nextAiringEpisode?.airingAt && (
                <div className={styles.singlecontent}>
                <span className={`${styles.sideheading} font-semibold !text-[15px]`}>Tập kế</span>
                <Tooltip
                    content={getAiringTimeUnix(data.nextAiringEpisode.airingAt)}
                    size="sm"
                    classNames={{
                    base: ["before:bg-neutral-400 dark:before:bg-white"],
                    content: [
                        "py-2 px-4 shadow-xl",
                        "text-black font-medium bg-gradient-to-br from-white to-neutral-400",
                    ],
                    }}
                >
                    <span className={`${styles.con} !text-white cursor-pointer`} suppressHydrationWarning>
                    Tập {data.nextAiringEpisode.episode}: {getAiringTime(data.nextAiringEpisode.airingAt)}
                    </span>
                </Tooltip>
                </div>
            )}

            <div className={styles.singlecontent}>
                <span className={styles.sideheading}>Loại</span> <span className={styles.con}>{data?.format}</span>
            </div>
            <div className={styles.singlecontent}>
                <span className={styles.sideheading}>Số tập</span>
                <span className={styles.con}>
                {data?.episodes ?? (data?.nextAiringEpisode?.episode ? data.nextAiringEpisode.episode - 1 : '?')}
                </span>
            </div>
            <div className={styles.singlecontent}>
                <span className={styles.sideheading}>Thể loại</span>
                <span className={styles.con}>{data?.genres?.join(', ')}</span>
            </div>
            <div className={styles.singlecontent}>
                <span className={styles.sideheading}>Phát hành</span>
                <span className={styles.con}>
                {data?.startDate &&
                    `${aired(data.startDate.month - 1)}, ${data.startDate.day} ${data.startDate.year}`}
                {data?.endDate?.day && (
                    <>
                    {' '}to{' '}
                    <div>
                        {aired(data.endDate.month - 1)} {data.endDate.day}, {data.endDate.year}
                    </div>
                    </>
                )}
                </span>
            </div>
            <div className={styles.singlecontent}>
                <span className={styles.sideheading}>Trạng thái</span>
                <span className={styles.con}>{data?.status}</span>
            </div>
            <div className={styles.singlecontent}>
                <span className={styles.sideheading}>Mùa</span>
                <span className={styles.con}>{`${data?.season ?? ''} ${data?.seasonYear ?? ''}`}</span>
            </div>
            <div className={styles.singlecontent}>
                <span className={styles.sideheading}>Quốc gia</span>
                <span className={styles.con}>{data?.countryOfOrigin}</span>
            </div>
            <div className={styles.singlecontent}>
                <span className={styles.sideheading}>Studios</span>
                <span className={styles.con}>{data?.studios?.nodes?.[0]?.name}</span>
            </div>
            <div className={styles.singlecontent}>
                <span className={styles.sideheading}>Nguồn</span>
                <span className={styles.con}>{data?.source}</span>
            </div>
            <div className={styles.singlecontent}>
                <span className={styles.sideheading}>Thời gian</span>
                <span className={styles.con}>{data?.duration ? `${data.duration} phút` : 'Na'}</span>
            </div>
            <div className={styles.singlecontent}>
                <span className={styles.sideheading}>Lượt xem</span>
                <span className={styles.con}>{`${data?.popularity ?? 0} người dùng`}</span>
            </div>
            </div>
        </div>

        <div className={styles.card2}>
            <h3 className={styles.detailsheading}>Mô tả</h3>
            <div className={styles.descriptioncontent}>
                <p dangerouslySetInnerHTML={{ __html: displayDescription }} />
            </div>

            <div className={styles.descriptioncontentmobile}>
            <p
                dangerouslySetInnerHTML={{
                    __html: showFullDescription
                        ? displayDescription
                        : `${displayDescription.slice(0, 250)}...`,
                }}
            />
            {data?.description && data.description.length > 250 && (
                <button className={styles.readMoreButton} onClick={toggleDescription}>
                {showFullDescription ? 'Thu gọn' : 'Xem thêm'}
                </button>
            )}
            </div>
        </div>
        </div>
    )
}

export default Overview
