export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_DEV_URL;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}