"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical, RotateCcw, Plus, Users, Palette, Info } from "lucide-react";
import { DepotShiftType, ShiftPreset } from "@/types";

const PresetCard = ({ presetKey, preset }: { presetKey: string, preset: ShiftPreset }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ 
        id: `preset-${presetKey}`, 
        data: { type: "Preset", presetType: preset.type, preset } 
    });
    const { updatePreset, operationMode } = useAppStore();
    const isBreakMode = operationMode === 'DEPO';
    const isDepotCoreShift = preset.type === 'GUNDUZ' || preset.type === 'GECE';
    const isManualOnly = preset.type === 'ARACI';

    const customStyle = {
        borderLeftColor: preset.color,
        background: `linear-gradient(120deg, ${preset.color}18 0%, ${preset.color}06 100%)`,
        color: preset.color
    };

    return (
        <div 
            ref={setNodeRef} 
            style={customStyle}
            draggable
            onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('application/x-chronoshift-preset', JSON.stringify(preset));
                event.dataTransfer.setData('text/plain', preset.type);
            }}
            {...listeners}
            {...attributes}
            className={`flex items-stretch border border-border/60 border-l-4 rounded-2xl shadow-sm mb-4 transition-all duration-200 group hover:shadow-lg hover:border-border hover:translate-y-[-1px] relative overflow-hidden bg-background/35 backdrop-blur-sm cursor-grab active:cursor-grabbing touch-none ${isDragging ? 'opacity-40 scale-95 shadow-2xl' : ''}`}
        >
            <div 
                className="w-11 flex items-center justify-center opacity-55 group-hover:opacity-100 bg-black/5 dark:bg-white/5 transition-colors border-r border-border/30"
            >
                <GripVertical size={18} />
            </div>
            
            <div className="flex-1 p-3.5 flex justify-between items-center gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-black text-sm tracking-tight text-foreground truncate">{preset.label}</span>
                    {preset.type === 'IZIN' && <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Serbest Gün</span>}
                    {isManualOnly && <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Manuel kullanım</span>}
                    {isBreakMode && isDepotCoreShift && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {preset.targetHours} sa./hafta · {(preset.breakMinutes || 0) / 60} sa. mola
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-4">
                    {preset.type !== 'IZIN' && (
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 bg-background/90 px-2 py-1 rounded-md border border-border/60 shadow-inner">
                                <span className="text-[9px] font-black uppercase opacity-50 w-8 text-right">GİRİŞ</span>
                                <input onPointerDown={(event) => event.stopPropagation()} type="time" value={preset.startTime} onChange={e => updatePreset(presetKey, e.target.value, preset.endTime, preset.color)} className="bg-transparent outline-none text-xs font-bold font-mono cursor-pointer text-foreground" />
                            </div>
                            <div className="flex items-center gap-2 bg-background/90 px-2 py-1 rounded-md border border-border/60 shadow-inner">
                                <span className="text-[9px] font-black uppercase opacity-50 w-8 text-right">ÇIKIŞ</span>
                                <input onPointerDown={(event) => event.stopPropagation()} type="time" value={preset.endTime} onChange={e => updatePreset(presetKey, preset.startTime, e.target.value, preset.color)} className="bg-transparent outline-none text-xs font-bold font-mono cursor-pointer text-foreground" />
                            </div>
                        </div>
                    )}
                    <label onPointerDown={(event) => event.stopPropagation()} className="cursor-pointer relative flex items-center justify-center group/color" title="Rengi değiştir">
                        <input 
                            type="color" 
                            value={preset.color} 
                            onChange={e => updatePreset(presetKey, preset.startTime, preset.endTime, e.target.value)}
                            className="absolute opacity-0 w-0 h-0" 
                        />
                        <div className="w-7 h-7 rounded-full border-2 border-background shadow-md group-hover/color:scale-110 transition-transform ring-2 ring-transparent group-hover/color:ring-border/50" style={{ backgroundColor: preset.color }}></div>
                    </label>
                </div>
            </div>
        </div>
    );
};

export const Sidebar = () => {
    const { addEmployee, presets, resetPresets, operationMode } = useAppStore();
    const [name, setName] = useState("");
    const [depotShiftType, setDepotShiftType] = useState<DepotShiftType>('GUNDUZ');
    const isDepot = operationMode === 'DEPO';

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if(name.trim()) {
            addEmployee(name, undefined, depotShiftType);
            setName("");
        }
    };

    return (
        <aside className="w-auto lg:w-[390px] h-[820px] lg:h-[calc(100%-1.5rem)] min-h-0 mx-4 lg:ml-0 my-3 lg:mr-4 flex-shrink-0 bg-card/95 backdrop-blur-xl border border-border/70 rounded-[2rem] shadow-2xl p-4 lg:p-6 flex flex-col z-20 overflow-y-auto custom-scrollbar relative transition-all duration-500">            
            <div className="mb-7 pb-6 border-b border-border/50 flex-shrink-0">
                <div className="flex items-center justify-between gap-2 mb-4 text-foreground">
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-primary" />
                        <h2 className="text-sm font-black uppercase tracking-widest">Personel</h2>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isDepot ? 'Depo' : 'Mağaza'}</span>
                </div>
                
                <form onSubmit={handleAdd} className="space-y-2">
                    <div className="flex gap-2 bg-background/55 border border-border/60 p-1.5 rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                        <input type="text" placeholder="İsim soyisim ekle..." value={name} onChange={e => setName(e.target.value)} className="flex-1 px-3 py-2 bg-transparent text-sm outline-none font-medium text-foreground placeholder:text-muted-foreground/50 min-w-0" />
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 shadow-sm transition-transform active:scale-95 flex items-center gap-1.5">
                            <Plus size={16} /> Ekle
                        </button>
                    </div>

                    {isDepot && (
                        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/35 border border-border/50 p-1.5">
                            <button
                                type="button"
                                onClick={() => setDepotShiftType('GUNDUZ')}
                                className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition-all ${depotShiftType === 'GUNDUZ' ? 'bg-red-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-background/70'}`}
                            >
                                Gündüz
                            </button>
                            <button
                                type="button"
                                onClick={() => setDepotShiftType('GECE')}
                                className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition-all ${depotShiftType === 'GECE' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' : 'text-muted-foreground hover:bg-background/70'}`}
                            >
                                Gece
                            </button>
                        </div>
                    )}
                </form>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2 text-foreground">
                        <Palette size={18} className="text-primary" />
                        <h2 className="text-sm font-black uppercase tracking-widest">Vardiya Kalıpları</h2>
                    </div>
                    <button onClick={resetPresets} className="text-[11px] flex items-center gap-1.5 font-bold text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-full transition-all border border-amber-500/10" title="Varsayılan değerlere dön">
                        <RotateCcw size={12} /> Sıfırla
                    </button>
                </div>
                
                <div className="text-[11px] font-medium text-muted-foreground/80 mb-5 leading-relaxed bg-muted/35 p-3 rounded-xl border border-border/40 flex gap-2">
                    <Info size={14} className="mt-0.5 flex-shrink-0 text-primary" />
                    <span>
                        {isDepot
                            ? 'Personel eklerken gündüz/gece profili seçilir. Otomatik dizim 5 çalışma günü ve 2 izin günü oluşturur. Aracı kartı otomatik atanmaz; yalnızca manuel kullanım içindir.'
                            : 'Kalıp saatini değiştirdiğinizde aynı tipteki mevcut vardiyalar otomatik güncellenir.'}
                    </span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                    {Object.entries(presets).map(([key, preset]) => (
                        <PresetCard key={key} presetKey={key} preset={preset} />
                    ))}
                </div>
            </div>
        </aside>
    );
};
