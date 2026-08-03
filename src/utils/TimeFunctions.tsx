import { useEffect, useState } from "react";

export interface CountdownParts {
    ngay: number;
    gio: number;
    phut: number;
    giay: number;
}

// Tính thời gian tương đối (x phút trước, x ngày trước, ...)
export function NotificationTime(createdAt: number): string {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timeDifference = currentTimestamp - createdAt;
    let formattedRelativeTime = "";

    if (timeDifference < 60) {
        formattedRelativeTime = `${timeDifference} sec ago`;
    } else if (timeDifference < 3600) {
        const minutes = Math.floor(timeDifference / 60);
        formattedRelativeTime = `${minutes} min${minutes > 1 ? "s" : ""} ago`;
    } else if (timeDifference < 86400) {
        const hours = Math.floor(timeDifference / 3600);
        formattedRelativeTime = `${hours} hr${hours > 1 ? "s" : ""} ago`;
    } else if (timeDifference < 7 * 86400) {
        const days = Math.floor(timeDifference / 86400);
        formattedRelativeTime = `${days} day${days > 1 ? "s" : ""} ago`;
    } else if (timeDifference < 30 * 86400) {
        const weeks = Math.floor(timeDifference / (7 * 86400));
        formattedRelativeTime = `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    } else if (timeDifference < 365 * 86400) {
        const months = Math.floor(timeDifference / (30 * 86400));
        formattedRelativeTime = `${months} month${months > 1 ? "s" : ""} ago`;
    } else {
        const years = Math.floor(timeDifference / (365 * 86400));
        formattedRelativeTime = `${years} year${years > 1 ? "s" : ""} ago`;
    }

    return formattedRelativeTime;
}

// Format lại timestamp sang dạng ngày (ví dụ: 14 Jun 2025)
export function formatTimeStamp(timestamp: number): string {
    const milliseconds = timestamp * 1000;
    const date = new Date(milliseconds);
    const options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "short",
        year: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
}

// Format lại timestamp video process
export function formatTime(totalSeconds?: number | null) {
    if (!totalSeconds) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

    return `${formattedMinutes}:${formattedSeconds}`;
}

export function useCountdown(airingAt?: number | null): CountdownParts | null {
  const [timeLeft, setTimeLeft] = useState<CountdownParts | null>(null);

  useEffect(() => {
    if (!airingAt) {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const diff = airingAt * 1000 - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return false;
      }
      setTimeLeft({
        ngay: Math.floor(diff / 86400000),
        gio: Math.floor((diff % 86400000) / 3600000),
        phut: Math.floor((diff % 3600000) / 60000),
        giay: Math.floor((diff % 60000) / 1000),
      });
      return true;
    };

    if (!tick()) return;
    const intervalId = setInterval(() => {
      if (!tick()) clearInterval(intervalId);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [airingAt]);

  return timeLeft;
}

export function formatCountdown(t: CountdownParts, short = false): string {
  if (short) {
    if (t.ngay > 0) return `${t.ngay} ngày ${t.gio} giờ`;
    if (t.gio > 0) return `${t.gio} giờ ${t.phut} phút`;
    return `${t.phut} phút ${t.giay} giây`;
  }
  return `${t.ngay} ngày, ${t.gio} giờ, ${t.phut} phút, ${t.giay} giây`;
}