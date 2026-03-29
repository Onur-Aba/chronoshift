"use client";

import { useAppStore } from "@/store/useAppStore";
import { useDroppable } from "@dnd-kit/core";
import { Pin, Trash2, UserX } from "lucide-react";

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const AssignmentCell = ({ employeeId, day }: { employeeId: string, day: string }) => {
    const id = `${employeeId}-${day}`;
    const { isOver, setNodeRef } = useDroppable({ id, data: { type: "Cell", id } });
    const { assignments, updateAssignment, presets } = useAppStore(); 
    const assign = assignments.find(a => a.id === id);

    let customStyle = {};
    let isBos = !assign || assign.type === 'BOS';

    // Premium Blending: Seçilen rengin çok hafif bir yansıması
    if (!isBos && assign) {
        const presetColor = presets[assign.type]?.color || '#94a3b8';
        customStyle = {
            backgroundColor: `${presetColor}1A`, 
            borderColor: `${presetColor}4D`, 
            color: presetColor,
            boxShadow: `inset 0 0 12px ${presetColor}0A` // Hafif iç parlama
        };
    }

    return (
        <div 
            ref={setNodeRef} 
            style={customStyle} 
            // UX DOKUNUŞU: Boş hücreler içe çökük (shadow-inner), dolu hücreler şık çerçeveli. Drag-over anında neon parlama.
            className={`relative flex flex-col items-center justify-center p-2 min-h-[76px] border rounded-2xl transition-all duration-300 ease-out 
                ${isBos ? 'bg-background/50 border-border/40 border-dashed text-muted-foreground shadow-inner hover:bg-background/80' : 'shadow-sm hover:shadow-md hover:scale-[1.02]'} 
                ${isOver ? 'ring-2 ring-primary bg-primary/5 scale-105 shadow-xl z-10' : ''}`}
        >
            {assign?.isLocked && <Pin size={12} className="absolute top-2 right-2 opacity-40 drop-shadow-md" />}
            
            {!isBos && assign ? (
                assign.type === 'IZIN' ? ( 
                    <span className="font-black text-2xl opacity-40 tracking-widest transition-opacity duration-500 drop-shadow-sm">X</span> 
                ) : (
                    <div className="flex flex-col gap-1.5 items-center z-10 w-full px-1 transition-all duration-500">
                        {/* Premium Time Inputs (Kapsül Tasarım) */}
                        <div className="bg-background/80 px-1.5 py-0.5 rounded-md border border-border/50 shadow-inner w-full flex justify-center">
                            <input type="time" value={assign.startTime} onChange={(e) => updateAssignment(id, assign.type, e.target.value, assign.endTime, true)} className="bg-transparent outline-none text-center text-[11px] font-bold font-mono w-full cursor-pointer hover:opacity-70 transition-opacity" />
                        </div>
                        <div className="bg-background/80 px-1.5 py-0.5 rounded-md border border-border/50 shadow-inner w-full flex justify-center">
                            <input type="time" value={assign.endTime} onChange={(e) => updateAssignment(id, assign.type, assign.startTime, e.target.value, true)} className="bg-transparent outline-none text-center text-[11px] font-bold font-mono w-full cursor-pointer hover:opacity-70 transition-opacity" />
                        </div>
                    </div>
                )
            ) : <span className="text-[10px] font-medium tracking-widest uppercase opacity-30 transition-opacity duration-500">BOS</span>}
        </div>
    );
};

export const CalendarBoard = ({ onOptimize, isOptimizing }: { onOptimize: () => void; isOptimizing: boolean; }) => {
    const { currentState, employees, assignments, clearCalendar, clearEmployees, updateEmployeeTargetHours, removeEmployee } = useAppStore();

    const getDiff = (s: string, e: string) => {
        if(!s || !e) return 0;
        const [sH, sM] = s.split(':').map(Number);
        const [eH, eM] = e.split(':').map(Number);
        let diff = (eH + eM/60) - (sH + sM/60);
        return diff < 0 ? diff + 24 : diff;
    };

    return (
        // MİMARİ DEVRİM: Yüzen Ada (Floating Island). Sidebar ile mükemmel simetri. my-4 ml-4 mr-2 ile çerçeveden koptu.
        <div className="flex-1 my-4 ml-4 mr-2 p-6 flex flex-col bg-card/90 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl overflow-hidden relative transition-all duration-500 ease-in-out">
            
            {/* Üst Kontrol Paneli */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0 transition-colors duration-500">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight transition-colors duration-500 drop-shadow-sm">Vardiya Matrisi</h1>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest transition-colors duration-500">Durum: <span className="text-primary">{currentState}</span></span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={clearEmployees} className="px-4 py-2.5 rounded-xl font-bold text-sm text-red-600 bg-red-500/10 hover:bg-red-500/20 flex items-center gap-2 transition-all duration-300 active:scale-95 shadow-sm border border-red-500/10"><UserX size={15}/> Personelleri Sil</button>
                    <button onClick={clearCalendar} className="px-4 py-2.5 rounded-xl font-bold text-sm text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 flex items-center gap-2 transition-all duration-300 active:scale-95 shadow-sm border border-amber-500/10"><Trash2 size={15}/> Takvimi Temizle</button>
{/* Eski Hali: className="... text-primary-foreground bg-primary ..." */}
                    <button onClick={onOptimize} disabled={isOptimizing} className="px-7 py-2.5 rounded-xl font-extrabold text-sm text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2">
                        ✨ {isOptimizing ? 'Hesaplanıyor...' : 'Otomatik Diz'}
                    </button>
                </div>
            </div>

            {/* MİMARİ DOKUNUŞ: Tablo alanı içe çökük (shadow-inner), arkaplanı hafif transparan. Çalışma alanı hissi verir. */}
            <div className="flex-1 bg-background/40 backdrop-blur-sm border border-border/50 rounded-2xl shadow-inner flex flex-col min-h-0 transition-colors duration-500 ease-in-out overflow-hidden">
                
                {/* Tablo Başlıkları */}
                <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-border/60 bg-card/40 flex-shrink-0 transition-colors duration-500">
                    <div className="p-4 font-extrabold text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-500 flex items-center">Personel & Kota</div>
                    {DAYS.map(day => <div key={day} className="p-4 font-extrabold text-xs uppercase tracking-widest text-center text-foreground transition-colors duration-500">{day}</div>)}
                </div>
                
                {/* Tablo Gövdesi (Scroll) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-10 transition-colors duration-500">
                    {employees.map(emp => {
                        let assignedHours = 0;
                        assignments.filter(a => a.employeeId === emp.id && a.type !== 'IZIN' && a.type !== 'BOS').forEach(a => {
                            assignedHours += getDiff(a.startTime, a.endTime);
                        });
                        
                        const isOvertime = assignedHours > emp.targetHours;
                        const isPerfect = assignedHours === emp.targetHours;
                        const statusColor = isOvertime ? "bg-red-500/15 text-red-600 border-red-500/20" : isPerfect ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : "bg-primary/15 text-primary border-primary/20";

                        return (
                            <div key={emp.id} className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-border/40 hover:bg-card/60 transition-colors duration-300 group/row">
                                <div className="p-4 flex flex-col justify-center border-r border-border/40 relative transition-colors duration-500">
                                    <button onClick={() => removeEmployee(emp.id)} className="absolute top-2 right-2 text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-all duration-300 hover:scale-110"><Trash2 size={14}/></button>
                                    
                                    <span className="font-extrabold text-foreground text-sm mb-3 truncate pr-6 transition-colors duration-500 drop-shadow-sm">{emp.name}</span>
                                    
                                    <div className="flex justify-between items-center text-xs transition-colors duration-500 bg-background/50 p-2 rounded-xl border border-border/40 shadow-inner">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-muted-foreground text-[9px] font-black uppercase tracking-wider opacity-70 transition-colors duration-500">Hedef</span>
                                            <input type="number" value={emp.targetHours} onChange={(e) => updateEmployeeTargetHours(emp.id, Number(e.target.value))} className="w-11 p-1 bg-card border border-border/50 shadow-sm rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-foreground text-center font-mono font-bold transition-all duration-300" />
                                        </div>
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-muted-foreground text-[9px] font-black uppercase tracking-wider opacity-70 transition-colors duration-500">Mevcut</span>
                                            <span className={`px-2 py-1 rounded-md font-bold font-mono border transition-all duration-500 shadow-sm ${statusColor}`}>{assignedHours.toFixed(1)}s</span>
                                        </div>
                                    </div>
                                </div>
                                {DAYS.map(day => ( <div key={day} className="p-2 transition-colors duration-500"><AssignmentCell employeeId={emp.id} day={day} /></div> ))}
                            </div>
                        );
                    })}
                    
                    {employees.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 font-medium transition-colors duration-500 gap-3">
                            <UserX size={48} className="opacity-20" />
                            <span>Havuz boş. İşlem yapmak için sağ panelden personel ekleyin.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};