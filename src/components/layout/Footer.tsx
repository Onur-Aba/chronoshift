"use client";

import ShinyText from "../ui/ShinyText";

export const Footer = () => {
    return (
      <footer className="w-full bg-gray-50 border-t border-gray-200 py-4 flex items-center justify-center flex-shrink-0 z-40">
          <p className="text-sm font-medium text-gray-500 tracking-wide flex items-center gap-1.5">
              Made by 
              <a 
                href="https://onur-aba.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold hover:scale-105 transition-transform"
                title="Geliştirici Portfolyosu"
              >
                  <ShinyText 
                    text="Onur Aba" 
                    speed={3} 
                    color="#4F46E5"        // Indigo 600 (Ana Renk)
                    shineColor="#A5B4FC"   // Indigo 300 (Parlama Rengi)
                    spread={110} 
                  />
              </a>
          </p>
      </footer>
    );
};