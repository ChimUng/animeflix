"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UseDebounce from "@/utils/UseDebounce";
import { AdvancedSearch } from "@/lib/Anilistfunctions";
import { useTitle, useSearchbar } from "@/lib/store";
import { useStore } from "zustand";
import { AnimeItem, AnimeTitle } from "@/types/anime";
import { StarScoreIcon } from "@/lib/SvgIcons";

function Search() {
    const router = useRouter();
    const animetitle = useStore(useTitle, (state) => state.animetitle) as keyof AnimeTitle;
    const Isopen = useStore(useSearchbar, (state) => state.Isopen);
    const [query, setQuery] = useState<string>("");
    const [data, setData] = useState<AnimeItem[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const debouncedSearch = UseDebounce(query, 500);
    const [nextPage, setNextPage] = useState<boolean>(false);
    const focusInput = useRef<HTMLInputElement>(null);

    async function searchdata(): Promise<void> {
        setLoading(true);
        const res = await AdvancedSearch(debouncedSearch);
        setData(res?.media ?? null);
        setNextPage(!!res?.pageInfo?.hasNextPage);
        setLoading(false);
    }

    useEffect(() => {
        if (debouncedSearch) {
            searchdata();
        } else {
            setData(null);
        }
    }, [debouncedSearch]);

    function closeModal(): void {
        useSearchbar.setState({ Isopen: false });
    }

    const handleNavigate = () => useSearchbar.setState({ Isopen: false });

    return (
        <Transition appear show={Isopen} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-[99999]"
                initialFocus={focusInput}
                onClose={closeModal}
            >
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/90" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-100"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl max-h-[68dvh] transform text-left transition-all">
                                <Combobox
                                    as="div"
                                    className="max-w-[600px] mx-auto rounded-lg shadow-2xl relative flex flex-col"
                                    onChange={() => {
                                        useSearchbar.setState({ Isopen: false });
                                        setData(null);
                                        setQuery("");
                                    }}
                                >
                                    <div className="flex justify-between py-1">
                                        <div className="flex items-center px-2 gap-2">
                                            <p className="my-1">Tìm kiếm nhanh :</p>
                                            <div className="bg-[#1a1a1f] text-white text-xs font-bold px-2 py-1 rounded-md">CTRL</div>
                                            <span>+</span>
                                            <div className="bg-[#1a1a1f] text-white text-xs font-bold px-2 py-1 rounded-md">S</div>
                                        </div>
                                        <div className="mx-1 bg-[#1a1a1f] text-xs font-bold px-2 py-1 rounded-lg flex items-center justify-center">Anime</div>
                                    </div>
                                    <div className="flex items-center text-base font-medium rounded-lg bg-[#1a1a1f]">
                                        <Combobox.Input
                                            ref={focusInput}
                                            className="p-4 text-white w-full bg-transparent border-0 outline-none"
                                            placeholder="Nhập tên anime theo english, romaji..."
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    useSearchbar.setState({ Isopen: false });
                                                    router.push(`/anime/catalog?search=${encodeURIComponent(e.currentTarget.value)}`);
                                                    setData(null);
                                                    setQuery("");
                                                }
                                            }}
                                            autoComplete="off"
                                        />
                                    </div>
                                    <Combobox.Options className="bg-[#1a1a1f] rounded-xl mt-2 max-h-[50dvh] overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-primary scrollbar-thumb-rounded">
                                        {!loading ? (
                                            <Fragment>
                                                {data && data.length > 0 ? (
                                                    data.map((item) => {
                                                        const episodeNumber =
                                                            item?.episodes ??
                                                            (item?.nextAiringEpisode?.episode
                                                                ? item.nextAiringEpisode.episode - 1
                                                                : "?");
                                                        const cover =
                                                            item.coverImage?.large ??
                                                            item.coverImage?.extraLarge ??
                                                            "/default.png";

                                                        return (
                                                            <Combobox.Option
                                                                key={item.id}
                                                                value={item.id}
                                                                className={({ active }) =>
                                                                    `border-b border-solid border-gray-800 ${active ? "bg-black/20" : ""}`
                                                                }
                                                            >
                                                                <Link
                                                                    href={`/anime/info/${item.id}`}
                                                                    onClick={handleNavigate}
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    className="flex items-center gap-3 py-[8px] px-5 w-full cursor-pointer"
                                                                >
                                                                    <div className="shrink-0">
                                                                        <img
                                                                            src={cover}
                                                                            alt="image"
                                                                            width={52}
                                                                            height={70}
                                                                            className="rounded"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col overflow-hidden w-full flex-1">
                                                                        <p className="line-clamp-2 text-base">
                                                                            {item.title?.[animetitle] || item.title?.romaji}
                                                                        </p>
                                                                        <span className="my-1 text-xs text-gray-400">
                                                                            Episodes - {episodeNumber}
                                                                        </span>
                                                                        <div className="flex items-center text-gray-400 text-xs">
                                                                            <span className="flex items-center gap-1">
                                                                                <StarScoreIcon className="w-3 h-3 fill-star text-star" />
                                                                                {item.averageScore ? (item.averageScore / 10).toFixed(1) : "0"}
                                                                            </span>
                                                                            <span className="mx-1 mb-[5px]">.</span>
                                                                            <span>{item.format || "Na"}</span>
                                                                            <span className="mx-1 mb-[5px]">.</span>
                                                                            <span>{item.startDate?.year || "Na"}</span>
                                                                            <span className="mx-1 mb-[5px]">.</span>
                                                                            <span>{item.status}</span>
                                                                        </div>
                                                                    </div>
                                                                </Link>
                                                            </Combobox.Option>
                                                        );
                                                    })
                                                ) : (
                                                    query !== "" && (
                                                        <p className="flex items-center justify-center py-4 gap-1">
                                                            {`Không tìm thấy kết quả nào cho`}{" "}
                                                            <span className="text-danger font-bold">&quot;{query}&quot;</span>
                                                        </p>
                                                    )
                                                )}
                                                {data && nextPage && (
                                                    <Link href={`/anime/catalog?search=${encodeURIComponent(query)}`}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                useSearchbar.setState({ Isopen: false });
                                                                setQuery("");
                                                            }}
                                                            className="flex w-full items-center justify-center gap-2 py-4 transition duration-300 ease-in-out cursor-pointer border-none bg-d234 text-white text-base z-[5]"
                                                        >
                                                            Xem kết quả
                                                        </button>
                                                    </Link>
                                                )}
                                            </Fragment>
                                        ) : (
                                            query !== "" && (
                                                <div className="flex items-center justify-center py-4">Đang tải...</div>
                                            )
                                        )}
                                    </Combobox.Options>
                                </Combobox>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

export default Search;