"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const words: string[] = ["KUSURSUZ", "ADİL", "OTOMATİK", "AKILLI"];

export const TextRotate = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((current) => (current + 1) % words.length);
        }, 2500); 
        return () => clearInterval(interval);
    }, []);

    return (
        <span className="relative inline-flex overflow-hidden align-middle text-center">
            
            {/* GÖRÜNMEZ İSKELET: Kutu genişliğini en uzun kelimeye göre ayarlar */}
            <span className="invisible font-extrabold tracking-tight leading-none px-2">
                OTOMATİK
            </span>

            {/* DÖNEN KELİMELER */}
            {words.map((word, i) => {
                // MİMARİ DEVRİM: Sadece 'önceki' kelime yukarı kaçar. 
                // Diğer tüm kelimeler istisnasız 'aşağıda' bekler. 
                // Döngü başa sardığında (KUSURSUZ) mecburen aşağıdan gelir!
                const isCurrent = i === index;
                const isPrevious = i === (index - 1 + words.length) % words.length;

                return (
                    <span
                        key={word}
                        className={cn(
                            // RENK DEVRİMİ: Aydınlıkta 'text-primary' (Koyu Lacivert), Karanlıkta 'dark:text-indigo-400' (Yumuşak Parlak Mavi)
                            "absolute inset-0 font-extrabold tracking-tight text-primary dark:text-indigo-400 leading-none transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] flex items-center justify-center px-2",
                            isCurrent 
                                ? "translate-y-0 opacity-100" 
                                : isPrevious
                                    ? "-translate-y-full opacity-0"
                                    : "translate-y-full opacity-0"
                        )}
                    >
                        {word}
                    </span>
                );
            })}
        </span>
    );
};