"use client";
import React from "react";
import type { ServerOption } from "@/types/stream";
import { EpisodeCountIcon, DubIcon } from "@/lib/SvgIcons";

interface ServerSelectorProps {
  servers: ServerOption[];
  activeKey: string | null;
  loading?: boolean;
  onSelect: (server: ServerOption) => void;
}

const ACTIVE_COLOR = "#A4E745";

// Hàm lọc trùng server name. Ưu tiên 'sub' (softsub) hơn 'hsub' (hardsub) nếu bị trùng.
const deduplicateServers = (serversList: ServerOption[]) => {
  const unique = new Map<string, ServerOption>();
  serversList.forEach((s) => {
    // Tùy theo interface của bạn, dùng s.label hoặc s.server để nhận diện tên server
    const serverName = s.label || (s as any).server; 
    
    if (unique.has(serverName)) {
      const existing = unique.get(serverName);
      // Nếu server đã có là hsub mà server hiện tại là sub -> ghi đè bằng sub
      if (existing?.type === "hsub" && s.type === "sub") {
        unique.set(serverName, s);
      }
    } else {
      unique.set(serverName, s);
    }
  });
  return Array.from(unique.values());
};

const ServerSelector: React.FC<ServerSelectorProps> = ({ servers, activeKey, loading, onSelect }) => {
  if (!servers || servers.length <= 1) return null;

  // Lọc lấy danh sách thô, sau đó chạy qua hàm deduplicate để loại bỏ các server bị đúp
  const rawSubServers = servers.filter((s) => s.type === "sub" || s.type === "hsub");
  const subServers = deduplicateServers(rawSubServers);
  
  // Tương tự cho dub nếu cần (dù dub hiếm khi bị đúp)
  const rawDubServers = servers.filter((s) => s.type === "dub");
  const dubServers = deduplicateServers(rawDubServers);

  const renderRow = (icon: React.ReactNode, label: string, list: ServerOption[]) => {
    if (list.length === 0) return null;
    return (
      <div className="flex items-center gap-2 flex-wrap mb-2 last:mb-0">
        <span className="flex items-center gap-1 text-xs font-semibold text-[#ffffffb2] w-12 shrink-0">
          {icon}
          {label}:
        </span>
        {list.map((s) => {
          const isActive = activeKey === s.key;
          return (
            <button
              key={s.key}
              type="button"
              disabled={loading}
              onClick={() => onSelect(s)}
              style={isActive ? { backgroundColor: ACTIVE_COLOR, color: "#111" } : undefined}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${
                isActive ? "" : "bg-[#403c44] hover:bg-[#A4E745]/30 text-white"
              }`}
            >
              {s.label || (s as any).server}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mt-2 flex flex-col items-center">
      <div className="flex flex-col">
        {renderRow(<EpisodeCountIcon className="w-4 h-4" />, "SUB", subServers)}
        {renderRow(<DubIcon className="w-4 h-4" />, "DUB", dubServers)}
      </div>
    </div>
  );
};

export default ServerSelector;