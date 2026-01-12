import { Inter } from 'next/font/google'
import './globals.css'
import { NextUiProvider } from "./NextUiProvider";
import NextTopLoader from 'nextjs-toploader';
import Search from '@/components/search/Search'
import Footer from '@/components/Footer';
// import localFont from 'next/font/local';
import Script from "next/script";
import { getAuthSession } from './api/auth/[...nextauth]/route';
import { Toaster } from 'sonner'
import FloatingButton from '@/components/FloatingButton';
import { AuthProvider } from './SessionProvider';
import GoToTop from '@/components/GoToTop';
import Changelogs from '@/components/Changelogs';

const inter = Inter({ subsets: ['latin'] })
// const myfont = localFont({ src: "../static-fonts/28 Days Later.ttf" })

const APP_NAME = "Animeflix";
const APP_DEFAULT_TITLE = "Animeflix - Watch Anime Online";
const APP_DESCRIPTION = "Xem phim anime vietsub online xem trên điện thoại di động và máy tính nhanh nhất.";

export const metadata = {
  metadataBase: new URL('https://animeflixnow.vercel.app'),
  applicationName: APP_NAME,
  title: APP_DEFAULT_TITLE,
  icons: {
    icon: "/android-chrome-192x192.png",
    apple: "/apple-touch-icon.png",
  },
  description: APP_DESCRIPTION,
  keywords: [
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
    'anime episodes english sub',
    'anime episodes english dub',
    'latest subbed anime',
    'latest dubbed anime',
    'subbed anime streaming',
    'dubbed anime streaming',
    'aniplay latest anime',
    'xem anime vietsub',
    'xem anime không quảng cáo',
    'anime hay nhất',
    'anime mới nhất',
    'anime hot nhất',
    'anime full hd',
    'anime vietsub mới',
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
  },
  twitter: {
    card: "summary",
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
  },
};


// Định nghĩa kiểu cho props của RootLayout
interface RootLayoutProps {
  children: React.ReactNode; // Định nghĩa children có kiểu React.ReactNode
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
        {/* <script src="https://kit.fontawesome.com/c189d5d7c5.js" crossOrigin="anonymous" async></script> */}
      </head>
      <body className={inter.className}>
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
