export const checkEnvironment = (): string => {
  let base_url: string | undefined =
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_URL
      : process.env.NEXT_PUBLIC_PRODUCTION_URL;

  if (!base_url && typeof window !== "undefined") {
    base_url = window.location.origin;
  }

  // Nếu vẫn không có, trả về fallback mặc định
  return base_url || "http://localhost:3000";
};