import { Alata } from 'next/font/google'
// import localFont from 'next/font/local';
import './globals.css'
import { NextUiProvider } from "./NextUiProvider";
import NextTopLoader from 'nextjs-toploader';
import Search from '@/components/search/Search'
import Footer from '@/components/Footer';
import Script from "next/script";
import { getAuthSession } from './api/auth/[...nextauth]/route';
import { Toaster } from 'sonner'
import FloatingButton from '@/components/FloatingButton';
import { AuthProvider } from './SessionProvider';
import GoToTop from '@/components/GoToTop';
import Changelogs from '@/components/Changelogs';
import type { Metadata } from 'next'

const alata = Alata({ subsets: ['latin', 'vietnamese'], weight: ['400'] });
// const myfont = localFont({ src: "../static-fonts/28 Days Later.ttf" })

const APP_NAME = "Animeflix";
const APP_DEFAULT_TITLE = "Animeflix - Watch Anime Online & Xem Phim Anime Vietsub HD";
const APP_DESCRIPTION = "Watch anime online with English & Vietnamese subtitles for free. Xem phim anime vietsub online chất lượng cao HD, cập nhật tập mới nhanh nhất.";

export const metadata: Metadata = {
  metadataBase: new URL('https://animeflixnow.vercel.app'),
  applicationName: APP_NAME,
  
  title: {
    default: APP_DEFAULT_TITLE,
    template: `%s | ${APP_NAME}`,
  },
  
  icons: {
    icon: "/android-chrome-192x192.png",
    apple: "/apple-touch-icon.png",
  },

  description: APP_DESCRIPTION,

  keywords: [
    // Tiếng Việt
    'xem anime vietsub',
    'xem anime không quảng cáo',
    'anime hay nhất',
    'anime mới nhất',
    'anime hot nhất',
    'anime full hd',
    'anime vietsub mới',
    // Tiếng Anh
    'anime',
    'anilist-tracker',
    'trending anime',
    'watch anime subbed',
    'watch anime dubbed',
    'latest anime episodes',
    'anime streaming sub',
    'anime streaming dub',
    'subbed anime online',
    'dubbed anime online',
    'new anime releases',
    'watch anime sub and dub',
    'anime episodes subtitles',
    'english dubbed anime',
    'subbed and dubbed series',
    'anime series updates',
    'latest subbed anime',
    'latest dubbed anime',
    'aniplay latest anime',
  ],

  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },

  formatDetection: {
    telephone: false,
  },

  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    url: 'https://animeflixnow.vercel.app',
    locale: 'vi_VN',        
    alternateLocale: ['en_US'], 
  },

  twitter: {
    card: "summary",  
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
  },

  alternates: {
    canonical: '/',
    languages: {
      'vi-VN': '/',
      'en-US': '/',
    },
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

interface RootLayoutProps {
  children: React.ReactNode; 
}

export default async function RootLayout({ children }: RootLayoutProps) { 
  const session = await getAuthSession();

  return (
    <html lang="en" className='dark text-foreground bg-background' suppressHydrationWarning={true}>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-W661D2QCV3"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-W661D2QCV3');`}
      </Script>
      <head>
        <meta name="google-site-verification" content="9Cj5Gd0-OuGDtGb4HpRqNfBXy3FuFCcFNWSvTPOlTzE" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
      </head>
      <body className={alata.className}>
        <AuthProvider session={session}>
          <NextUiProvider>
            {children}
          </NextUiProvider>
        </AuthProvider>
        <NextTopLoader color="#CA1313" />
        <Toaster richColors={true} closeButton={true} theme="dark" />
        <Search />
        <Changelogs />
        <FloatingButton session={session} />
        <GoToTop />
        <Footer />
      </body>
    </html>
  )
}
