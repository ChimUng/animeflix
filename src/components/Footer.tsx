'use client'
import React from 'react'
import Link from 'next/link'
import { useTitle } from '@/lib/store';
import { useStore } from 'zustand';
import DonatePopup from '@/components/DonatePopup';

function Footer() {
    const animetitle = useStore(useTitle, (state) => state.animetitle);

    const year = new Date().getFullYear();
    const month = new Date().getMonth();

    const handleToggle = () => {
        if (animetitle === 'english') {
            useTitle.setState({ animetitle: 'romaji' });
        } else {
            useTitle.setState({ animetitle: 'english' });
        }
    };

    function getSeason(month: number): 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' {
        if (month === 12 || month === 1 || month === 2) {
            return 'WINTER';
        } else if (month === 3 || month === 4 || month === 5) {
            return 'SPRING';
        } else if (month === 6 || month === 7 || month === 8) {
            return 'SUMMER';
        } else {
            return 'FALL';
        }
    }

    function getYear() {
        const year = new Date().getFullYear();
        return year;
    }

    const format: Array<'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'> = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

    function nextSeason(currentSeason: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'): 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' {
        const currentIndex = format.indexOf(currentSeason);
        const nextIndex = (currentIndex + 1) % format.length;
        return format[nextIndex];
    }

    return (
        <div>
            <footer className="bg-[#151518] mt-10">
                <div className="mx-auto w-full lg:max-w-[85%] p-4 py-6 lg:pt-8 lg:pb-3">
                    <div className="lg:flex lg:justify-between">
                        <div className="mb-6 lg:mb-0">
                            <Link href="/" className="flex items-center w-fit">
                                <p className="aniplay self-center text-3xl bg-gradient-to-r from-red-500 to-white bg-clip-text text-transparent font-custom">ANIMEFLIX</p>
                            </Link>
                            <p className="font-karla lg:text-[0.8rem] text-[0.7rem] text-[#ffffffb2] lg:w-[520px]">
                                Trang web này cung cấp nội dung anime chỉ với mục đích giải trí và không chịu trách nhiệm về bất kỳ nội dung quảng cáo, liên kết của bên thứ ba hiển thị trên trang web của chúng tôi.
                            </p>
                            <p className="font-karla lg:text-[0.8rem] text-[0.7rem] text-[#ffffffb2] lg:w-[520px]">
                                Liên hệ quảng cáo qua email: <Link href="mailto:duynguyen19087@gmail.com">duynguyen19087@gmail.com</Link>
                            </p>
                        </div>
                        <div className="grid grid-cols-2 lg:gap-16 sm:gap-6 sm:grid-cols-2">
                            <div>
                                <ul className=" font-semibold flex flex-col gap-2 lg:text-[0.85rem] text-[0.7rem] text-[#ffffffb2] ">
                                    <li>
                                        <Link href={`/anime/catalog?season=${getSeason(month + 1)}&year=${getYear()}`} className="hover:text-white">Mùa này</Link>
                                    </li>
                                    <li>
                                        <Link href={`/anime/catalog?season=${nextSeason(getSeason(month + 1))}&year=${getYear() + 1}`} className="hover:text-white">Mùa tới</Link>
                                    </li>
                                    <li>
                                        <Link href="/anime/catalog?format=MOVIE" className="hover:text-white">Movies</Link>
                                    </li>
                                    <li>
                                        <Link href="/anime/catalog?format=TV" className="hover:text-white">Tv Shows</Link>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <ul className="font-semibold flex flex-col gap-2 lg:text-[0.85rem] text-[0.7rem] text-[#ffffffb2]">
                                    <li>
                                        <Link href="/clause" className="hover:text-white">Điều khoản</Link>
                                    </li>
                                    <li>
                                        <DonatePopup />
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='bg-tersier border-t border-white/5 mt-2'></div>
                <div className="mx-auto w-full lg:max-w-[83%] lg:flex lg:items-center lg:justify-between lg:text-[0.8rem] text-[0.7rem] text-[#ffffffb2] py-3">
                    <span className="sm:text-center ms-5 lg:ms-0">
                        © Copyright {year} <Link href="/" className="hover:text-white">ANIMEFLIX</Link> | Made by <span className="font-bold">ChimUng</span>
                    </span>
                    <div className="flex mt-4 lg:justify-center lg:mt-0">
                        <Link href="https://github.com/ChimUng" target="_blank" className="hover:text-gray-900 dark:hover:text-white ms-5 lg:ms-0">
                            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 .333A9.911 9.911 0 0 0 6.866 19.65c.5.092.678-.215.678-.477 0-.237-.01-1.017-.014-1.845-2.757.6-3.338-1.169-3.338-1.169a2.627 2.627 0 0 0-1.1-1.451c-.9-.615.07-.6.07-.6a2.084 2.084 0 0 1 1.518 1.021 2.11 2.11 0 0 0 2.884.823c.044-.503.268-.973.63-1.325-2.2-.25-4.516-1.1-4.516-4.9A3.832 3.832 0 0 1 4.7 7.068a3.56 3.56 0 0 1 .095-2.623s.832-.266 2.726 1.016a9.409 9.409 0 0 1 4.962 0c1.89-1.282 2.717-1.016 2.717-1.016.366.83.402 1.768.1 2.623a3.827 3.827 0 0 1 1.02 2.659c0 3.807-2.319 4.644-4.525 4.889a2.366 2.366 0 0 1 .673 1.834c0 1.326-.012 2.394-.012 2.72 0 .263.18.572.681.475A9.911 9.911 0 0 0 10 .333Z" clipRule="evenodd" />
                            </svg>
                            <span className="sr-only">GitHub account</span>
                        </Link>
                        <Link href="https://www.linkedin.com/in/hong-duy-chimung-8a2a6b368/" target="_blank" className="hover:text-gray-900 dark:hover:text-white ms-5">
                            <svg
                                className="w-[22px] h-[22px]"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4v13h-4v-13zM8.5 8.5h3.58v1.78h.05c.5-.95 1.73-1.95 3.57-1.95 3.82 0 4.53 2.5 4.53 5.75v6.42h-4v-5.68c0-1.35-.03-3.1-1.9-3.1-1.9 0-2.19 1.48-2.19 3v5.78h-4v-13z" />
                            </svg>
                            <span className="sr-only">LinkedIn profile</span>
                        </Link>
                        <div className="flex items-center ml-5">
                            <label className="relative cursor-pointer">
                                {animetitle && (
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={animetitle === 'english'}
                                        onChange={handleToggle}
                                    />
                                )}
                                <div className="w-[40px] text-xs h-4 flex items-center bg-[#EAEEFB] rounded-full peer-checked:text-[#18181b] text-[black] font-bold after:flex after:items-center after:justify-center peer after:content-['JP'] peer-checked:after:content-['EN'] peer-checked:after:translate-x-3/4 after:absolute peer-checked:after:border-white after:bg-white after:border after:border-gray-300 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#EAEEFB]">
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Footer
