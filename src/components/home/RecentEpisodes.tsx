"use client";
import React, { useEffect, useState } from 'react';
import Animecards from '@/components/CardComponent/Animecards';
import { getRecentEpisodes } from '@/lib/getData';
import { RecentEpisode } from '@/types/episode';

interface RecentEpisodesProps {
  cardid: string;
  viewMoreHref?: string;
}

function RecentEpisodes({ cardid, viewMoreHref }: RecentEpisodesProps) {
  const [data, setData] = useState<RecentEpisode[]>([]);

   useEffect(() => {
    let cancelled = false;
    getRecentEpisodes().then((res) => { if (!cancelled) setData(res ?? []); });
    return () => { cancelled = true; };
  }, []);

  return <Animecards data={data} cardid={cardid} viewMoreHref={viewMoreHref} />;
}

export default RecentEpisodes;