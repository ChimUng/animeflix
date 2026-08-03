"use client";

import Navbarcomponent from "@/components/navbar/Navbar";
import { useRouter } from 'next-nprogress-bar';


interface ErrorPageProps {
    error: Error; 
    reset: () => void; 
}

export default function ErrorPage({ reset, error }: ErrorPageProps) {

    const router = useRouter();

    return (
    <>
        <Navbarcomponent/>
        <div className="flex h-screen flex-col items-center justify-center gap-8">
            <h2 className="text-center font-bold text-3xl leading-tight">
            Oops! Có một số lỗi xảy ra!
            </h2>
            <div className="flex flex-row gap-4">
            <button className="bg-white text-black font-medium py-2 px-3 rounded-lg"
                onClick={
                () => reset()
                }
            >
                Thử lại
            </button>
            <button className="bg-white text-black font-medium py-2 px-3 rounded-lg"
                onClick={() => {
                    router.push("/");
                }}
            >
                Trang chủ
            </button>
            </div>
        </div>
    </>
    );
}