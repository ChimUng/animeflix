"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function UserInfo({ user, list }: { user: any, list: any[] }) {
    const [activeTab, setActiveTab] = useState(list.find(tab => tab.active)?.name || list[0].name);

    const handleTabClick = (e: React.MouseEvent, tabName: string) => {
        e.preventDefault();
        setActiveTab(tabName);
    }

    const isSelected = (tabName: string) => tabName === activeTab;

    return (
        <div className="max-w-[95%] lg:max-w-[90%] xl:max-w-[86%] mx-auto">
            <div className="flex mb-3 flex-nowrap overflow-x-auto scrollbar-hide">
                {list.map((tab) => (
                    <div 
                    key={tab.name} 
                    className={[
                        "relative p-1 my-1 mx-3 cursor-pointer text-[#A1A1AA] transition-opacity duration-250 ease-in-out hover:opacity-60 text-lg sm:text-xl font-medium",
                        isSelected(tab.name) ? "text-white !opacity-100" : ""
                    ].join(" ")}
                    >
                        <div key={tab.name} onClick={(e) => handleTabClick(e, tab.name)} className="flex flex-row items-center">
                            {tab.name} <span className="ml-2 text-base">({tab?.entries?.length || 0})</span>
                        </div>
                        {isSelected(tab.name) && (
                            <motion.div
                                layoutId="indicator"
                                className="absolute !h-[1px] bottom-0 left-0 right-0 bg-white"
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
