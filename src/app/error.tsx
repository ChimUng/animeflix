"use client"; // Error components must be Client Components

import Navbarcomponent from "@/components/navbar/Navbar";
import { useRouter } from 'next-nprogress-bar';
// import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error; // 'error' là một đối tượng Error
  reset: () => void; // 'reset' là một hàm không nhận đối số và không trả về gì
}

export default function ErrorPage({
    reset,
}: ErrorPageProps) { // Áp dụng interface ErrorPageProps vào props

  // useEffect(() => {
  //   // Log the error to an error reporting service
  //   console.error(error);
  // }, [error]);
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
                // Attempt to recover by trying to re-render the segment
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