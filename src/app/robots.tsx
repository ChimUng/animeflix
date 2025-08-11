// robots.tsx

export default function robots() {
  // Lấy baseUrl từ biến môi trường
  // Sử dụng một giá trị mặc định nếu biến môi trường không được định nghĩa
  const baseUrl = process.env.NEXT_PUBLIC_DEV_URL;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`, // Sử dụng baseUrl từ biến môi trường
  };
}