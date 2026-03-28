"use client";

import { AlertTriangle } from "lucide-react";

interface Props {
    isOpen: boolean;
    onConfirm: () => void;
    onDecline: () => void;
}

export const LockPopup = ({ isOpen, onConfirm, onDecline }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border border-gray-100 transform transition-all scale-100">
                <div className="flex items-center gap-3 text-amber-500 mb-4">
                    <AlertTriangle size={28} />
                    <h3 className="text-lg font-bold text-gray-800">Dengeyi Bozuyorsunuz</h3>
                </div>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                    Bu atamayı o gün için <strong>sabitleyip</strong> (kilitleyip), geri kalan programı bozulan adalet dengesine göre yeniden optimize edeyim mi?
                </p>
                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={onDecline}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Hayır, sadece bırak
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                    >
                        Evet, Kilitle ve Yeniden Diz
                    </button>
                </div>
            </div>
        </div>
    );
};