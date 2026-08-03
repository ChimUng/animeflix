"use client"
import React, { useState } from 'react';
import Image from 'next/image';
import styles from '../../styles/AnimeDetailsTop.module.css';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, useDisclosure } from "@nextui-org/react";
import Link from 'next/link';
import Addtolist from './Addtolist';
import { signIn } from 'next-auth/react';
import { useTitle } from '@/lib/store';
import { useStore } from 'zustand';
import type { Session } from "next-auth";
import { MediaListEntry } from '@/types/anilist';
import { AnimeItem } from '@/types/anime';
import { StarScoreIcon, PlayIconV2 } from '@/lib/SvgIcons';

interface AnimeDetailsTopProps {
    data: AnimeItem;
    list: MediaListEntry | null;
    session: Session | null;
    setList: (entry: MediaListEntry | null) => void;
    url?: string | null;
}

const AnimeDetailsTop: React.FC<AnimeDetailsTopProps> = ({ data, list, session, setList, url }) => {
    const animetitle = useStore(useTitle, (state) => state.animetitle);
    const [openlist, setOpenlist] = useState<boolean>(false);

    const isAnime = data?.type === 'ANIME' || true;

    const Handlelist = () => {
        setOpenlist(!openlist);
    };

    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    return (
        <div className={styles.detailsbanner}>
        <div
            className={styles.detailsbgimage}
            style={{
            backgroundImage: `url(${data?.bannerImage || (data.coverImage?.extraLarge ?? "/default.png") || ''})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
            height: "100%",
            }}
        ></div>
        <div className={styles.gradientOverlay}></div>

        {/* Trailer Button + Modal */}
        <>
            <Button className={styles.detailstrailer} onPress={onOpen}>Xem Trailer</Button>
            <Modal backdrop='blur' isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" placement="center">
            <ModalContent>
                {() => (
                <>
                    <ModalHeader className="flex flex-col gap-0">
                    {data.title?.[animetitle as keyof typeof data.title] || data?.title?.romaji}
                    </ModalHeader>
                    <ModalBody>
                    <div>
                        <iframe
                        title="Trailer"
                        className='w-[620px] h-[350px] mb-4'
                        src={`https://www.youtube.com/embed/${data?.trailer?.id}`}
                        frameBorder="0"
                        allowFullScreen
                        ></iframe>
                    </div>
                    </ModalBody>
                </>
                )}
            </ModalContent>
            </Modal>
        </>

        {/* Anime Info */}
        <div className={styles.detailsinfo}>
            <div className={styles.detailsimgcon}>
            <Image src={data?.coverImage?.extraLarge ?? "/default.png"} alt='Image' width={2} height={3} className={styles.detailsimage} />
            </div>

            <div className={styles.detailstitle}>
            <h1 className={`${styles.title} text-[1.7rem] font-[500]`}>
                {data?.title?.[animetitle as keyof typeof data.title] || data?.title?.romaji}
            </h1>

            <h4 className={styles.alttitle}>
                {animetitle === 'romaji' ? data?.title?.english : data?.title?.romaji}
            </h4>

            <p className={styles.scores}>
                {data?.averageScore != null && (
                    <>
                        <StarScoreIcon className="w-[17px] h-[17px] mr-[2px] fill-star text-star inline" />
                        {(data.averageScore / 10).toFixed(1)} |
                    </>
                )}
                <span className={data?.status === 'RELEASING' ? styles.activestatus : styles.notactive}>
                {data?.status}
                </span>
            </p>

            <div className='flex'>
                {isAnime ? (
                <Link
                    className={`${styles.detailswatch} ${!url && 'opacity-50 bg-black pointer-events-none'} hover:opacity-80 transition-all`}
                    href={url ?? ''}
                >
                    <PlayIconV2 className="w-5 h-5 mr-1" />
                    {list?.status === 'COMPLETED' ? 'Rewatch' : (list?.progress ?? 0) > 0 ? `Watch Ep ${(list?.progress ?? 0) + 1}` : 'Xem ngay'}
                </Link>
                ) : (
                <button className={`${styles.detailswatch} opacity-40 bg-black`} disabled>
                    Đọc ngay
                </button>
                )}
                <Button className={styles.detailsaddlist} onPress={Handlelist}>
                {list?.status ? 'Chỉnh sửa danh sách' : 'Thêm vào danh sách'}
                </Button>

                {session?.user?.token ? (
                <Modal
                    isOpen={openlist}
                    onOpenChange={Handlelist}
                    size="3xl"
                    backdrop="opaque"
                    hideCloseButton
                    placement="center"
                    radius="sm"
                    scrollBehavior="outside"
                    classNames={{ body: "p-0" }}
                >
                    <ModalContent>
                    {() => (
                        <>
                        <ModalBody>
                            <div className='relative'>
                            <div
                                className="w-full !h-40 brightness-50 rounded-t-md"
                                style={{
                                backgroundImage: `url(${data?.bannerImage || (data.coverImage?.extraLarge ?? "/default.png") || ''})`,
                                backgroundPosition: "center",
                                backgroundSize: "cover",
                                height: "100%",
                                }}
                            ></div>
                            <div className='absolute z-10 bottom-1 sm:bottom-0 sm:top-[65%] left-0 sm:left-3 md:left-10 flex flex-row items-center'>
                                <Image
                                src={data?.coverImage?.extraLarge || "/default.png"}
                                alt='Image'
                                width={120}
                                height={120}
                                className="hidden sm:flex rounded-md"
                                priority
                                />
                                <div className='px-2 sm:px-4 mb-4 font-medium !text-xl text-white max-w-full line-clamp-2'>
                                {data?.title?.[animetitle as keyof typeof data.title] || data?.title?.romaji}
                                </div>
                            </div>
                            </div>
                            <div className='mt-2 sm:mt-20 md:px-[5%] px-[2%] mb-2'>
                            <Addtolist
                                session={session}
                                setList={setList}
                                list={list}
                                id={Number(data.id)}
                                eplength={data?.episodes ?? (data?.nextAiringEpisode?.episode !== undefined ? data.nextAiringEpisode.episode - 1 : undefined) ?? 24}
                                Handlelist={Handlelist}
                            />
                            </div>
                        </ModalBody>
                        </>
                    )}
                    </ModalContent>
                </Modal>
                ) : (
                <Modal
                    isOpen={openlist}
                    onOpenChange={Handlelist}
                    size="xs"
                    backdrop="opaque"
                    hideCloseButton
                    placement="center"
                    radius="sm"
                    classNames={{ body: "py-6 px-3" }}
                >
                    <ModalContent>
                    {() => (
                        <>
                        <ModalBody>
                            <div className="text-center flex flex-col justify-center items-center">
                            <p className="text-lg mb-3">Đăng nhập để chỉnh sửa.</p>
                            <button
                                className="font-semibold outline-none border-none py-2 px-4 bg-[#4d148c] rounded-md flex items-center"
                                onClick={() => signIn('AniListProvider')}
                            >
                                <Image alt="anilist-icon" loading="lazy" width="25" height="25" src="/anilist.svg" className='mr-2' />
                                Đăng nhập Anilist
                            </button>
                            </div>
                        </ModalBody>
                        </>
                    )}
                    </ModalContent>
                </Modal>
                )}
            </div>
            </div>
        </div>
        </div>
    );
};

export default AnimeDetailsTop;
