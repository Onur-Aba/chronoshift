"use client";

import { AlertTriangle } from "lucide-react";

interface Props {
    message: string | null;
    onClose: () => void;
}

export const AlertPopup = ({ message, onClose }: Props) => {
    if (!message) return null;

    return (
        // Arkaplanı buğulandıran cam efekti
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-500">
            <div className="bg-card border border-border shadow-2xl rounded-3xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-1 border border-amber-500/20">
                        <AlertTriangle size={28} />
                    </div>
                    <h3 className="text-xl font-extrabold text-foreground tracking-tight">Uyarı</h3>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed px-2">
                        {message}
                    </p>
                    <button 
                        onClick={onClose} 
                        className="mt-4 w-full px-4 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl transition-transform active:scale-95"
                    >
                        Anladım
                    </button>
                </div>
            </div>
        </div>
    );
};