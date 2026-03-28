"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical, RotateCcw } from "lucide-react";
import { ShiftPreset } from "@/types";

// SÜRÜKLENEBİLİR ŞABLON KARTI (YENİ UX VE RENK MOTORU)
const PresetCard = ({ presetKey, preset }: { presetKey: string, preset: ShiftPreset }) => {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: `preset-${presetKey}`, data: { type: "Preset", presetType: preset.type, preset } });
    const { updatePreset } = useAppStore();

    // MİMARİ DEHA: Sınıflar (Class) yerine kullanıcının seçtiği dinamik HEX renklerini
    // CSS stilleri ile yarı saydam (Opacity) hale getirip uyguluyoruz.
    // + '1A' = %10 Opaklık (Arkaplan)
    // + '4D' = %30 Opaklık (Kenarlık)
    const customStyle = {
        backgroundColor: `${preset.color}1A`,
        borderColor: `${preset.color}4D`,
        color: preset.color
    };

    return (
        <div ref={setNodeRef} style={customStyle} className={`flex items-stretch border rounded-xl shadow-sm mb-3 transition-all hover:shadow-md overflow-hidden relative group`}>
            {/* Sürükleme Tutamacı */}
            <div {...listeners} {...attributes} className="p-2 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100 touch-none bg-black/5 dark:bg-white/5">
                <GripVertical size={16}/>
            </div>
            
            <div className="flex-1 p-2 flex justify-between items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide">{preset.label}</span>
                
                <div className="flex items-center gap-3">
                    {preset.type !== 'IZIN' && (
                        // YENİ UX: Saatler alt alta dizildi.
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 bg-background/60 px-1.5 py-0.5 rounded border border-border/50 shadow-sm">
                                <span className="text-[9px] font-black uppercase opacity-60 w-6">Giriş</span>
                                <input type="time" value={preset.startTime} onChange={e => updatePreset(presetKey, e.target.value, preset.endTime, preset.color)} className="bg-transparent outline-none text-xs font-bold cursor-pointer" />
                            </div>
                            <div className="flex items-center gap-1.5 bg-background/60 px-1.5 py-0.5 rounded border border-border/50 shadow-sm">
                                <span className="text-[9px] font-black uppercase opacity-60 w-6">Çıkış</span>
                                <input type="time" value={preset.endTime} onChange={e => updatePreset(presetKey, preset.startTime, e.target.value, preset.color)} className="bg-transparent outline-none text-xs font-bold cursor-pointer" />
                            </div>
                        </div>
                    )}
                    
                    {/* RENK SEÇİCİ (Color Picker) */}
                    <label className="cursor-pointer relative" title="Rengi Değiştir">
                        <input 
                            type="color" 
                            value={preset.color} 
                            onChange={e => updatePreset(presetKey, preset.startTime, preset.endTime, e.target.value)}
                            className="absolute opacity-0 w-0 h-0" 
                        />
                        <div className="w-6 h-6 rounded-full border-2 border-background shadow-md hover:scale-110 transition-transform" style={{ backgroundColor: preset.color }}></div>
                    </label>
                </div>
            </div>
        </div>
    );
};

export const Sidebar = () => {
    const { addEmployee, presets, resetPresets } = useAppStore();
    const [name, setName] = useState("");

    const handleAdd = (e: React.FormEvent) => { e.preventDefault(); if(name.trim()) { addEmployee(name, 45); setName(""); } };

    return (
        <div className="w-[340px] h-full bg-card border-l border-border p-5 flex flex-col z-20 overflow-y-auto custom-scrollbar">
            <div className="mb-8">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Personel Yönetimi</h2>
                <form onSubmit={handleAdd} className="flex gap-2">
                    <input type="text" placeholder="İsim Soyisim..." value={name} onChange={e => setName(e.target.value)} className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary" />
                    <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 shadow-sm shadow-primary/20">Ekle</button>
                </form>
            </div>

            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Kalıplar & Renkler</h2>
                    {/* ŞABLONLARI SIFIRLAMA BUTONU */}
                    <button onClick={resetPresets} className="text-xs flex items-center gap-1 font-bold text-amber-500 hover:text-amber-600 bg-amber-500/10 px-2 py-1 rounded transition-colors" title="Varsayılan renklere ve saatlere dön">
                        <RotateCcw size={12} /> Sıfırla
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Renk yuvarlaklarına tıklayarak kart renklerini değiştirebilirsiniz. Sürüklenen yeni kartlar bu renkleri alır.</p>
                {Object.entries(presets).map(([key, preset]) => (
                    <PresetCard key={key} presetKey={key} preset={preset} />
                ))}
            </div>
        </div>
    );
};