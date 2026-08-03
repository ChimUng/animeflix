import { MostFavoriteAnilist, Top100Anilist } from '@/lib/Anilistfunctions';
import VerticalList from '@/components/home/VerticalList';
import Top1AnimeCard from '@/components/home/Top1AnimeCard';
import Navbarcomponent from '@/components/navbar/Navbar';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Top Anime - Bảng xếp hạng',
    description: 'Danh sách anime top được yêu thích nhất hiện nay',
};

export default async function TopAnimePage() {
    const mostfavorite = await MostFavoriteAnilist();
    const top100data = await Top100Anilist();
    const top1 = mostfavorite[0];

    return (
        <div>
        <Navbarcomponent />
        <div className="max-w-[92%] lg:max-w-[80%] mx-auto mt-[100px] mb-10">
            <Top1AnimeCard anime={top1} index={0} />
            <VerticalList data={mostfavorite} mobiledata={top100data} id="Bảng xếp hạng top 10 anime" fullWidth />
        </div>
        </div>
    );
}
