export const checkEnvironment = (): string => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  
  return (
    (process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_URL
      : process.env.NEXT_PUBLIC_PRODUCTION_URL) || "http://localhost:3000"
  );
};