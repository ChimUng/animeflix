"use client"
import { useState, useEffect } from 'react';
import { Usernotifications } from '@/lib/AnilistUser';
import Image from 'next/image';
import Skeleton from "react-loading-skeleton";
import { formatTimeStamp, NotificationTime } from '@/utils/TimeFunctions';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useTitle } from '@/lib/store';
import { useStore } from 'zustand';
import { Session } from 'next-auth';

interface PageInfo {
    hasNextPage: boolean;
}

interface Notification {
    id: string;
    contexts?: string[];
    media?: { title: { romaji: string; english?: string; native?: string } };
    episode?: number;
    createdAt: number;
    // type?: string;
};

interface NotificationResponse {
    pageInfo?: PageInfo;
    notifications?: Notification[];
}

type NotificationProps = {
    session?: Session  | null;
};

function Notifications ( {session} :NotificationProps ) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasNextPage, sethasNextPage] = useState(false);
    const animetitle = useStore(useTitle, (state) => state.animetitle);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            if (session?.user?.token) {
                const response: NotificationResponse | undefined = await Usernotifications(session.user.token, page);
                console.log(response);
                if (response?.pageInfo) {
                    sethasNextPage(response?.pageInfo?.hasNextPage)
                }
                if (response) {
                    const filteredNotifications = response?.notifications?.filter(item => Object.keys(item).length > 0);
                    setNotifications([...notifications, ...(filteredNotifications ?? [])]);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [page]);

    if (!session || !session.user) {
        return (
            <div className="flex justify-center items-center h-[70vh]">
                <div className="text-center flex flex-col justify-center items-center">
                    <p className="text-lg mb-3">Đăng nhập để nhận thông báo.</p>
                    <button className="font-semibold outline-none border-none py-2 px-4 bg-[#212127] rounded-md flex items-center" onClick={() => signIn('AniListProvider')}>
                        <Image alt="anilist-icon" loading="lazy" width="25" height="25" src="/anilist.svg" className='mr-2' />
                        Login With Anilist</button>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-[60vh]'>
            <div className='max-w-[95%] lg:max-w-[90%] xl:max-w-[80%] mx-auto mt-2 md:mt-4 min-h-[60vh] flex flex-col lg:flex-row justify-between lg:gap-16 gap-4'>
                <div className='lg:w-1/4 h-fit bg-[#151518] rounded-md px-2 py-5'>
                    <div className='w-[90%] mx-auto'>
                        <div className='flex flex-row items-center gap-4'>
                            <Image alt="Image" width="100" height="100" src={session?.user?.image?.large ?? 'https://i.pravatar.cc'} className='w-[70px] rounded-md h-full' />
                            <span className='text-sl text-[#DBDCDD] font-bold'>{session?.user?.name}</span>
                        </div>
                        <p className='text-[#DBDCDD] mt-3 text-xs md:text-sm'>Tạo ngày : {session?.user?.createdAt ? formatTimeStamp(session.user.createdAt) : "Chưa rõ"}</p>
                        {session?.user?.list && session.user.list.length > 0 && (
                            <>
                                <h2 className='mt-3 mb-[2px] text-warning'>Custom Lists</h2>
                                <div>
                                    {session?.user?.list?.map((item: any, index: number) => (
                                        <div key={index}>
                                            {/* <p className='text-[#DBDCDD] text-xs md:text-sm'>{index + 1} • </p> */}
                                            <p className="sm:top-2 sm:left-2 px-1.5 w-fit sm:w-fit sm:px-2 py-1 rounded-lg text-xs shadow-2xl font-semibold !backdrop-blur-2xl flex items-center gap-1 bg-green-700 text-green-50">
                                                {item}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className='flex flex-col flex-grow gap-3'>
                    {notifications?.length > 0 ? (
                        notifications?.map((item: any, index: number) => (
                            <div key={index} className='group relative mb-2 flex flex-row w-full bg-[#151518] rounded-md items-center h-[80px] text-sm  md:text-base !leading-none overflow-hidden 
                            transition-transform duration-300 ease-in-out hover:-translate-y-[2px] hover:shadow-[0_4px_15px_rgba(209,72,54,0.4)]'> 
                                <Image alt="Image" width="100" height="100" src={item?.media?.coverImage?.extraLarge} className='w-[60px] rounded-md h-full' />
                                <div className='mx-4'>
                                    {item?.context ? (
                                        <div className='mb-1'>
                                            <Link href={`/anime/info/${item?.media?.id}`} className='font-semibold hover:text-danger'> {item?.media?.title?.[animetitle] || item?.media?.title?.romaji} </Link>
                                            {` ${item?.context}`}
                                        </div>
                                    ) : (
                                        <div className='mb-1'>
                                            {`${item?.contexts?.[0]} ${item?.episode} ${item?.contexts?.[1]} `}
                                            <Link href={`/anime/info/${item?.media?.id}`} className='font-semibold hover:text-danger'>{item?.media?.title?.[animetitle] || item?.media?.title?.romaji}</Link>
                                            {` ${item?.contexts?.[item?.contexts?.length - 1]}`}
                                        </div>
                                    )}
                                    <span className='text-[#f1f1f1b2] text-[10px]'>{NotificationTime(item?.createdAt)}</span>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#d14836] to-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                            </div>
                        ))
                    ) : (
                        !loading && (
                            <div className='flex justify-center items-center h-[30vh]'>
                                <p className="text-lg mb-3 font-semibold">Chưa có thông báo!!!.</p>
                            </div>
                        )
                    )}
                    {loading && <div className='flex flex-col gap-3'>
                        {[1, 2, 3].map((item) => (
                            <Skeleton
                                key={item}
                                className="bg-[#18181b] flex w-full h-[70px] rounded-lg scale-100 transition-all duration-300 ease-out mb-2"
                            />
                        ))}
                    </div>
                    }
                    {!loading && notifications?.length > 0 && hasNextPage && <button onClick={() => { setPage(prev => prev + 1) }} className='bg-[#18181b] p-2 rounded-md'>Load More</button>}
                </div>
            </div>
        </div>
    );
}
export default Notifications;