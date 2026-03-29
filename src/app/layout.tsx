import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chronoshift.vercel.app"), // Kendi Vercel domainin ne olacaksa onu yaz
  // 1. TEMEL SEO KİMLİĞİ (Google Arama Sonuçları)
  title: {
    default: "ChronoShift | Yapay Zeka Destekli Akıllı Vardiya Planlama",
    template: "%s | ChronoShift"
  },
  description: "Perakende ve mağazacılık operasyonları için geliştirilmiş, yapay zeka destekli otomatik vardiya çizelgeleme ve personel yönetim sistemi.",
  keywords: [
    "vardiya planlama", 
    "otomatik vardiya programı", 
    "personel yönetimi", 
    "nöbet çizelgesi", 
    "mağaza yönetimi", 
    "AI çizelgeleme", 
    "ChronoShift"
  ],
  authors: [{ name: "Onur Aba", url: "https://onur-aba.vercel.app/" }],
  creator: "Onur Aba",

  // 2. OPEN GRAPH (WhatsApp, LinkedIn, Discord Paylaşım Önizlemeleri)
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://chronoshift.vercel.app/", // Vercel'den alacağın gerçek domaini buraya yazacaksın
    title: "ChronoShift | Akıllı Vardiya Planlama Sistemi",
    description: "Saniyeler içinde hatasız, adil ve otomatik vardiya takvimleri oluşturun. Açılış ve kapanış krizlerine son verin.",
    siteName: "ChronoShift",
    images: [
      {
        url: "/og-image.png", // Birazdan bu görseli nasıl ekleyeceğini anlatacağım
        width: 1200,
        height: 630,
        alt: "ChronoShift Vardiya Yönetim Sistemi Görseli",
      },
    ],
  },

  // 3. TWITTER / X KARTI
  twitter: {
    card: "summary_large_image",
    title: "ChronoShift | Akıllı Vardiya Planlama",
    description: "Saniyeler içinde hatasız, adil ve otomatik vardiya takvimleri oluşturun.",
    images: ["/og-image.png"],
    creator: "@onur_aba", // Varsa Twitter/X kullanıcı adın
  },

  // 4. ARAMA MOTORU BOTLARI İÇİN İZİNLER
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning Next.js'in tema yüklenirken hata vermesini önler
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}