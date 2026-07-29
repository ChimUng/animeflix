export interface WatchData {
    userName: string;
    aniId: string;
    aniTitle?: string | null;
    epTitle?: string | null;
    image?: string | null;
    epId?: string | null;
    epNum: number;
    epid?: string | null;
    epnum?: number | null;
    timeWatched?: number | null;
    duration?: number | null;
    provider?: string | null;
    nextepId?: string | null;
    nextepNum?: number | null;
    subtype?: 'sub' | 'dub' | string;
    createdAt: Date;
}

export type UpdateEpParams = Omit<Partial<WatchData>, 'createdAt' | 'userName'> & {
    userName?: string;
    aniId: string;
    epNum: number;
};

export interface DeleteParams {
    epId?: string;
    aniId?: string;
}

export interface DeleteResult {
    message: string;
    remainingData?: WatchData[];
    deletedCount: number;
}