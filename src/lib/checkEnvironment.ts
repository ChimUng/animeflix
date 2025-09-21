export const checkEnvironment = (): string => {
  if (typeof window !== "undefined") {
    // ✅ Khi chạy trên browser, lấy domain thật
    return window.location.origin;
  }

  // ✅ Chạy server-side thì lấy env
  return (
    (process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_URL
      : process.env.NEXT_PUBLIC_PRODUCTION_URL) || "http://localhost:3000"
  );
};