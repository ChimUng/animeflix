"use client";
import React, { useState, useEffect } from 'react';
import Episodesection from '@/components/Episodesection';
import AnimeDetailsTop from '@/components/details/AnimeDetailsTop';
import AnimeDetailsBottom from '@/components/details/AnimeDetailsBottom';
import Animecards from '@/components/CardComponent/Animecards';
import { AnimeItem } from '@/types/anime';
import { MediaListEntry } from '@/types/anilist';
import { getUserLists } from '@/lib/AnilistUser';
import type { Session } from "next-auth";

import CoralComments from '@/components/CommentComponent/CoralComments';

interface DetailsContainerProps {
    data: AnimeItem;
    id: number;
    session: Session | null;
}

const DetailsContainer: React.FC<DetailsContainerProps> = ({ data, id, session }) => {
    const [list, setList] = useState<MediaListEntry | null>(null);
    const [url, setUrl] = useState<string | null>(null);
    const appUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'http://localhost:3000';

    useEffect(() => {
        const fetchList = async () => {
            const token = session?.user?.token;
            if (!token) {
                setList(null);
                return;
            }
            const entry = await getUserLists(token, id);
            setList(entry ?? null);
        };
        fetchList();
    }, [id, session]);

    const progress = list ? (list.status === 'COMPLETED' ? 0 : list.progress ?? 0) : 0;

    const recommendations = data.recommendations?.nodes
        ?.map(n => n.mediaRecommendation)
        .filter((a): a is AnimeItem => Boolean(a)) ?? [];

    return (
        <>
        <div className='h-[500px] '>
            <AnimeDetailsTop data={data} list={list} session={session} setList={setList} url={url} />
        </div>
        <AnimeDetailsBottom data={data} />
        <Episodesection data={data} id={id} setUrl={setUrl} progress={progress} />
        {recommendations.length > 0 && (
            <div className="recommendationglobal">
            <Animecards data={recommendations} cardid={"Đề xuất"} />
            </div>
        )}
        <div className="max-w-[85%] max-[1200px]:max-w-[90%] max-[900px]:max-w-[95%] max-[600px]:max-w-[98%] mx-auto mb-6">
            <CoralComments
                storyId={`anime-info-${id}`}
                storyUrl={`${appUrl}/anime/info/${id}`}
            />
        </div>
        </>
    );
};

export default DetailsContainer;