"use client";

import ShinyText from "../ui/ShinyText";

export const Footer = () => {
    return (
      // 1. DIŞ ZEMİN (Header gibi): Arka planla tamamen aynı renge bürünür (Karanlıkta o parlak dediğin siyah, aydınlıkta beyaz)
      <footer className="w-full bg-[var(--background)] pt-2 pb-6 px-6 flex items-center justify-center flex-shrink-0 z-40 transition-colors duration-500">
          
          {/* 2. İÇ MAT KAPSÜL: Header'ın içindeki menü kutusuyla (CardNav) aynı mat siyah tonu, aynı ovallik ve aynı gölge */}
          <div className="bg-[var(--card)] border border-border px-8 py-3.5 rounded-2xl shadow-sm flex items-center justify-center transition-colors duration-500">
              
              <p className="text-sm font-medium text-muted-foreground tracking-wide flex items-center gap-1.5 transition-colors duration-500">
                  Made by 
                  <a 
                    href="https://onur-aba.vercel.app/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="font-bold hover:scale-105 transition-transform"
                    title="Geliştirici Portfolyosu"
                  >
                      {/* ANİMASYONLU İMZA: Hiç dokunulmadı, parlaklığını koruyor */}
                      <ShinyText 
                        text="Onur Aba" 
                        speed={3} 
                        color="#4F46E5"        // Indigo 600 (Ana Renk)
                        shineColor="#A5B4FC"   // Indigo 300 (Parlama Rengi)
                        spread={110} 
                      />
                  </a>
              </p>

          </div>
      </footer>
    );
};