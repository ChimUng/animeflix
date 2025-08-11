// DetailsContainer.tsx
"use client";
import React, { useState, useEffect } from 'react';
import Episodesection from '@/components/Episodesection';
import AnimeDetailsTop from '@/components/details/AnimeDetailsTop';
import AnimeDetailsBottom from '@/components/details/AnimeDetailsBottom';
import Animecards from '@/components/CardComponent/Animecards';
import { getUserLists } from '@/lib/AnilistUser';

interface DetailsContainerProps {
    data: any;
    id: number;
    session: any;
}

const DetailsContainer: React.FC<DetailsContainerProps> = ({ data, id, session }) => {
    const [list, setList] = useState<any>(null);
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchlist = async () => {
        const data = await getUserLists(session?.user?.token, id);
        setList(data);
        };
        fetchlist();
    }, [id, session]);

    const progress = list !== null ? (list?.status === 'COMPLETED' ? 0 : list?.progress) : 0;

    return (
        <>
        <div className='h-[500px] '>
            <AnimeDetailsTop data={data} list={list} session={session} setList={setList} url={url} />
        </div>
        <AnimeDetailsBottom data={data} id={id} />
        <Episodesection data={data} id={id} setUrl={setUrl} progress={progress} />
        {data?.recommendations?.nodes?.length > 0 && (
            <div className="recommendationglobal">
            <Animecards data={data.recommendations.nodes} cardid={"Đề xuất"} />
            </div>
        )}
        </>
    );
};

export default DetailsContainer;
