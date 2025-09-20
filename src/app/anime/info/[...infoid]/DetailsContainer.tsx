// DetailsContainer.tsx
"use client";
import React, { useState, useEffect } from 'react';
import Episodesection from '@/components/Episodesection';
import AnimeDetailsTop from '@/components/details/AnimeDetailsTop';
import AnimeDetailsBottom from '@/components/details/AnimeDetailsBottom';
import Animecards from '@/components/CardComponent/Animecards';
import { AnimeItem } from '@/lib/types';
import type { Session } from "next-auth";

interface DetailsContainerProps {
    data: AnimeItem; 
    id: number;
    session: Session | null;
}

interface UserList {
    id: number;
    mediaId: number;
    progress: number;
    status: string;
}

const DetailsContainer: React.FC<DetailsContainerProps> = ({ data, id, session }) => {
    const [list, setList] = useState<UserList | null | undefined>(null);
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchlist = async () => {
        if (data) {
            const mapped: UserList = {
                id: Number(data.id),
                mediaId: id,         
                progress: data.progress || 0,
                status: data.status || "PLANNING",
            };
            setList(mapped);
        } else {
            setList(null);
        }
        };
        fetchlist();
    }, [id, session]);

    const progress = list !== null ? (list?.status === 'COMPLETED' ? 0 : list?.progress ?? 0) : 0;

    return (
        <>
        <div className='h-[500px] '>
            <AnimeDetailsTop data={data} list={list} session={session} setList={setList} url={url} />
        </div>
        <AnimeDetailsBottom data={data} id={id} />
        <Episodesection data={data} id={id} setUrl={setUrl} progress={progress} />
        {data.recommendations?.nodes && data.recommendations.nodes.length > 0 && (
            <div className="recommendationglobal">
            <Animecards data={data.recommendations.nodes.map(n => n.mediaRecommendation)} cardid={"Đề xuất"} />
            </div>
        )}
        </>
    );
};

export default DetailsContainer;
