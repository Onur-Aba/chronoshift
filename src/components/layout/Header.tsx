"use client";

import CardNav, { CardNavItem } from "../ui/CardNav";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

// KUSURSUZ MİMARİ: Statik veri bileşenin DIŞINA çıkarıldı (Referential Stability).
// Böylece tema değiştiğinde GSAP motoru dizinin değiştiğini sanıp animasyonu öldürmeyecek.
const navItems: CardNavItem[] = [
  {
    label: "Anasayfa",
    bgColor: "#0e0880", // Indigo-600 (Aktif/Seçili hissi verir)
    textColor: "#fff",
    links: [
      { label: "Anasayfa", href: "#", ariaLabel: "Anasayfa", isExternal: false }
    ]
  },
  {
    label: "Geliştirici",
    bgColor: "#1E293B", // Slate-800
    textColor: "#fff",
    links: [
      { label: "Onur Aba - Portfolio", href: "https://onur-aba.vercel.app/", ariaLabel: "Portfolio", isExternal: true }
    ]
  },
  {
    label: "Açık Kaynak",
    bgColor: "#0F172A", // Slate-900
    textColor: "#fff",
    links: [
      { label: "GitHub Reposu", href: "https://github.com/Onur-Aba/chronoshift", ariaLabel: "GitHub", isExternal: true }
    ]
  }
];

export const Header = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  return (
    // h-[100px] sildik. Artık dinamik büyüyor. pb-2 eklendi.
    <header className="relative w-full z-50 bg-[var(--background)] flex-shrink-0 transition-colors duration-500 pb-2">
      <CardNav
        logoText="chronoshift"
        items={navItems}
        baseColor="var(--card)"
        menuColor="var(--foreground)"
      />
      {/* KUSURSUZ THEME TOGGLE */}
      {mounted && (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="absolute right-6 top-6 z-[100] p-2 rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:scale-110 transition-all shadow-sm"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      )}
    </header>
  );
};