import { AnimeItem } from "./anime";

export interface BaseNotification {
  id: string;
  type: string;
  createdAt: number;
  media?: {
    id: number;
    title: {
      native?: string;
      romaji?: string;
      english?: string;
    };
    type?: string;
    coverImage?: {
      large?: string;
      extraLarge?: string;
    };
  };
}

export interface AiringNotification extends BaseNotification {
  episode: number;
  contexts: string[];
  animeId: number;
}

export interface RelatedMediaAdditionNotification extends BaseNotification {
  mediaId: number;
  context: string;
}

export interface MediaDataChangeNotification extends BaseNotification {
  mediaId: number;
  context: string;
}

export interface MediaMergeNotification extends BaseNotification {
  mediaId: number;
  context: string;
}

export interface MediaDeletionNotification extends BaseNotification {
  context: string;
  deletedMediaTitle: string;
}

export type AniListNotification =
  | AiringNotification
  | RelatedMediaAdditionNotification
  | MediaDataChangeNotification
  | MediaMergeNotification
  | MediaDeletionNotification;

export type NotificationData = {
  Page: {
    notifications: AniListNotification[];
  };
};

export type WatchPageInfoData = {
  Media: AnimeItem;
};

export interface MediaListEntry {
  id: number;
  status:
    | "CURRENT"
    | "PLANNING"
    | "COMPLETED"
    | "REPEATING"
    | "PAUSED"
    | "DROPPED"
    | null;
  score: number | null;
  progress: number | null;
  repeat: number | null;
  notes: string | null;
  updatedAt: number;
  startedAt?: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  completedAt?: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  media: {
    id: number;
    title: {
      romaji?: string;
      english?: string;
      native?: string;
    };
    coverImage?: {
      extraLarge?: string;
      large?: string;
    };
    bannerImage?: string;
    episodes?: number;
    nextAiringEpisode?: {
      episode: number;
    };
    status?: string;
  };
}

export type UserListData = {
  Media: {
    mediaListEntry: MediaListEntry;
  };
};

export type MediaListCollection = {
  lists: {
    name: string;
    entries: MediaListEntry[];
  }[];
};

export type UserProfileData = {
  MediaListCollection: MediaListCollection;
};

export type GraphQLResponse<T> = {
  data: T;
};
