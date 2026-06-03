"use client";

import CardNav, { CardNavItem } from "../ui/CardNav";
import { useTheme } from "next-themes";
import { Moon, Sun, Repeat2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

const navItems: CardNavItem[] = [
  {
    label: "Anasayfa",
    bgColor: "#0e0880",
    textColor: "#fff",
    links: [
      { label: "Anasayfa", href: "#", ariaLabel: "Anasayfa", isExternal: false }
    ]
  },
  {
    label: "Geliştirici",
    bgColor: "#1E293B",
    textColor: "#fff",
    links: [
      { label: "Onur Aba - Portfolio", href: "https://onur-aba.vercel.app/", ariaLabel: "Portfolio", isExternal: true }
    ]
  },
  {
    label: "Açık Kaynak",
    bgColor: "#0F172A",
    textColor: "#fff",
    links: [
      { label: "GitHub Reposu", href: "https://github.com/Onur-Aba/chronoshift", ariaLabel: "GitHub", isExternal: true }
    ]
  }
];

export const Header = () => {
  const { theme, setTheme } = useTheme();
  const { operationMode, setOperationMode } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const nextMode = operationMode === 'MAGAZA' ? 'DEPO' : 'MAGAZA';
  
  useEffect(() => setMounted(true), []);

  return (
    <header className="relative w-full z-50 bg-[var(--background)] flex-shrink-0 transition-colors duration-500 pb-2 border-b border-border/40">
      <CardNav
        logoText="vardia"
        items={navItems}
        baseColor="var(--card)"
        menuColor="var(--foreground)"
      />
      {mounted && (
        <div className="absolute right-5 top-5 z-[100] flex items-center gap-2">
          <button
            onClick={() => setOperationMode(nextMode)}
            className="h-10 px-3 md:px-4 rounded-full border border-border bg-card text-foreground hover:bg-muted transition-all shadow-sm flex items-center gap-2 text-xs font-black uppercase tracking-widest"
            title="Planlama modunu değiştir"
          >
            <Repeat2 size={16} />
            <span className="hidden sm:inline">{operationMode === 'MAGAZA' ? 'Mağaza Modu' : 'Depo Modu'}</span>
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-10 w-10 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all shadow-sm flex items-center justify-center"
            aria-label="Tema değiştir"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      )}
    </header>
  );
};
