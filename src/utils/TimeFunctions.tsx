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

export function formatRelativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return 'vừa xong';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} phút trước`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour} giờ trước`;
    const day = Math.floor(hour / 24);
    if (day < 30) return `${day} ngày trước`;
    const month = Math.floor(day / 30);
    if (month < 12) return `${month} tháng trước`;
    const year = Math.floor(month / 12);
    return `${year} năm trước`;
}