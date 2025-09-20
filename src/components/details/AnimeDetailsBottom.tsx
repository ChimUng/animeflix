"use client";
import React, { useState, MouseEvent } from "react";
import styles from "../../styles/AnimeDetailsBottom.module.css";
import Animecards from "../CardComponent/Animecards";
import { AnimatePresence, motion } from "framer-motion";
import Characters from "./Characters";
import Overview from "./tabs/Overview";
import Image from "next/image";
import { AnimeItem } from "@/lib/types";

// Kiểu cho mỗi tab
interface TabItem {
    name: string;
    label: string;
}

// Kiểu cho props chính
interface AnimeDetailsBottomProps {
  data: AnimeItem; // Gợi ý: bạn có thể thay `any` bằng kiểu từ Anilist schema nếu có
  id: number; // <-- THÊM DÒNG NÀ
}

const AnimeDetailsBottom: React.FC<AnimeDetailsBottomProps> = ({ data, id }) => {
    const tabs: TabItem[] = [
        { name: "Overview", label: "Tổng quan" },
        { name: "Relations", label: "Mối quan hệ" },
        { name: "Characters", label: "Nhân vật" },
        { name: "Banner", label: "Hình ảnh" },
    ];

    const [activeTab, setActiveTab] = useState<TabItem>(tabs[0]);

    const handleClick = (e: MouseEvent<HTMLDivElement>, tab: TabItem) => {
        e.preventDefault();
        setActiveTab(tab);
    };

    const isSelected = (tab: TabItem): boolean => activeTab.name === tab.name;

    return (
        <div>
        <div className={styles.detailstabs}>
            <div className={styles.tabHeader}>
            {tabs.map((tab) => (
                <div
                key={tab.name}
                className={[
                    styles.tabItem,
                    isSelected(tab) ? styles.selected : "",
                ].join(" ")}
                >
                <div onClick={(e) => handleClick(e, tab)}>
                    {tab.label}
                </div>
                {isSelected(tab) && (
                    <motion.div layoutId="indicator" className={styles.indicator} />
                )}
                </div>
            ))}
            </div>

            <AnimatePresence mode="wait">
            <motion.div
                key={activeTab.name || "empty"}
                initial="initial"
                animate="enter"
                exit="exit"
                transition={{ duration: 0.3 }}
            >
                {activeTab.name === "Overview" && <Overview data={{ ...data, id: Number(data.id) }} id={id} />}

                {activeTab.name === "Relations" && (
                <div className={styles.relations}>
                    <h3 className={styles.relationsheading}>Phim liên quan</h3>
                    <Animecards
                    data={data.relations?.edges?.map(edge => edge.node) ?? null} 
                    cardid="Related Anime"
                    show={false}
                    />
                </div>
                )}

                {activeTab.name === "Characters" && (
                <div className={styles.characters}>
                    <h3 className={styles.relationsheading}>Nhân vật trong anime</h3>
                    <Characters data={data?.characters?.edges} />
                </div>
                )}

                {activeTab.name === "Banner" && (
                <div className={styles.detailscard}>
                    <div className={styles.detailsbgimage}>
                        <Image 
                        src={data?.bannerImage || data?.coverImage?.extraLarge || "/fallback.jpg"} 
                        alt="Banner"
                        fill
                        style={{ objectFit: "cover" }}
                        />
                    </div>
                </div>
                )}
            </motion.div>
            </AnimatePresence>
        </div>
        </div>
    );
};

export default AnimeDetailsBottom;
