import Image from "next/image";
import Link from "next/link";
import styles from '../../styles/Animecard.module.css';

type AnimeTitle = {
  romaji: string;
  english?: string;
  native?: string;
};

type Anime = {
  id: string | number;
  title: AnimeTitle;
  coverImage: string;
  episode: number;
  airingTime: string;
  description?: string;
  siteUrl?: string;
};

export default function AnimeCardList({ data }: { data: Anime[] }) {
  const renderSkeleton = () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx}
              // Bắt chước cấu trúc của card thật
              className="group relative bg-[#18181b] rounded-lg lg:rounded-2xl overflow-hidden flex h-full"
              // Áp dụng shimmer và animation delay
              >
            {/* Skeleton for Image */}
          <div className={`relative w-[60px] min-h-[75px] sm:w-[125px] sm:h-[180px] md:w-[140px] md:h-[200px] flex-shrink-0 rounded-lg lg:rounded-2xl ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15}s` }}>
            {/* Không cần div con, hiệu ứng áp dụng trực tiếp lên nền */}
          </div>

          <div className="pr-3 flex flex-col justify-between w-full">
            <div className="flex flex-col my-3 mx-3 w-[95%] gap-1">
              {/* Skeleton for Title (2 lines) */}
              <div className={`font-semibold text-base lg:text-lg bg-[#2a2a2e] h-6 w-4/5 rounded-md ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15 + 0.05}s` }}></div>
              <div className={`bg-[#2a2a2e] h-6 w-3/5 rounded-md ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15 + 0.1}s` }}></div>

              {/* Skeleton for Episode and Airing Time */}
              <div className={`flex items-center gap-1 bg-[#2a2a2e] h-4 w-3/5 rounded-md mt-1 ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15 + 0.15}s` }}></div>

              {/* Skeleton for Description (2 lines, hidden on small screens) */}
              <div className={`bg-[#2a2a2e] h-4 w-full rounded-md mt-2 hidden sm:block ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15 + 0.2}s` }}></div>
              <div className={`bg-[#2a2a2e] h-4 w-4/5 rounded-md mt-1 hidden sm:block ${styles.skeletonShimmer}`} style={{ animationDelay: `${idx * 0.15 + 0.25}s` }}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (!data || !data.length) return renderSkeleton();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        {data.map((anime) => (
          <Link
            key={anime.id}
            href={`/anime/info/${anime.id}`}
            className="group relative bg-card-background backdrop-blur-sm rounded-lg lg:rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] flex h-full"
          >
            <div className="relative w-[60px] min-h-[75px] sm:w-[125px] sm:h-[180px] md:w-[140px] md:h-[200px] flex-shrink-0 rounded-lg lg:rounded-2xl">
              <Image
                src={anime.coverImage}
                alt={anime.title.english ?? anime.title.romaji ?? anime.title.native ?? "Anime"}
                width={140}
                height={200}
                className="w-full h-full object-cover rounded-lg lg:rounded-2xl opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t to-black/60 via-transparent from-transparent rounded-lg lg:rounded-2xl" />
              <div className="absolute left-0 top-0 sm:top-2 sm:left-2 px-1.5 w-[60px] sm:w-fit sm:px-2 py-1 rounded-lg text-xs shadow-2xl font-semibold !backdrop-blur-2xl flex items-center gap-1 bg-green-700 text-green-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
                Aired
              </div>
            </div>

            <div className="pr-3 flex flex-col justify-between w-full">
              <div className="flex flex-col my-3 mx-3 w-[95%] gap-1">
                <p className="font-semibold text-base lg:text-lg text-white line-clamp-2 leading-tight mb-1">
                  {anime.title.english ?? anime.title.romaji ?? anime.title.native}
                </p>

                <div className="flex items-center gap-1 text-gray-300 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="font-medium">Tập {anime.episode}</span>
                  <span>• {anime.airingTime}</span>
                </div>

                {anime.description && (
                  <span className="text-gray-400 mt-1 hidden text-xs sm:line-clamp-2 md:line-clamp-3 tracking-wider">
                    <span dangerouslySetInnerHTML={{ __html: anime.description }} />
                  </span>
                )}
              </div>

              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#d14836] to-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
