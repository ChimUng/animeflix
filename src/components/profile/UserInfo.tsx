"use client";
import React, { useState, MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MediaCard from "./MediaCard";
import type { Session } from 'next-auth';
import { MediaListEntry } from '@/types/anilist';

interface ListTab {
  name: string;
  entries: MediaListEntry[];
}

interface UserInfoProps {
  lists: ListTab[];
  session: Session | null;
}

function UserInfo({ lists, session }: UserInfoProps) {
  console.log("UserInfo props lists:", lists);
  const [activeTab, setActiveTab] = useState<ListTab>(
    lists.find((tab) => tab?.name === "Watching") || lists[0]
  );

  const handleClick = (e: MouseEvent<HTMLDivElement>, tab: ListTab) => {
    e.preventDefault();
    setActiveTab(tab);
  };

  const [localLists, setLocalLists] = useState<ListTab[]>(lists);
  const handleDeleted = (deletedId: number) => {
    setLocalLists(prev =>
      prev.map(tab => ({
        ...tab,
        entries: tab.entries.filter(e => e.id !== deletedId),
      }))
    );
  };
  const isSelected = (tab: ListTab) => activeTab?.name === tab?.name;

  return (
    <div>
      <div className="max-w-[95%] lg:max-w-[90%] xl:max-w-[86%] mx-auto">
        <div className="flex mb-3 flex-nowrap overflow-x-auto scrollbar-hide">
          {lists.map((tab) => (
            <div
              key={tab.name}
              className={[
                "relative p-1 my-1 mx-3 cursor-pointer text-[#A1A1AA] transition-opacity duration-250 ease-in-out hover:opacity-60 text-lg sm:text-xl font-medium",
                isSelected(tab) ? "!text-white !opacity-100" : "",
              ].join(" ")}
            >
              <div
                onClick={(e) => handleClick(e, tab)}
                className="flex flex-row items-center"
              >
                {tab.name}{" "}
                <span className="ml-2 text-base">({tab?.entries?.length})</span>
              </div>
              {isSelected(tab) && (
                <motion.div
                  layoutId="indicator"
                  className="absolute !h-[1px] bottom-0 left-0 right-0 bg-white"
                />
              )}
            </div>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab?.name || "empty"}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={{
              duration: 0.3,
            }}
          >
            <div className="mx-3 my-5 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 lg:gap-4 !gap-y-8">
              {activeTab?.entries
                ?.slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((anime) => (
                  <MediaCard key={anime.id} anime={anime} session={session} onDeleted={handleDeleted} />
                ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default UserInfo;
