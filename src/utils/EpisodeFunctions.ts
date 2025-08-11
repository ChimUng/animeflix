export interface ImageDataItem {
  number?: number;
  episode?: number;
  img?: string;
  image?: string;
  title?: string | { en?: string; ["x-jat"]?: string };
  description?: string;
  overview?: string;
  summary?: string;
}

export interface Episode {
  id?: string;
  episodeId?: string;
  number: number;
  title?: string;
  description?: string;
  img?: string;
  image?: string;
  isFiller?: boolean;
}

export interface Provider {
  providerId: string;
  id: string; // Thêm id vào Provider
  consumet?: boolean;
  episodes: Episode[] | { sub?: Episode[]; dub?: Episode[] };
}

export async function CombineEpisodeMeta(
  episodeData: Provider[],
  imageData: ImageDataItem[]
): Promise<Provider[]> {
  const episodeImages: Record<number, ImageDataItem> = {};

  imageData.forEach((image) => {
    const key = image.number ?? image.episode;
    if (key !== undefined) {
      episodeImages[key] = image;
    }
  });

  for (const providerEpisodes of episodeData) {
    const episodesArray = Array.isArray(providerEpisodes.episodes)
      ? providerEpisodes.episodes
      : [
          ...(providerEpisodes.episodes.sub || []),
          ...(providerEpisodes.episodes.dub || []),
        ];

    for (const episode of episodesArray) {
      const episodeNum = episode.number;
      const imageInfo = episodeImages[episodeNum];
      if (imageInfo) {
        const img = imageInfo.img || imageInfo.image;

        let title: string;
        if (typeof imageInfo.title === "object") {
          const en = imageInfo.title?.en;
          const xJat = imageInfo.title?.["x-jat"];
          title = en || xJat || `EPISODE ${episodeNum}`;
        } else {
          title = imageInfo.title || "";
        }

        const description =
          imageInfo.description || imageInfo.overview || imageInfo.summary;

        Object.assign(episode, { img, title, description });
      }
    }
  }

  return episodeData;
}

export function ProvidersMap(
  episodeData: Provider[] | null,
  defaultProvider: string | null = null,
  setDefaultProvider: (providerId: string) => void = () => {}
): {
  suboptions: string[];
  dubLength: number;
} {
  let suboptions: string[] = [];
  let dubLength = 0;

  if (!episodeData || episodeData.length === 0) {
    if (!defaultProvider) {
      setDefaultProvider("default");
    }
    return { suboptions: ["sub"], dubLength: 0 }; 
  }

  const dProvider = episodeData.filter((i) => i?.consumet === true);

  if (dProvider.length > 0) {
    const episodes = dProvider[0].episodes;
    if (episodes && !Array.isArray(episodes)) {
      suboptions = Object.keys(episodes).filter((key) => ["sub", "dub"].includes(key));
      const dubEpisodes = episodes.dub || [];
      dubLength = dubEpisodes.length > 0 ? Math.max(...dubEpisodes.map((e) => e.number), 0) : 0;
    } else if (episodes && Array.isArray(episodes)) {
      suboptions = ["sub"];
      dubLength = 0;
    }
  } else {
    suboptions = ["sub"];
    const episodes = episodeData[0].episodes;
    if (Array.isArray(episodes)) {
      dubLength = 0;
    } else if (episodes && episodes.dub) {
      dubLength = episodes.dub.length > 0 ? Math.max(...episodes.dub.map((e) => e.number), 0) : 0;
    }
  }

  if (!defaultProvider) {
    setDefaultProvider(dProvider[0]?.providerId || episodeData[0]?.providerId || "default");
  }

  if (suboptions.length === 0 || (suboptions.length === 1 && suboptions[0] === "dub")) {
    suboptions.push("sub");
  }

  return { suboptions, dubLength };
}