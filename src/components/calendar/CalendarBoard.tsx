"use client";

import { useAppStore } from "@/store/useAppStore";
import { useDroppable } from "@dnd-kit/core";
import { Pin, Trash2, UserX, Clock3, Warehouse, SlidersHorizontal, RotateCcw } from "lucide-react";
import { DepotRuleSettings, DepotShiftType, MagazaRuleSettings } from "@/types";

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const getDiff = (s: string, e: string) => {
    if(!s || !e) return 0;
    const [sH, sM] = s.split(':').map(Number);
    const [eH, eM] = e.split(':').map(Number);
    let diff = (eH + eM/60) - (sH + sM/60);
    return diff < 0 ? diff + 24 : diff;
};

const getNetHours = (s: string, e: string, breakMinutes = 0) => {
    const gross = getDiff(s, e);
    return Math.max(0, gross - breakMinutes / 60);
};

const formatHours = (hours: number) => Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);

const numberInputClass = "w-full bg-background/80 border border-border/60 rounded-xl px-3 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-primary/30 text-foreground shadow-inner";

const RuleNumberInput = ({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix?: string }) => (
    <label className="flex flex-col gap-1.5 min-w-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{label}</span>
        <div className="relative">
            <input
                type="number"
                min="0"
                step="1"
                value={value}
                onChange={(event) => onChange(Math.max(0, Math.round(Number(event.target.value) || 0)))}
                className={`${numberInputClass} ${suffix ? 'pr-12' : ''}`}
            />
            {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-muted-foreground">{suffix}</span>}
        </div>
    </label>
);

const MagazaRulePanel = ({
    settings,
    updateSettings,
    resetSettings
}: {
    settings: MagazaRuleSettings;
    updateSettings: (settings: Partial<MagazaRuleSettings>) => void;
    resetSettings: () => void;
}) => (
    <div className="mb-3 rounded-2xl border border-primary/15 bg-primary/[0.03] px-3 py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <SlidersHorizontal size={16} />
                </div>
                <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-primary truncate">Mağaza kuralları</div>
                    <p className="text-[11px] font-bold text-muted-foreground truncate">Otomatik Diz bu değerleri kullanır.</p>
                </div>
            </div>
            <button
                type="button"
                onClick={resetSettings}
                className="flex-shrink-0 text-[10px] flex items-center gap-1.5 font-black text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-2 rounded-full transition-all border border-amber-500/10"
            >
                <RotateCcw size={12} /> Varsayılan
            </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5">
            <RuleNumberInput label="Haftalık sabah" value={settings.weeklySabahTarget} suffix="gün" onChange={(value) => updateSettings({ weeklySabahTarget: value })} />
            <RuleNumberInput label="Haftalık full" value={settings.weeklyFullTarget} suffix="gün" onChange={(value) => updateSettings({ weeklyFullTarget: value })} />
            <RuleNumberInput label="Açılış kişi" value={settings.requiredOpeners} suffix="kişi" onChange={(value) => updateSettings({ requiredOpeners: value })} />
            <RuleNumberInput label="Kapanış min." value={settings.minClosers} suffix="kişi" onChange={(value) => updateSettings({ minClosers: value })} />
            <RuleNumberInput label="Açılış limiti" value={settings.maxSabahPerEmployee} suffix="gün" onChange={(value) => updateSettings({ maxSabahPerEmployee: value })} />
        </div>
    </div>
);

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        aria-label={checked ? 'İzinleri arka arkaya koymayı kapat' : 'İzinleri arka arkaya koymayı aç'}
        className={`relative h-7 w-12 flex-shrink-0 overflow-hidden rounded-full transition-all ${checked ? 'bg-primary shadow-sm shadow-primary/25' : 'bg-muted-foreground/25'}`}
    >
        <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-background shadow-md transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const DepotRulePanel = ({
    settings,
    updateSettings,
    resetSettings
}: {
    settings: DepotRuleSettings;
    updateSettings: (settings: Partial<DepotRuleSettings>) => void;
    resetSettings: () => void;
}) => (
    <div className="mb-3 rounded-2xl border border-primary/15 bg-primary/[0.03] px-3 py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <SlidersHorizontal size={16} />
                </div>
                <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-primary truncate">Depo ayarları</div>
                    <p className="text-[11px] font-bold text-muted-foreground truncate">Otomatik Diz depo kuralları.</p>
                </div>
            </div>
            <button
                type="button"
                onClick={resetSettings}
                className="flex-shrink-0 text-[10px] flex items-center gap-1.5 font-black text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-2 rounded-full transition-all border border-amber-500/10"
            >
                <RotateCcw size={12} /> Varsayılan
            </button>
        </div>

        <div className="mt-3 rounded-2xl border border-border/60 bg-background/60 p-3 flex items-center justify-between gap-4 overflow-hidden">
            <div className="min-w-0 pr-2">
                <div className="text-xs font-black uppercase tracking-widest text-foreground">İzinleri arka arkaya koy</div>
                <p className="mt-1 text-[11px] font-bold text-muted-foreground">Açıkken depo otomatik diziminde 2 izin günü yan yana planlanır.</p>
            </div>
            <ToggleSwitch checked={settings.consecutiveRestDays} onChange={(checked) => updateSettings({ consecutiveRestDays: checked })} />
        </div>
    </div>
);

const DayHeaderCell = ({ day, isClosed, onToggle }: { day: string; isClosed: boolean; onToggle: () => void }) => (
    <div className="p-2 lg:p-3 font-black text-[10px] lg:text-xs uppercase tracking-widest text-center text-foreground flex flex-col items-center justify-center gap-2">
        <span>{day}</span>
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={isClosed}
            className={`group inline-flex items-center gap-1.5 rounded-full border px-2 py-1 transition-all ${isClosed ? 'border-red-500/25 bg-red-500/10 text-red-600' : 'border-border/70 bg-background/70 text-muted-foreground hover:text-foreground'}`}
        >
            <span className={`relative h-3.5 w-7 rounded-full transition-all ${isClosed ? 'bg-red-500/70' : 'bg-muted-foreground/25'}`}>
                <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-background shadow-sm transition-transform ${isClosed ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider">{isClosed ? 'Kapalı' : 'Açık'}</span>
        </button>
    </div>
);

const AssignmentCell = ({ employeeId, day, isDayClosed }: { employeeId: string, day: string, isDayClosed: boolean }) => {
    const id = `${employeeId}-${day}`;
    const { isOver, setNodeRef } = useDroppable({ id, data: { type: "Cell", id }, disabled: isDayClosed });
    const { assignments, updateAssignment, presets, operationMode } = useAppStore(); 
    const assign = assignments.find(a => a.id === id);
    const isBos = !assign || assign.type === 'BOS';

    const presetColor = !isBos && assign && !isDayClosed ? presets[assign.type]?.color || '#94a3b8' : '#94a3b8';
    const customStyle = !isBos && assign && !isDayClosed ? {
        backgroundColor: `${presetColor}14`,
        borderColor: `${presetColor}55`,
        color: presetColor,
        boxShadow: `inset 0 0 18px ${presetColor}0D`
    } : {};

    const isRest = assign?.type === 'IZIN';
    const isDepot = operationMode === 'DEPO';

    return (
        <div 
            ref={setNodeRef} 
            style={customStyle}
            className={`relative flex flex-col items-center justify-center p-2 min-h-[78px] border rounded-2xl transition-all duration-200 ease-out
                ${isDayClosed ? 'bg-red-500/10 border-red-500/20 text-red-600 shadow-inner' : isBos ? 'bg-background/45 border-border/50 border-dashed text-muted-foreground shadow-inner hover:bg-background/80' : 'shadow-sm hover:shadow-md hover:scale-[1.01]'} 
                ${isOver && !isDayClosed ? 'ring-2 ring-primary bg-primary/5 scale-[1.03] shadow-xl z-10' : ''}`}
        >
            {isDayClosed ? (
                <span className="font-black text-sm lg:text-base uppercase tracking-[0.22em] opacity-80">Kapalı</span>
            ) : (
                <>
                    {assign?.isLocked && <Pin size={12} className="absolute top-2 right-2 opacity-45" />}
                    {!isBos && assign ? (
                        isRest ? (
                            <span className="font-black text-2xl opacity-40 tracking-widest">X</span>
                        ) : (
                            <div className="flex flex-col gap-1.5 items-center z-10 w-full px-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">{presets[assign.type]?.label || assign.type}</span>
                                <div className="bg-background/85 px-1.5 py-0.5 rounded-md border border-border/50 shadow-inner w-full flex justify-center">
                                    <input type="time" value={assign.startTime} onChange={(e) => updateAssignment(id, assign.type, e.target.value, assign.endTime, true)} className="bg-transparent outline-none text-center text-[11px] font-bold font-mono w-full cursor-pointer text-foreground" />
                                </div>
                                <div className="bg-background/85 px-1.5 py-0.5 rounded-md border border-border/50 shadow-inner w-full flex justify-center">
                                    <input type="time" value={assign.endTime} onChange={(e) => updateAssignment(id, assign.type, assign.startTime, e.target.value, true)} className="bg-transparent outline-none text-center text-[11px] font-bold font-mono w-full cursor-pointer text-foreground" />
                                </div>
                                {isDepot && (presets[assign.type]?.breakMinutes || 0) > 0 && <span className="text-[9px] font-bold text-muted-foreground">1 sa. mola</span>}
                                {assign.type === 'ARACI' && <span className="text-[9px] font-bold text-muted-foreground">manuel</span>}
                            </div>
                        )
                    ) : <span className="text-[10px] font-semibold tracking-widest uppercase opacity-35">BOŞ</span>}
                </>
            )}
        </div>
    );
};

export const CalendarBoard = ({ onOptimize, isOptimizing }: { onOptimize: () => void; isOptimizing: boolean; }) => {
    const {
        currentState,
        employees,
        assignments,
        clearCalendar,
        clearEmployees,
        updateEmployeeTargetHours,
        updateEmployeeDepotShiftType,
        removeEmployee,
        operationMode,
        presets,
        magazaRuleSettings,
        updateMagazaRuleSettings,
        resetMagazaRuleSettings,
        depotRuleSettings,
        updateDepotRuleSettings,
        resetDepotRuleSettings,
        closedDays,
        toggleClosedDay
    } = useAppStore();
    const isDepot = operationMode === 'DEPO';

    return (
        <div className="flex-1 min-h-[820px] lg:min-h-0 my-3 mx-4 lg:ml-4 lg:mr-2 p-4 lg:p-5 flex flex-col bg-card/95 backdrop-blur-xl border border-border/70 rounded-[2rem] shadow-2xl overflow-hidden relative transition-all duration-500 ease-in-out">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 flex-shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        {isDepot ? <Warehouse size={18} className="text-primary" /> : <Clock3 size={18} className="text-primary" />}
                        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-primary">{isDepot ? 'Depo Operasyonu' : 'Mağaza Operasyonu'}</span>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">Vardiya Matrisi</h1>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Durum: <span className="text-primary">{currentState}</span></span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:gap-3 w-full xl:w-auto">
                    <button onClick={clearEmployees} className="flex-1 xl:flex-none justify-center px-3 lg:px-4 py-2.5 rounded-xl font-bold text-xs lg:text-sm text-red-600 bg-red-500/10 hover:bg-red-500/20 flex items-center gap-2 transition-all active:scale-95 border border-red-500/10"><UserX size={15}/> Personel Sil</button>
                    <button onClick={clearCalendar} className="flex-1 xl:flex-none justify-center px-3 lg:px-4 py-2.5 rounded-xl font-bold text-xs lg:text-sm text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 flex items-center gap-2 transition-all active:scale-95 border border-amber-500/10"><Trash2 size={15}/> Takvimi Temizle</button>
                    <button onClick={onOptimize} disabled={isOptimizing} className="w-full xl:w-auto justify-center px-5 lg:px-7 py-2.5 rounded-xl font-extrabold text-sm text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:translate-y-[-1px] active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center gap-2">
                        {isOptimizing ? 'Hesaplanıyor...' : 'Otomatik Diz'}
                    </button>
                </div>
            </div>

            {isDepot && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 flex-shrink-0">
                    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                        <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">Gündüz Planı</div>
                        <div className="text-sm font-bold text-foreground">12:30 - 22:30 · 10 saat · 1 saat mola · 50 sa./hafta</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                        <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">Gece Planı</div>
                        <div className="text-sm font-bold text-foreground">00:30 - 09:00 · 8.5 saat · 1 saat mola · 42.5 sa./hafta</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                        <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">Aracı Kartı</div>
                        <div className="text-sm font-bold text-foreground">Otomatik atanmaz · gerektiğinde manuel sürüklenir</div>
                    </div>
                </div>
            )}

            {isDepot && (
                <DepotRulePanel
                    settings={depotRuleSettings}
                    updateSettings={updateDepotRuleSettings}
                    resetSettings={resetDepotRuleSettings}
                />
            )}

            {!isDepot && (
                <MagazaRulePanel
                    settings={magazaRuleSettings}
                    updateSettings={updateMagazaRuleSettings}
                    resetSettings={resetMagazaRuleSettings}
                />
            )}

            <div className="flex-1 bg-background/45 backdrop-blur-sm border border-border/60 rounded-2xl shadow-inner flex flex-col min-h-[560px] lg:min-h-0 overflow-hidden relative">
                <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden flex flex-col w-full custom-scrollbar">
                    <div className="min-w-[900px] lg:min-w-0 min-h-0 flex flex-col flex-1">
                        <div className="grid grid-cols-[160px_repeat(7,1fr)] lg:grid-cols-[220px_repeat(7,1fr)] border-b border-border/60 bg-card/60 flex-shrink-0">
                            <div className="p-3 lg:p-4 font-black text-[10px] lg:text-xs uppercase tracking-widest text-muted-foreground flex items-center">Personel & Kota</div>
                            {DAYS.map(day => (
                                <DayHeaderCell
                                    key={day}
                                    day={day}
                                    isClosed={closedDays.includes(day)}
                                    onToggle={() => toggleClosedDay(day)}
                                />
                            ))}
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-10">
                            {employees.map(emp => {
                                let assignedHours = 0;
                                assignments.filter(a => a.employeeId === emp.id && !closedDays.includes(a.day) && a.type !== 'IZIN' && a.type !== 'BOS').forEach(a => {
                                    const preset = presets[a.type];
                                    if (isDepot && typeof preset?.plannedHours === 'number') {
                                        assignedHours += preset.plannedHours;
                                    } else {
                                        assignedHours += getNetHours(a.startTime, a.endTime, isDepot ? (preset?.breakMinutes || 0) : 0);
                                    }
                                });
                                const isOvertime = assignedHours > emp.targetHours;
                                const isPerfect = Math.abs(assignedHours - emp.targetHours) < 0.01;
                                const statusColor = isOvertime ? "bg-red-500/15 text-red-600 border-red-500/20" : isPerfect ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : "bg-primary/15 text-primary border-primary/20";
                                const depotShiftType = emp.depotShiftType ?? 'GUNDUZ';

                                return (
                                    <div key={emp.id} className="grid grid-cols-[160px_repeat(7,1fr)] lg:grid-cols-[220px_repeat(7,1fr)] border-b border-border/40 hover:bg-card/65 transition-colors group/row">
                                        <div className="p-2 lg:p-4 flex flex-col justify-center border-r border-border/40 relative">
                                            <button onClick={() => removeEmployee(emp.id)} className="absolute top-2 right-2 text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-all hover:scale-110"><Trash2 size={14}/></button>
                                            <span className="font-black text-foreground text-xs lg:text-sm mb-2 truncate pr-5">{emp.name}</span>
                                            {isDepot && (
                                                <select
                                                    value={depotShiftType}
                                                    onChange={(event) => updateEmployeeDepotShiftType(emp.id, event.target.value as DepotShiftType)}
                                                    className="mb-2 w-full bg-background/70 border border-border/50 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                                                >
                                                    <option value="GUNDUZ">Gündüz Personeli</option>
                                                    <option value="GECE">Gece Personeli</option>
                                                </select>
                                            )}
                                            <div className={`inline-flex items-center w-fit px-2 py-1 rounded-lg border text-[10px] font-black ${statusColor}`}>
                                                {formatHours(assignedHours)} / {formatHours(emp.targetHours)} sa.
                                            </div>
                                            {!isDepot && (
                                                <input type="number" step="0.5" value={emp.targetHours} onChange={(e) => updateEmployeeTargetHours(emp.id, Number(e.target.value))} className="mt-2 w-20 bg-background/70 border border-border/50 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:ring-2 focus:ring-primary/30" />
                                            )}
                                        </div>
                                        {DAYS.map(day => (
                                            <div key={day} className="p-1.5 lg:p-2 border-r border-border/20 last:border-r-0">
                                                <AssignmentCell employeeId={emp.id} day={day} isDayClosed={closedDays.includes(day)} />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                            {employees.length === 0 && (
                                <div className="h-full min-h-[360px] flex items-center justify-center text-center p-8">
                                    <div className="max-w-sm">
                                        <div className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">Başlamak için personel ekleyin</div>
                                        <p className="text-sm text-muted-foreground">Sağ panelden ekip üyelerini ekledikten sonra vardiya kalıplarını sürükleyebilir veya otomatik dizim çalıştırabilirsiniz.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
