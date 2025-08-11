// components/DonatePopup.tsx
'use client'
import { useState } from 'react';
import Image from 'next/image';

export default function DonatePopup() {
    const [show, setShow] = useState(false);

    return (
        <>
        {/* Nút Donate */}
        <button
        onClick={() => setShow(true)}
        className="bg-transparent text-[#ffffffb2] text-[0.8rem] font-semibold hover:text-white p-0 m-0 border-none"
        >
        Donate
        </button>

        {/* Overlay + Popup */}
        {show && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
            <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-xl max-w-sm w-full relative shadow-xl">
                <h2 className="text-lg font-bold text-center mb-3 text-black dark:text-white">Ủng hộ mình cốc cafe</h2>
                <Image
                src="/qrmbbank.jpg" ///images/qr-mbbank.png
                alt="QR MB Bank"
                width={300}
                height={300}
                className="mx-auto rounded"
                />
                <div className="mt-3 text-center text-sm text-black dark:text-white">
                <p><strong>Chủ TK:</strong> Nguyễn Hồng Duy</p>
                <p><strong>Số TK:</strong> 1121213131414</p>
                <p><strong>Ngân hàng:</strong> MB Bank</p>
                </div>
                <button
                onClick={() => setShow(false)}
                className="absolute top-2 right-3 text-gray-500 hover:text-black dark:hover:text-white"
                >
                ✕
                </button>
            </div>
            </div>
        )}
        </>
    );
}
