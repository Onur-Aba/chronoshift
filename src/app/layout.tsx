import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const siteUrl = "https://vardia.vercel.app";
const siteName = "Vardia";
const siteTitle = "Vardia | Vardiya Planlayıcısı ve Personel Çizelgeleme";
const siteDescription =
  "Vardia; mağaza, depo ve operasyon ekipleri için haftalık vardiya planı, personel çizelgesi, izin günü ve çalışma saati takibini kolaylaştıran modern vardiya planlayıcısıdır.";

const keywords = [
  "vardiya planlayıcısı",
  "vardiya planlama",
  "vardiya çizelgesi",
  "personel çizelgeleme",
  "personel vardiya programı",
  "haftalık vardiya planı",
  "çalışma saati planlama",
  "izin günü planlama",
  "mağaza vardiya planlama",
  "depo vardiya planlama",
  "nöbet çizelgesi",
  "otomatik vardiya oluşturma",
  "personel yönetimi",
  "Vardia",
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: siteName,
      inLanguage: "tr-TR",
      description: siteDescription,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#webapp`,
      name: siteName,
      alternateName: ["Vardiya Planlayıcısı", "Personel Vardiya Programı", "Vardiya Çizelgesi"],
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      browserRequirements: "Modern web browser",
      inLanguage: "tr-TR",
      isAccessibleForFree: true,
      description: siteDescription,
      featureList: [
        "Haftalık vardiya planı oluşturma",
        "Mağaza ve depo operasyon modları",
        "Personel çalışma saati takibi",
        "İzin günü ve vardiya kalıbı yönetimi",
        "Sürükle bırak vardiya düzenleme",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "TRY",
      },
      creator: {
        "@type": "Person",
        name: "Onur Aba",
        url: "https://onur-aba.vercel.app/",
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteName,
      url: siteUrl,
      logo: `${siteUrl}/icon.png`,
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords,
  authors: [{ name: "Onur Aba", url: "https://onur-aba.vercel.app/" }],
  creator: "Onur Aba",
  publisher: siteName,
  category: "business software",
  alternates: {
    canonical: "/",
    languages: {
      "tr-TR": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vardia vardiya planlayıcısı arayüz önizlemesi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
