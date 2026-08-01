"use client";
import React from "react";
import type { ServerOption } from "@/types/stream";

interface ServerSelectorProps {
  servers: ServerOption[];
  activeKey: string | null;
  loading?: boolean;
  onSelect: (server: ServerOption) => void;
}

// Chỉ hiện khi provider hiện tại thật sự có nhiều hơn 1 server để chọn (yêu cầu "khi click
// vô [tập/provider] thì mới hiện ra" — nghĩa là component này render lười, không có gì thì ẩn hẳn).
const ServerSelector: React.FC<ServerSelectorProps> = ({ servers, activeKey, loading, onSelect }) => {
  if (!servers || servers.length <= 1) return null;

  const subServers = servers.filter((s) => s.type === "sub" || s.type === "hsub");
  const dubServers = servers.filter((s) => s.type === "dub");

  const renderRow = (label: string, list: ServerOption[]) => {
    if (list.length === 0) return null;
    return (
      <div className="flex items-center gap-2 flex-wrap mb-2 last:mb-0">
        <span className="text-xs font-semibold text-[#ffffffb2] w-9 shrink-0">{label}</span>
        {list.map((s) => (
          <button
            key={s.key}
            type="button"
            disabled={loading}
            onClick={() => onSelect(s)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${
              activeKey === s.key
                ? "bg-[#d14836] text-white"
                : "bg-[#403c44] hover:bg-[#d14836]/70 text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-2 bg-[#18181b] rounded-lg p-3">
      {renderRow("SUB", subServers)}
      {renderRow("DUB", dubServers)}
    </div>
  );
};

export default ServerSelector;
