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

    if (!isBos && assign) {
        const presetColor = presets[assign.type]?.color || '#94a3b8';
        customStyle = {
            backgroundColor: `${presetColor}1A`, 
            borderColor: `${presetColor}4D`, 
            color: presetColor
        };
    }

    return (
        // MİMARİ DOKUNUŞ: Hücrelere transition-all ve duration-500 eklendi. Renkler yumuşak geçecek.
        <div 
            ref={setNodeRef} 
            style={customStyle} 
            className={`relative flex flex-col items-center justify-center p-2 min-h-[70px] border rounded-xl transition-all duration-500 ease-in-out ${isBos ? 'bg-card border-border border-dashed text-muted-foreground' : ''} ${isOver ? 'ring-2 ring-primary scale-[1.02]' : ''}`}
        >
            {assign?.isLocked && <Pin size={12} className="absolute top-1.5 right-1.5 opacity-50" />}
            
            {!isBos && assign ? (
                assign.type === 'IZIN' ? ( 
                    <span className="font-black text-xl opacity-50 tracking-widest transition-opacity duration-500">X</span> 
                ) : (
                    <div className="flex flex-col gap-1 items-center z-10 w-full px-1 transition-all duration-500">
                        <input type="time" value={assign.startTime} onChange={(e) => updateAssignment(id, assign.type, e.target.value, assign.endTime, true)} className="bg-transparent outline-none text-center text-xs font-bold w-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors duration-300" />
                        <div className="w-8 border-b border-current opacity-20"></div>
                        <input type="time" value={assign.endTime} onChange={(e) => updateAssignment(id, assign.type, assign.startTime, e.target.value, true)} className="bg-transparent outline-none text-center text-xs font-bold w-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors duration-300" />
                    </div>
                )
            ) : <span className="text-[10px] opacity-30 transition-opacity duration-500">Boş</span>}
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
        // MİMARİ DOKUNUŞ: Ana kapsayıcı bg-background oldu (Header ile aynı). transition-colors ve duration-500 eklendi.
        <div className="flex-1 p-6 overflow-hidden border-r border-border flex flex-col bg-[var(--background)] transition-colors duration-500 ease-in-out">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div className="transition-colors duration-500">
                    <h1 className="text-3xl font-extrabold text-foreground transition-colors duration-500">Vardiya Matrisi</h1>
                    <span className="text-sm font-medium text-muted-foreground mt-1 block transition-colors duration-500">Durum: <span className="font-bold text-primary">{currentState}</span></span>
                </div>
                <div className="flex gap-3">
                    <button onClick={clearEmployees} className="px-4 py-2 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 flex items-center gap-2 transition-all duration-300"><UserX size={16}/> Kişileri Sil</button>
                    <button onClick={clearCalendar} className="px-4 py-2 rounded-xl font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 flex items-center gap-2 transition-all duration-300"><Trash2 size={16}/> Takvimi Sıfırla</button>
                    <button onClick={onOptimize} disabled={isOptimizing} className="px-6 py-2 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300">✨ {isOptimizing ? 'Diziliyor...' : 'Otomatik Diz'}</button>
                </div>
            </div>

            {/* MİMARİ DOKUNUŞ: Tablonun içi bg-card oldu. Yumuşak geçiş garantilendi. */}
            <div className="flex-1 bg-[var(--card)] border border-border rounded-2xl shadow-sm flex flex-col min-h-0 transition-colors duration-500 ease-in-out">
                <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-border bg-muted/30 flex-shrink-0 transition-colors duration-500">
                    <div className="p-4 font-bold text-muted-foreground transition-colors duration-500">Personel & Saat</div>
                    {DAYS.map(day => <div key={day} className="p-4 font-bold text-center text-foreground transition-colors duration-500">{day}</div>)}
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-10 transition-colors duration-500">
                    {employees.map(emp => {
                        let assignedHours = 0;
                        assignments.filter(a => a.employeeId === emp.id && a.type !== 'IZIN' && a.type !== 'BOS').forEach(a => {
                            assignedHours += getDiff(a.startTime, a.endTime);
                        });
                        
                        const isOvertime = assignedHours > emp.targetHours;
                        const isPerfect = assignedHours === emp.targetHours;
                        const statusColor = isOvertime ? "bg-red-500/10 text-red-600" : isPerfect ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary";

                        return (
                            <div key={emp.id} className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-border/50 hover:bg-muted/10 transition-colors duration-500">
                                <div className="p-3 flex flex-col justify-center border-r border-border/50 relative group transition-colors duration-500">
                                    <button onClick={() => removeEmployee(emp.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><Trash2 size={14}/></button>
                                    <span className="font-extrabold text-foreground text-sm mb-2 truncate pr-6 transition-colors duration-500">{emp.name}</span>
                                    <div className="flex justify-between items-center text-xs transition-colors duration-500">
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground text-[10px] uppercase transition-colors duration-500">Hedef</span>
                                            <input type="number" value={emp.targetHours} onChange={(e) => updateEmployeeTargetHours(emp.id, Number(e.target.value))} className="w-12 p-1 bg-muted border border-border rounded outline-none focus:border-primary text-foreground text-center transition-colors duration-300" />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-muted-foreground text-[10px] uppercase transition-colors duration-500">Mevcut</span>
                                            <span className={`px-2 py-1 rounded font-bold transition-colors duration-500 ${statusColor}`}>{assignedHours.toFixed(1)}s</span>
                                        </div>
                                    </div>
                                </div>
                                {DAYS.map(day => ( <div key={day} className="p-2 transition-colors duration-500"><AssignmentCell employeeId={emp.id} day={day} /></div> ))}
                            </div>
                        );
                    })}
                    {employees.length === 0 && <div className="p-10 text-center text-muted-foreground font-medium transition-colors duration-500">Lütfen sağ panelden personel ekleyin.</div>}
                </div>
            </div>
        </div>
    );
};