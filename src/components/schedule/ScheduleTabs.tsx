import { useEffect, useState } from "react";
import styles from "../../styles/ScheduleTabs.module.css";

interface ScheduleTabsProps {
  days: { day: string; count: number }[];
  onSelectDay: (day: string) => void;
  defaultDay: string;
}

export default function ScheduleTabs({ days, onSelectDay, defaultDay }: ScheduleTabsProps) {
  const [selectedDay, setSelectedDay] = useState(defaultDay);

  useEffect(() => {
    setSelectedDay(defaultDay);
    onSelectDay(defaultDay);
  }, [defaultDay]);

  if (!days.length) {
   // Loading skeleton khi chưa có dữ liệu
    return (
      <div className="flex justify-center">
        <div className="flex flex-wrap gap-3 bg-[#18181b] border border-[#2c2c2c] rounded-2xl w-fit p-3">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div
              key={idx}
              // Sử dụng class của tabButton để giữ nguyên hình dạng và thêm skeletonShimmer
              className={`${styles.tabButton} ${styles.skeletonShimmer}`}
              style={{ animationDelay: `${idx * 0.1}s` }} // Vẫn giữ animationDelay để các skeleton không shimmer cùng lúc
            >
              {/* Các div bên trong để mô phỏng văn bản, chỉ cần màu nền cơ bản */}
              <div className="w-4/5 h-4 bg-[#2a2a2e] rounded-md mb-1"></div> {/* Skeleton for day name */}
              <div className="w-2/5 h-3 bg-[#2a2a2e] rounded-full"></div> {/* Skeleton for badge (episode count) */}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabsWrapper}>
        {days.map((item) => {
          const isActive = selectedDay === item.day;

          return (
            <button
              key={item.day}
              onClick={() => {
                setSelectedDay(item.day);
                onSelectDay(item.day);
              }}
              className={`${styles.tabButton} ${isActive ? styles.activeTab : ""}`}
            >
              <span className="capitalize text-sm font-semibold">{item.day}</span>
              <span className={`${styles.tabBadge} ${isActive ? styles.tabBadgeActive : ""}`}>
                {item.count} Tập
              </span>
              {isActive && <div className={styles.activeOverlay} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
