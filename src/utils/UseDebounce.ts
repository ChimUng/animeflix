"use client";
import { useState, useEffect } from "react";

/**
 * Hook để debounce giá trị, trả về sau khoảng delay
 * @param value Giá trị cần debounce
 * @param delay Thời gian chờ (ms)
 */
export default function UseDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
        setDebouncedValue(value);
        }, delay);

        return () => {
        clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
