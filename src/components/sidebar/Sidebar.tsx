"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical, RotateCcw, Plus, Users, Palette } from "lucide-react";
import { ShiftPreset } from "@/types";

// 1. DOKUNSAL ŞABLON KARTI (Premium UX & Blending)
const PresetCard = ({ presetKey, preset }: { presetKey: string, preset: ShiftPreset }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ 
        id: `preset-${presetKey}`, 
        data: { type: "Preset", presetType: preset.type, preset } 
    });
    const { updatePreset } = useAppStore();

    // MİMARİ RENK MOTORU V3: Sol kenara kalın bir vurgu, arkaplana ise 
    // seçilen rengin şeffaf bir degrade (gradient) geçişini uyguluyoruz.
    const customStyle = {
        borderLeftColor: preset.color,
        background: `linear-gradient(to right, ${preset.color}15 0%, ${preset.color}05 100%)`,
        color: preset.color
    };

    return (
        <div 
            ref={setNodeRef} 
            style={customStyle} 
            // UX DOKUNUŞU: border-l-4 ile renk vurgusu, yumuşak scale ve hover gölgeleri.
            className={`flex items-stretch border border-border/50 border-l-4 rounded-2xl shadow-sm mb-4 transition-all duration-300 group hover:shadow-md hover:border-border hover:scale-[1.02] relative overflow-hidden bg-background/30 backdrop-blur-sm ${isDragging ? 'opacity-40 scale-95 shadow-2xl' : ''}`}
        >
            {/* Profesyonel Sürükleme Tutamacı */}
            <div 
                {...listeners} 
                {...attributes} 
                className="w-11 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 touch-none bg-black/5 dark:bg-white/5 transition-colors border-r border-border/30"
            >
                <GripVertical size={18} className="group-hover:scale-110 transition-transform" />
            </div>
            
            <div className="flex-1 p-3.5 flex justify-between items-center gap-3">
                <div className="flex flex-col gap-1">
                    <span className="font-extrabold text-sm tracking-tight text-foreground">{preset.label}</span>
                    {preset.type === 'IZIN' && <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Serbest Gün</span>}
                </div>
                
                <div className="flex items-center gap-4">
                    {preset.type !== 'IZIN' && (
                        // UX DOKUNUŞU: Saat girişleri kapsüllendi (Pill Design) ve monospace yapıldı.
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 bg-background/90 px-2 py-1 rounded-md border border-border/60 shadow-inner">
                                <span className="text-[9px] font-black uppercase opacity-50 w-8 text-right">GİRİŞ</span>
                                <input type="time" value={preset.startTime} onChange={e => updatePreset(presetKey, e.target.value, preset.endTime, preset.color)} className="bg-transparent outline-none text-xs font-bold font-mono cursor-pointer text-foreground" />
                            </div>
                            <div className="flex items-center gap-2 bg-background/90 px-2 py-1 rounded-md border border-border/60 shadow-inner">
                                <span className="text-[9px] font-black uppercase opacity-50 w-8 text-right">ÇIKIŞ</span>
                                <input type="time" value={preset.endTime} onChange={e => updatePreset(presetKey, preset.startTime, e.target.value, preset.color)} className="bg-transparent outline-none text-xs font-bold font-mono cursor-pointer text-foreground" />
                            </div>
                        </div>
                    )}
                    
                    {/* Profesyonel Renk Seçici (Floating Color Picker) */}
                    <label className="cursor-pointer relative flex items-center justify-center group/color" title="Rengi Değiştir">
                        <input 
                            type="color" 
                            value={preset.color} 
                            onChange={e => updatePreset(presetKey, preset.startTime, preset.endTime, e.target.value)}
                            className="absolute opacity-0 w-0 h-0" 
                        />
                        <div className="w-7 h-7 rounded-full border-2 border-background shadow-md group-hover/color:scale-110 transition-transform duration-300 ring-2 ring-transparent group-hover/color:ring-border/50" style={{ backgroundColor: preset.color }}></div>
                    </label>
                </div>
            </div>
        </div>
    );
};

// 2. ANA KONTROL MERKEZİ (Floating Island UI)
export const Sidebar = () => {
    const { addEmployee, presets, resetPresets } = useAppStore();
    const [name, setName] = useState("");

    const handleAdd = (e: React.FormEvent) => { e.preventDefault(); if(name.trim()) { addEmployee(name, 45); setName(""); } };

    return (
        // MİMARİ DOKUNUŞ: Sayfanın sağına yapışık olmak yerine, my-4 mr-4 (margin) ile süzülen (floating), 
        // rounded-3xl ile yumuşatılmış ve shadow-2xl ile derinleştirilmiş bir cam fanus (Glassmorphism).
<aside className="w-auto lg:w-[380px] h-[500px] lg:h-[calc(100%-2rem)] mx-4 lg:ml-0 my-4 lg:mr-4 flex-shrink-0 bg-card/90 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl p-4 lg:p-6 flex flex-col z-20 overflow-hidden relative transition-all duration-500">            
            {/* Personel Ekleme Alanı */}
            <div className="mb-8 pb-6 border-b border-border/50">
                <div className="flex items-center gap-2 mb-4 text-foreground">
                    <Users size={18} className="text-primary" />
                    <h2 className="text-sm font-extrabold uppercase tracking-widest">Personel Yönetimi</h2>
                </div>
                
                {/* Form İçi Focus (Focus-within) Animasyonları */}
                <form onSubmit={handleAdd} className="flex gap-2 bg-background/50 border border-border/50 p-1.5 rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-primary/40 transition-all">
                    <input type="text" placeholder="İsim Soyisim ekle..." value={name} onChange={e => setName(e.target.value)} className="flex-1 px-3 py-2 bg-transparent text-sm outline-none font-medium text-foreground placeholder:text-muted-foreground/50" />
{/* Eski Hali: className="bg-primary text-primary-foreground..." */}
                    <button type="submit" className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 shadow-sm transition-transform active:scale-95 flex items-center gap-1.5">
                        <Plus size={16} /> Ekle
                    </button>
                </form>
            </div>

            {/* Şablonlar ve Renkler Alanı */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2 text-foreground">
                        <Palette size={18} className="text-primary" />
                        <h2 className="text-sm font-extrabold uppercase tracking-widest">Kalıplar & Renkler</h2>
                    </div>
                    
                    {/* Premium Sıfırlama Butonu */}
                    <button onClick={resetPresets} className="text-[11px] flex items-center gap-1.5 font-bold text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-full transition-all border border-amber-500/10 shadow-sm" title="Varsayılan renklere dön">
                        <RotateCcw size={12} /> Sıfırla
                    </button>
                </div>
                
                <p className="text-[11px] font-medium text-muted-foreground/70 mb-5 leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/30">
                    Takvime atamak istediğiniz vardiyayı sol tutamacından tutup sürükleyin. Saatlerini ve renklerini buradan özelleştirebilirsiniz.
                </p>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                    {Object.entries(presets).map(([key, preset]) => (
                        <PresetCard key={key} presetKey={key} preset={preset} />
                    ))}
                </div>
            </div>
        </aside>
    );
};