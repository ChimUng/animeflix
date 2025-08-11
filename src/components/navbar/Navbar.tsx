"use client"
import React, { useEffect, useState } from 'react';
import { DropdownItem, DropdownTrigger, Dropdown, DropdownMenu, DropdownSection, Avatar, Badge, useDisclosure } from "@nextui-org/react";
import Link from 'next/link';
import styles from '../../styles/Navbar.module.css';
import { useSession, signIn, signOut } from 'next-auth/react';
import { FeedbackIcon, LoginIcon, LogoutIcon, SettingsIcon, ProfileIcon, NotificationIcon } from '@/lib/SvgIcons';
import { Usernotifications } from '@/lib/AnilistUser';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { NotificationTime } from '@/utils/TimeFunctions';
import { useTitle, useSearchbar } from '@/lib/store';
import { useStore } from 'zustand';

// Định nghĩa types
type NavbarProps = {
    home?: boolean;
};

type User = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    token?: string;
};

type SessionData = {
    user?: User;
    // expires: string;
};

type Notification = {
    id: string;
    contexts?: string[];
    media?: { title: { romaji: string; english?: string; native?: string } };
    episode?: number;
    createdAt: number;
    // type?: string;
};

// Định nghĩa kiểu cho dữ liệu trả về từ Usernotifications (để khớp với NotificationData["Page"] trong AnilistUser.ts)
// NotificationData["Page"] có cấu trúc { notifications: any[] }
type AniListNotificationPage = {
    notifications: Notification[]; // Đây là mảng các thông báo
    // Bạn có thể thêm các trường khác nếu Page object có, ví dụ pageInfo
};

interface TitleStore {
    animetitle: string;
}

interface SearchbarStore {
    Isopen: boolean;
    setIsOpen: (open: boolean) => void;
}

type TimeframeChangeEvent = React.ChangeEvent<HTMLSelectElement>;

function Navbarcomponent({ home = false }: NavbarProps) {
    const animetitle = useStore(useTitle, (state: TitleStore) => state.animetitle);
    const Isopen = useStore(useSearchbar, (state: SearchbarStore) => state.Isopen);
    const setIsopen = useStore(useSearchbar, (state: SearchbarStore) => state.setIsOpen); // Lấy hàm setter
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const iconClasses = 'w-5 h-5 text-xl text-default-500 pointer-events-none flex-shrink-0';
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [isScrolled, setIsScrolled] = useState<boolean>(false);
    const [hidden, setHidden] = useState<boolean>(false);
    const { scrollY } = useScroll();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [todayNotifications, setTodayNotifications] = useState<Notification[]>([]);
    const [selectedTimeframe, setSelectedTimeframe] = useState<string>('Today');
    const { data, status } = useSession() as { data: SessionData | null, status: string };


    const handleTimeframeChange = (e: TimeframeChangeEvent) => {
        setSelectedTimeframe(e.target.value);
    };

    useMotionValueEvent(scrollY, 'change', (latest: number) => {
    const previous = scrollY.getPrevious();
    if (previous !== undefined && latest > previous && latest > 150) {
        setHidden(true);
    } else {
        setHidden(false);
        setIsScrolled(false);
    }
    if (latest > 50) {
        setIsScrolled(true);
    }
    });

    useEffect(() => {
    if (status === 'authenticated') {
        console.log("Thông tin user:", data?.user);
        setIsLoggedIn(true);
    } else {
        setIsLoggedIn(false);
    }
    }, [status]);

        useEffect(() => {
        const fetchNotifications = async () => {
            try {
                // Kiểm tra status và đảm bảo data.user.token tồn tại và là string
                // Sử dụng type assertion (data.user as User) để đảm bảo TypeScript hiểu cấu trúc User
                if (status === 'authenticated' && data?.user?.token) {
                    const userToken: string = data.user.token; // Đảm bảo là string

                    // Gọi Usernotifications và ép kiểu kết quả
                    const responseData: AniListNotificationPage | undefined = await Usernotifications(userToken, 1);

                    if (responseData && responseData.notifications) {
                        // Lọc các thông báo có đầy đủ dữ liệu (object không rỗng)
                        const notify = responseData.notifications.filter((item) => Object.keys(item).length > 0);
                        setNotifications(notify);
                        const filteredNotifications = filterNotifications(notify);
                        setTodayNotifications(filteredNotifications);
                    } else {
                        // Xử lý trường hợp không có thông báo hoặc responseData là undefined
                        setNotifications([]);
                        setTodayNotifications([]);
                    }
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        // Chỉ gọi fetchNotifications khi status hoặc data thay đổi
        fetchNotifications();
    }, [status, data]); // Dependencies: status và data (để trigger re-fetch khi session thay đổi)

    function filterNotifications(notifications: Notification[]): Notification[] {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const oneDayInSeconds = 24 * 60 * 60;
        return notifications.filter((notification) => {
            const createdAtTimestamp = notification.createdAt;
            const timeDifference = currentTimestamp - createdAtTimestamp;
            return timeDifference <= oneDayInSeconds;
        });
        }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'KeyS' && e.ctrlKey) {
                e.preventDefault();
                setIsopen(!Isopen); // Sử dụng hàm setter từ Zustand store
            }
        };
        window.addEventListener('keydown', handleKeyDown as EventListener);
        return () => {
            window.removeEventListener('keydown', handleKeyDown as EventListener);
        };
    }, [Isopen, setIsopen]); // Thêm Isopen và setIsopen vào dependency array
    
    const navbarClass = isScrolled
        ? `${home ? styles.homenavbar : styles.navbar} ${home && styles.navbarscroll}`
        : home
        ? styles.homenavbar
        : styles.navbar;

    return (
        <motion.nav suppressHydrationWarning className={navbarClass}
            variants={{
                visible: { y: 0 },
                hidden: { y: "-100%" },
            }}
            animate={hidden ? 'hidden' : 'visible'}
            transition={{ duration: 0.3, ease: "easeInOut" }}
        >
            <div className={styles.navleft}>
                <div className={styles.logoContainer}>
                    <Link href="/" className={`${styles.logoLink} bg-gradient-to-r from-red-500 to-white bg-clip-text text-transparent font-custom`} suppressHydrationWarning={true}>
                        ANIMEFLIX
                    </Link>
                </div>
                <div className={styles.navItemsContainer}>
                    <Link href="/anime/catalog" className={styles.navItem}>Danh mục</Link>
                    <Link href="/anime/topanime" className={styles.navItem}>Top anime</Link>
                    <Link href="/anime/schedule" className={styles.navItem}>Lịch chiếu</Link>
                    <Link href="/anime/catalog?season=SUMMER&year=2024" className={styles.navItem}>Season</Link>
                    <Link href="https://www.instagram.com/dong_huy_197/?fbclid=IwZXh0bgNhZW0CMTAAYnJpZBExdHpkcmUwQVVkb1RFaXQ1UgEeqtLbIljwlQbnl6wItKtsh9msx1ADHF1syXhaXPMNYl0ihSKj6qDjxjQnI5s_aem_flDvo4KKCd6LnSsGHH8AOA#" className={styles.navItem}>Cộng đồng</Link>
                </div>
            </div>
            <div className={styles.navright}>
                <button
                    type="button"
                    title="Search"
                    onClick={() => setIsopen(true)} // Đã sửa: dùng setIsopen thay vì useSearchbar.setState
                    className="w-[26px] h-[26px] outline-none transition duration-200 hover:scale-110 hover:text-d148"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.6))' }}
                    >
                        <path
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 15l6 6m-11-4a7 7 0 110-14 7 7 0 010 14z"
                        ></path>
                    </svg>
                </button>
                <div>
                    {isLoggedIn && (
                        <Dropdown placement="bottom-end" classNames={{
                            base: "before:bg-default-200",
                            content: "py-1 px-1 border border-default-200 bg-gradient-to-br from-white to-default-200 dark:from-default-50 dark:to-black",
                        }}>
                            <DropdownTrigger>
                                <div className='w-[26px] h-[26px] mr-2 mt-[2px] cursor-pointer '>
                                    <Badge color="danger" content={todayNotifications?.length} shape="circle" showOutline={false} size="sm">
                                        <NotificationIcon className="text-white duration-200 hover:scale-110 hover:text-d148" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.6))' }}/>
                                    </Badge>
                                </div>
                            </DropdownTrigger>
                            <DropdownMenu variant="flat" className='w-[320px] '
                                aria-label="Notifications" // Đã đổi Avatar Actions thành Notifications
                                emptyContent="Không có thông báo mới"
                            >
                                <DropdownSection title="Thông báo">
                                    <DropdownItem
                                        isReadOnly
                                        classNames={{
                                            base: 'py-0 !hover:bg-none'
                                        }}
                                        key="theme"
                                        className="cursor-default"
                                        endContent={
                                            <select
                                                className="z-10 outline-none cursor-pointer w-[72px] py-0.5 rounded-md text-tiny group-data-[hover=true]:border-default-500 border-small border-default-300 dark:border-default-200 bg-transparent text-default-500"
                                                id="theme"
                                                name="theme"
                                                value={selectedTimeframe}
                                                onChange={handleTimeframeChange}
                                            >
                                                <option>Hôm nay</option>
                                                <option>Gần đây</option>
                                            </select>
                                        }
                                    >
                                        Chọn thời gian
                                    </DropdownItem>
                                </DropdownSection>
                                <DropdownSection className="w-full">
                                    {selectedTimeframe === 'Hôm nay' ? (
                                        todayNotifications && todayNotifications.length > 0 ? (
                                            <>
                                                {todayNotifications.slice(0, 3).map((item) => {
                                                    const { contexts, media, episode, createdAt, id } = item;
                                                    const mediaTitle = media?.title?.[animetitle as keyof typeof media.title] || media?.title?.romaji || '';
                                                    return (
                                                        <DropdownItem
                                                            key={id} // Sử dụng id làm key
                                                            // showFullDescription // Đã comment/xóa prop này
                                                            description={`${contexts?.[0] || ''} ${episode || ''} ${
                                                                contexts?.[1] || ''
                                                            } ${mediaTitle} ${
                                                                contexts?.[contexts.length - 1] || ''
                                                            }`}
                                                            className="py-2 w-full"
                                                            classNames={{
                                                                description: 'text-[11px] text-[#A1A1AA]',
                                                            }}
                                                        >
                                                            <div className="flex flex-row items-center justify-between w-[290px]">
                                                                <p className="font-semibold text-[14px] w-full">
                                                                    {mediaTitle.slice(0, 24)}
                                                                    {mediaTitle.length > 24 && '...'}
                                                                </p>
                                                                <span className="text-[#f1f1f1b2] text-[10px]">
                                                                    {NotificationTime(createdAt)}
                                                                </span>
                                                            </div>
                                                        </DropdownItem>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <DropdownItem
                                                key="no-today-notifications"
                                                className="py-3 w-full text-center"
                                            >
                                                Không có thông báo hôm nay!
                                            </DropdownItem>
                                        )
                                    ) : (
                                        notifications && notifications.length > 0 ? (
                                            <>
                                                {notifications.slice(0, 3).map((item) => {
                                                    const { contexts, media, episode, createdAt, id } = item;
                                                    const mediaTitle = media?.title?.[animetitle as keyof typeof media.title] || media?.title?.romaji || '';
                                                    return (
                                                        <DropdownItem
                                                            key={id}
                                                            // showFullDescription // Đã comment/xóa prop này
                                                            description={`${contexts?.[0] || ''} ${episode || ''} ${
                                                                contexts?.[1] || ''
                                                            } ${mediaTitle} ${
                                                                contexts?.[contexts.length - 1] || ''
                                                            }`}
                                                            className="py-2 w-full"
                                                            classNames={{
                                                                description: 'text-[11px] text-[#A1A1AA]',
                                                            }}
                                                        >
                                                            <div className="flex flex-row items-center justify-between w-[290px]">
                                                                <p className="font-semibold text-[14px] w-full">
                                                                    {mediaTitle.slice(0, 24)}
                                                                    {mediaTitle.length > 24 && '...'}
                                                                </p>
                                                                <span className="text-[#f1f1f1b2] text-[10px]">
                                                                    {NotificationTime(createdAt)}
                                                                </span>
                                                            </div>
                                                        </DropdownItem>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <DropdownItem
                                                key="no-all-notifications"
                                                className="py-3 w-full text-center"
                                            >
                                                Không có thông báo nào!
                                            </DropdownItem>
                                        )
                                    )}
                                    {(selectedTimeframe === 'Hôm nay' && todayNotifications && todayNotifications.length > 0) ||
                                    (selectedTimeframe !== 'Hôm nay' && notifications && notifications.length > 0) ? (
                                        <DropdownItem
                                            key="show-all-notifications"
                                            className="py-2 w-full text-xl text-default-500 flex-shrink-0"
                                            color="danger"
                                        >
                                            <Link href={`/user/notifications`} className="w-full h-full block">
                                                Xem tất cả
                                            </Link>
                                        </DropdownItem>
                                    ) : null}
                                </DropdownSection>
                            </DropdownMenu>
                        </Dropdown>
                    )}
                </div>
                <Dropdown placement="bottom-end" classNames={{
                    base: "before:bg-default-200",
                    content: "py-1 px-1 border border-default-200 bg-gradient-to-br from-white to-default-200 dark:from-default-50 dark:to-black",
                }}>
                    <DropdownTrigger>
                    <Avatar
                        isBordered
                        isDisabled={status === 'loading'}
                        as="button"
                        className="transition-transform w-[27px] h-[27px] backdrop-blur-sm"
                        color="secondary"
                        name={data?.user?.name || undefined}
                        size="sm"
                        src={
                        typeof data?.user?.image === 'string'
                            ? data.user.image
                            : (data?.user?.image as any)?.large || 'https://i.pravatar.cc'
                        }
                    />
                    </DropdownTrigger>
                    {isLoggedIn ? (
                        <DropdownMenu aria-label="Profile Actions" variant="flat">
                            <DropdownItem key="info" className="h-14 gap-2">
                                <p className="font-semibold">Đăng nhập với tư cách:</p>
                                <p className="font-semibold">{data?.user?.name}</p>
                            </DropdownItem>
                            <DropdownItem key="profile" startContent={<ProfileIcon className={iconClasses} />}>
                            <Link href={`/user/profile`} className='w-full h-full block '>Thông tin</Link>
                                </DropdownItem>
                            <DropdownItem key="help_and_feedback" onPress={onOpen} startContent={<FeedbackIcon className={iconClasses} />}>Trợ giúp & Phản hồi</DropdownItem>
                            <DropdownItem key="settings" startContent={<SettingsIcon className={iconClasses} />}>
                                <Link href={`/settings`} className='w-full h-full block '>Cài đặt</Link>
                            </DropdownItem>
                            <DropdownItem key="logout" color="danger" startContent={<LogoutIcon className={iconClasses} />}>
                                <button className="font-semibold outline-none border-none w-full h-full block text-left" onClick={() => signOut()}>Đăng xuất</button>
                            </DropdownItem>
                        </DropdownMenu>
                    ) : (
                        <DropdownMenu aria-label="Profile Actions" variant="flat">
                            <DropdownItem key="notlogprofile" startContent={<LoginIcon className={iconClasses} />}>
                                <button className="font-semibold outline-none border-none w-full h-full block text-left" onClick={() => signIn('AniListProvider')}>Đăng nhập với Anilist</button>
                            </DropdownItem>
                            <DropdownItem key="notloghelp_and_feedback" onPress={onOpen} startContent={<FeedbackIcon className={iconClasses} />}>Trợ giúp & Phản hồi</DropdownItem>
                            <DropdownItem key="settings" startContent={<SettingsIcon className={iconClasses} />}>
                                <Link href={`/settings`} className='w-full h-full block '>Cài đặt</Link>
                            </DropdownItem>
                        </DropdownMenu>
                    )}
                </Dropdown>
            </div>
        </motion.nav>
    )
}

export default Navbarcomponent;