"use client";

import { AlertCircle, Lock, Unlock } from "lucide-react";

interface Props {
    isOpen: boolean;
    onConfirm: () => void;
    onDecline: () => void;
}

export const LockPopup = ({ isOpen, onConfirm, onDecline }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-500">
            <div className="bg-card border border-border shadow-2xl rounded-3xl p-7 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-4 text-primary">
                    <div className="p-2 bg-primary/10 rounded-full border border-primary/20">
                        <AlertCircle size={22} />
                    </div>
                    <h3 className="text-xl font-extrabold text-foreground tracking-tight">Manuel Müdahale</h3>
                </div>
                
                <p className="text-sm font-medium text-muted-foreground mb-8 leading-relaxed">
                    Otomatik dizilmiş kusursuz bir takvime manuel bir vardiya atadınız. Bu yeni vardiyayı <strong className="text-foreground">sabitleyip (kilitleyip)</strong> geri kalan takvimi buna göre yeniden dizmek ister misiniz?
                </p>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button 
                        onClick={onDecline} 
                        className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border/50 rounded-xl transition-all active:scale-95"
                    >
                        <Unlock size={16} /> Sadece Ekle
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-extrabold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 rounded-xl transition-all active:scale-95"
                    >
                        <Lock size={16} /> Kilitle ve Yeniden Diz
                    </button>
                </div>
            </div>
        </div>
    );
};