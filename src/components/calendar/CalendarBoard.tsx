"use client";

import { useAppStore } from "@/store/useAppStore";
import { useDroppable } from "@dnd-kit/core";
import { Lock, LockOpen, Trash2, UserX, Clock3, Warehouse, SlidersHorizontal, RotateCcw, ShieldCheck, BarChart3, Download, Upload, AlertTriangle, CheckCircle, Eye, X, Archive, Maximize2, Minimize2 } from "lucide-react";
import { Assignment, DepotRuleSettings, DepotShiftType, MagazaRuleSettings, DepotMonthReport, DepotWeekArchive, DepotWeekSelection, Employee, ShiftPreset } from "@/types";
import { useEffect, useState, useMemo, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { DepotReportAssignmentEntry, generateDepotDateRangeReport } from "@/lib/depot/depotReport";
import { canCreateDepotWeekInSequence, deleteDepotWeekArchive, exportAllDepotArchives, getFirstMissingDepotWeekBefore, hasDepotWeekArchive, importDepotArchives, listDepotWeekArchives, saveDepotWeekArchive } from "@/lib/depot/depotArchive";
import { generateEmployeeSummaries } from "@/lib/depot/depotReport";
import { getDepotWeekOptions, getDepotWeekSelection, TURKISH_MONTH_NAMES } from "@/lib/depot/depotWeek";

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const CHRONOSHIFT_PRESET_MIME = 'application/x-chronoshift-preset';

const readDroppedPreset = (event: DragEvent<HTMLElement>, presets: Record<string, ShiftPreset>): ShiftPreset | null => {
    const serializedPreset = event.dataTransfer.getData(CHRONOSHIFT_PRESET_MIME);
    if (serializedPreset) {
        try {
            const parsed = JSON.parse(serializedPreset) as ShiftPreset;
            if (parsed?.type) return parsed;
        } catch {
            // Native drag payload bozuksa text/plain fallback'i denenir.
        }
    }

    const fallbackType = event.dataTransfer.getData('text/plain');
    return fallbackType ? presets[fallbackType] || null : null;
};

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


const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addDaysToDateKey = (dateKey: string, daysToAdd: number) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, day || 1);
    date.setDate(date.getDate() + daysToAdd);
    return toDateKey(date);
};

const getDepotWeekDayDateKey = (week: DepotWeekSelection, day: string) => {
    const dayIndex = DAYS.indexOf(day);
    return addDaysToDateKey(week.startDate, dayIndex >= 0 ? dayIndex : 0);
};

const getArchiveReportEntries = (archive: DepotWeekArchive): DepotReportAssignmentEntry[] => {
    const closedDaySet = new Set(archive.closedDays ?? []);
    return archive.assignments
        .filter(assignment => !closedDaySet.has(assignment.day))
        .map(assignment => ({
            employeeId: assignment.employeeId,
            day: assignment.day,
            dateKey: getDepotWeekDayDateKey(archive, assignment.day),
            type: assignment.type,
        }));
};

const buildDepotMonthlyReportEntries = (
    archives: DepotWeekArchive[],
    selectedWeek: DepotWeekSelection,
    currentAssignments: Assignment[],
    currentEmployees: Employee[],
    currentClosedDays: string[]
): DepotReportAssignmentEntry[] => {
    const currentClosedDaySet = new Set(currentClosedDays);
    const archivedEntries = archives
        .filter(archive => archive.year === selectedWeek.year && archive.month === selectedWeek.month && archive.key !== selectedWeek.key)
        .flatMap(getArchiveReportEntries);

    const currentWeekEntries = currentEmployees.flatMap(employee => DAYS
        .filter(day => !currentClosedDaySet.has(day))
        .map(day => {
            const assignment = currentAssignments.find(item => item.employeeId === employee.id && item.day === day);
            return {
                employeeId: employee.id,
                day,
                dateKey: getDepotWeekDayDateKey(selectedWeek, day),
                type: assignment?.type ?? 'BOS',
            };
        })
    );

    return [...archivedEntries, ...currentWeekEntries];
};

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
                <div className="w-8 h-8 rounded-xl bg-indigo-500/[0.12] text-indigo-700 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
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

const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        aria-label={label ?? (checked ? 'Kapat' : 'Aç')}
        className={`relative h-7 w-12 flex-shrink-0 overflow-hidden rounded-full transition-all ${checked ? 'bg-primary shadow-sm shadow-primary/25' : 'bg-muted-foreground/25'}`}
    >
        <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-background shadow-md transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const ToggleRow = ({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="rounded-xl border border-border/60 bg-background/60 px-2.5 py-2 flex items-center justify-between gap-2 overflow-hidden">
        <div className="min-w-0 pr-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">{title}</div>
            <p className="mt-0.5 text-[10px] leading-tight font-bold text-muted-foreground line-clamp-1">{description}</p>
        </div>
        <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
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
    <div className="mb-2 rounded-2xl border border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-950/20 px-2.5 py-2.5 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/[0.12] text-indigo-700 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
                    <SlidersHorizontal size={15} />
                </div>
                <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300 truncate">Depo kuralları</div>
                    <p className="text-[10px] font-bold text-muted-foreground truncate">Otomatik Diz depo kuralları. Sadece depo modunu etkiler.</p>
                </div>
            </div>
            <button
                type="button"
                onClick={resetSettings}
                className="flex-shrink-0 text-[10px] flex items-center gap-1.5 font-black text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-full transition-all border border-amber-500/10"
            >
                <RotateCcw size={12} /> Varsayılan
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-1.5">
            <ToggleRow
                title="İzinleri arka arkaya koy"
                description="Gece personelinin 2 izin günü yan yana planlanır."
                checked={settings.consecutiveRestDays}
                onChange={(v) => updateSettings({ consecutiveRestDays: v })}
            />
            <ToggleRow
                title="Gündüzden geceye geçişte izin zorunlu"
                description="Gündüz → Gece direkt geçiş yasak. Arada mutlaka izin olmalı."
                checked={settings.requireOffBeforeDayToNight}
                onChange={(v) => updateSettings({ requireOffBeforeDayToNight: v })}
            />
            <ToggleRow
                title="Hafta sonu izin dengesi"
                description="Hafta sonu izinleri personel arasında dengeli dağıtılır."
                checked={settings.balanceWeekends}
                onChange={(v) => updateSettings({ balanceWeekends: v })}
            />
            <ToggleRow
                title="Gece/gündüz vardiya dengesi"
                description="Gündüz ve gece vardiya sayıları mümkün olduğu kadar dengeli tutulur."
                checked={settings.balanceDayNight}
                onChange={(v) => updateSettings({ balanceDayNight: v })}
            />
            <ToggleRow
                title="İzin yığılmasını önle"
                description="Aynı güne çok fazla izin atanmasının önüne geçer."
                checked={settings.avoidSameDayCrowding}
                onChange={(v) => updateSettings({ avoidSameDayCrowding: v })}
            />
            <div className="rounded-xl border border-border/60 bg-background/60 px-2.5 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0 pr-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">Maks. üst üste çalışma</div>
                    <p className="mt-0.5 text-[10px] leading-tight font-bold text-muted-foreground line-clamp-1">7 gün kuralı. Önerilen: 6.</p>
                </div>
                <input
                    type="number"
                    min="1"
                    max="14"
                    value={settings.maxConsecutiveWorkDays}
                    onChange={(e) => updateSettings({ maxConsecutiveWorkDays: Math.max(1, Math.min(14, parseInt(e.target.value) || 6)) })}
                    className="w-14 bg-background/80 border border-border/60 rounded-xl px-2 py-1 text-sm font-black text-center outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                />
            </div>
        </div>
    </div>
);

const ReportWarningBadge = ({ warnings }: { warnings: string[] }) => {
    if (warnings.length === 0) return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle size={10} /> Temiz
        </span>
    );
    return (
        <div className="flex flex-wrap gap-1">
            {warnings.map((w, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <AlertTriangle size={10} /> {w}
                </span>
            ))}
        </div>
    );
};

const DepotReportPanel = ({ report }: { report: DepotMonthReport[] }) => {
    if (report.length === 0) return null;
    return (
        <div className="mb-3 rounded-2xl border border-border/60 bg-background/50 px-3 py-3 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/[0.12] text-indigo-700 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
                    <BarChart3 size={16} />
                </div>
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">Aylık Rapor</div>
                    <p className="text-[11px] font-bold text-muted-foreground">Seçili ayın kayıtlı haftaları ve açık tablo birlikte hesaplanır.</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-[11px] min-w-[600px]">
                    <thead>
                        <tr className="border-b border-border/60">
                            <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-muted-foreground">Personel</th>
                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-muted-foreground">Gündüz</th>
                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-muted-foreground">Gece</th>
                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-muted-foreground">İzin</th>
                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-muted-foreground">HSnO İzin</th>
                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-muted-foreground">Maks. Seri</th>
                            <th className="text-left py-2 px-2 font-black uppercase tracking-widest text-muted-foreground">Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        {report.map(r => (
                            <tr key={r.employeeId} className="border-b border-border/30 hover:bg-card/60 transition-colors">
                                <td className="py-2 px-2 font-bold text-foreground">{r.employeeName}</td>
                                <td className="py-2 px-2 text-center font-bold text-red-500">{r.dayShiftCount}</td>
                                <td className="py-2 px-2 text-center font-bold text-blue-400">{r.nightShiftCount}</td>
                                <td className="py-2 px-2 text-center font-bold text-muted-foreground">{r.offDayCount}</td>
                                <td className="py-2 px-2 text-center font-bold text-purple-400">{r.weekendOffCount}</td>
                                <td className={`py-2 px-2 text-center font-black ${r.maxConsecutiveWork > 6 ? 'text-red-600' : 'text-foreground'}`}>{r.maxConsecutiveWork}</td>
                                <td className="py-2 px-2"><ReportWarningBadge warnings={r.warnings} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DEPOT_ARCHIVE_LABELS: Record<string, string> = {
    GUNDUZ: 'Gündüz',
    GECE: 'Gece',
    ARACI: 'Aracı',
    IZIN: 'İzin',
    BOS: 'Boş',
};

const DEPOT_INITIAL_COLORS: Record<string, string> = {
    GUNDUZ: '#ef4444',
    GECE: '#f8fafc',
    IZIN: '#71717a',
    ARACI: '#10b981',
    BOS: '#94a3b8',
};

const getDepotInitialColor = (type?: string) => DEPOT_INITIAL_COLORS[type || 'BOS'] || DEPOT_INITIAL_COLORS.BOS;

const getLegacyShiftStyle = (type?: string, isClosed = false) => {
    if (isClosed || !type || type === 'BOS') return {};
    const color = getDepotInitialColor(type);
    return {
        backgroundColor: `${color}14`,
        borderColor: `${color}55`,
        color,
        boxShadow: `inset 0 0 18px ${color}0D`,
    };
};

const formatArchiveSavedAt = (savedAt: string) => {
    const date = new Date(savedAt);
    if (Number.isNaN(date.getTime())) return savedAt;
    return date.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
};

const DepotArchiveViewerModal = ({ archives, onClose, onDelete }: { archives: DepotWeekArchive[]; onClose: () => void; onDelete: (archive: DepotWeekArchive) => void }) => {
    const [selectedKey, setSelectedKey] = useState(archives[0]?.key ?? '');
    const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);

    useEffect(() => {
        if (archives.length === 0) {
            setSelectedKey('');
            return;
        }
        if (!archives.some(archive => archive.key === selectedKey)) {
            setSelectedKey(archives[0].key);
        }
    }, [archives, selectedKey]);

    const selectedArchive = archives.find(archive => archive.key === selectedKey) ?? archives[0] ?? null;

    useEffect(() => {
        setPendingDeleteKey(null);
    }, [selectedKey]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-3">
            <button
                type="button"
                aria-label="Kayıtlı tablolar penceresini kapat"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/45 dark:bg-black/70 backdrop-blur-md"
            />
            <div
                role="dialog"
                aria-modal="true"
                className="relative z-10 w-[98vw] max-w-none h-[94vh] overflow-hidden rounded-[1.75rem] border border-slate-300/80 dark:border-slate-700/80 bg-white/[0.98] dark:bg-slate-950/[0.98] shadow-2xl flex flex-col"
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-4 bg-slate-50/95 dark:bg-slate-900/95">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                            <Archive size={18} />
                            <span className="text-[11px] font-black uppercase tracking-[0.24em]">Kayıtlı Depo Tabloları</span>
                        </div>
                        <h2 className="mt-1 text-xl font-black text-foreground tracking-tight">Haftalık arşiv görüntüleyici</h2>
                        <p className="mt-1 text-xs font-bold text-muted-foreground">
                            Kayıtlar tarayıcı localStorage alanından okunur; sadece depo modu kayıtları gösterilir.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900 p-2 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {archives.length === 0 || !selectedArchive ? (
                    <div className="flex min-h-[320px] items-center justify-center p-8 text-center">
                        <div>
                            <div className="text-sm font-black uppercase tracking-widest text-muted-foreground">Kayıt bulunamadı</div>
                            <p className="mt-2 text-sm text-muted-foreground">Bir depo haftası kaydedildiğinde burada görüntülenir.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)]">
                        <aside className="border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 p-3 overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                {archives.map(archive => (
                                    <button
                                        key={archive.key}
                                        type="button"
                                        onClick={() => setSelectedKey(archive.key)}
                                        className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${selectedArchive.key === archive.key ? 'border-indigo-500/45 bg-indigo-500/[0.12] text-indigo-800 dark:text-indigo-200 shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/70 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                                    >
                                        <div className="text-xs font-black uppercase tracking-widest">{archive.label}</div>
                                        <div className="mt-1 text-[11px] font-bold">{archive.rangeLabel}</div>
                                        <div className="mt-2 text-[10px] font-black uppercase tracking-widest opacity-70">{formatArchiveSavedAt(archive.savedAt)}</div>
                                    </button>
                                ))}
                            </div>
                        </aside>

                        <section className="min-w-0 overflow-x-auto overflow-y-auto custom-scrollbar depot-table-scroll p-3 sm:p-4">
                            <div className="mb-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/80 p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">{selectedArchive.label}</div>
                                    <div className="mt-1 text-xl font-black text-foreground">{selectedArchive.rangeLabel}</div>
                                    <div className="mt-1 text-xs font-bold text-muted-foreground">
                                        {selectedArchive.employees.length} personel · {selectedArchive.assignments.length} hücre · Kaydedilme: {formatArchiveSavedAt(selectedArchive.savedAt)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (pendingDeleteKey === selectedArchive.key) {
                                            onDelete(selectedArchive);
                                            setPendingDeleteKey(null);
                                        } else {
                                            setPendingDeleteKey(selectedArchive.key);
                                        }
                                    }}
                                    className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${pendingDeleteKey === selectedArchive.key ? 'border-red-500/30 bg-red-500/15 text-red-600' : 'border-red-500/15 bg-red-500/10 text-red-600 hover:bg-red-500/20'}`}
                                >
                                    {pendingDeleteKey === selectedArchive.key ? 'Evet, Sil' : 'Bu Kaydı Sil'}
                                </button>
                            </div>

                            <div className="min-w-[720px] w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-950/80">
                                <div className="grid grid-cols-[140px_repeat(7,minmax(70px,1fr))] border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90">
                                    <div className="p-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Personel</div>
                                    {DAYS.map(day => (
                                        <div key={day} className="p-2 text-center text-[10px] font-black uppercase tracking-widest text-foreground">
                                            <div>{day}</div>
                                            <div className="mt-1 text-[9px] font-bold normal-case tracking-normal text-muted-foreground">{selectedArchive.dayDates?.[day]}</div>
                                        </div>
                                    ))}
                                </div>
                                {selectedArchive.employees.map(employee => {
                                    const shiftLabel = employee.depotShiftType === 'GECE' ? 'Gececi' : 'Gündüzcü';
                                    return (
                                        <div key={employee.id} className="grid grid-cols-[140px_repeat(7,minmax(70px,1fr))] border-b border-slate-200/80 dark:border-slate-800/80 last:border-b-0">
                                            <div className="border-r border-slate-200 dark:border-slate-800 p-2">
                                                <div className="truncate text-xs font-black text-foreground">{employee.name}</div>
                                                <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{shiftLabel}</div>
                                            </div>
                                            {DAYS.map(day => {
                                                const isClosed = selectedArchive.closedDays?.includes(day) ?? false;
                                                const assignment = selectedArchive.assignments.find(item => item.employeeId === employee.id && item.day === day);
                                                const isEmpty = !assignment || assignment.type === 'BOS';
                                                const isRest = assignment?.type === 'IZIN';
                                                return (
                                                    <div key={day} className="border-r border-slate-200/70 dark:border-slate-800/70 last:border-r-0 p-1">
                                                        <div style={getLegacyShiftStyle(assignment?.type, isClosed)}
                                                            className={`min-h-[58px] rounded-xl border p-1.5 flex flex-col items-center justify-center text-center ${isClosed ? 'bg-red-500/10 border-red-500/20 text-red-600 shadow-inner' : isEmpty ? 'bg-background/45 border-border/50 border-dashed text-muted-foreground shadow-inner' : 'shadow-sm'}`}>
                                                            {isClosed ? (
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Kapalı</span>
                                                            ) : isRest ? (
                                                                <span className="text-xl font-black opacity-50">X</span>
                                                            ) : isEmpty ? (
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Boş</span>
                                                            ) : (
                                                                <>
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-current">{DEPOT_ARCHIVE_LABELS[assignment.type] ?? assignment.type}</span>
                                                                    <span className="mt-1 text-[10px] font-black font-mono text-current">{assignment.startTime} - {assignment.endTime}</span>
                                                                    {assignment.isLocked && <span className="mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Kilitli</span>}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

const DepotArchivePanel = ({ onArchiveChange }: { onArchiveChange?: () => void }) => {
    const { employees, assignments, closedDays, depotSelectedWeek, setDepotSelectedWeek } = useAppStore();
    const [importMsg, setImportMsg] = useState('');
    const [archiveVersion, setArchiveVersion] = useState(0);
    const [pendingOverwrite, setPendingOverwrite] = useState(false);
    const [isArchiveViewerOpen, setIsArchiveViewerOpen] = useState(false);

    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from(new Set([currentYear - 1, currentYear, currentYear + 1, depotSelectedWeek.year])).sort((a, b) => a - b);
    }, [depotSelectedWeek.year]);

    const weekOptions = useMemo(() => getDepotWeekOptions(depotSelectedWeek.year, depotSelectedWeek.month), [depotSelectedWeek.year, depotSelectedWeek.month]);
    const savedArchives = useMemo(() => listDepotWeekArchives(), [archiveVersion, isArchiveViewerOpen]);
    const existingArchive = useMemo(() => hasDepotWeekArchive(depotSelectedWeek), [depotSelectedWeek, archiveVersion]);
    const missingRequiredWeek = useMemo(() => getFirstMissingDepotWeekBefore(depotSelectedWeek), [depotSelectedWeek, archiveVersion]);

    const openDays = useMemo(() => DAYS.filter(day => !closedDays.includes(day)), [closedDays]);

    const missingCellCount = useMemo(() => {
        if (employees.length === 0 || openDays.length === 0) return 0;
        return employees.reduce((total, employee) => {
            const missingForEmployee = openDays.filter(day => {
                const assignment = assignments.find(item => item.employeeId === employee.id && item.day === day);
                return !assignment || assignment.type === 'BOS';
            }).length;
            return total + missingForEmployee;
        }, 0);
    }, [assignments, employees, openDays]);

    const saveBlockers = useMemo(() => {
        const blockers: string[] = [];
        if (employees.length === 0) blockers.push('Personel yok.');
        if (openDays.length === 0) blockers.push('En az bir gün açık olmalı.');
        if (missingCellCount > 0) blockers.push(`${missingCellCount} açık hücre boş.`);
        if (missingRequiredWeek) blockers.push(`Önce ${missingRequiredWeek.label} kaydedilmeli.`);
        return blockers;
    }, [employees.length, openDays.length, missingCellCount, missingRequiredWeek]);

    const isSaveDisabled = saveBlockers.length > 0;

    useEffect(() => {
        setPendingOverwrite(false);
    }, [depotSelectedWeek.key]);

    const showMessage = (message: string, duration = 2800) => {
        setImportMsg(message);
        window.setTimeout(() => setImportMsg(''), duration);
    };

    const handleYearChange = (year: number) => {
        setDepotSelectedWeek(getDepotWeekSelection(year, depotSelectedWeek.month, 1));
    };

    const handleMonthChange = (month: number) => {
        setDepotSelectedWeek(getDepotWeekSelection(depotSelectedWeek.year, month, 1));
    };

    const handleWeekChange = (week: number) => {
        const nextSelection = getDepotWeekSelection(depotSelectedWeek.year, depotSelectedWeek.month, week);
        const missingWeek = getFirstMissingDepotWeekBefore(nextSelection);
        if (missingWeek) {
            showMessage(`${nextSelection.label} seçilemez. Önce ${missingWeek.label} kaydedilmeli.`, 3600);
            return;
        }
        setDepotSelectedWeek(nextSelection);
    };

    const handleExport = () => {
        const json = exportAllDepotArchives();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'depo-arsiv.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSaveWeek = () => {
        if (isSaveDisabled) return;

        if (existingArchive && !pendingOverwrite) {
            setPendingOverwrite(true);
            showMessage(`${depotSelectedWeek.label} zaten kayıtlı. Eski kaydı silip yenisini yazmak için tekrar "Yine de Kaydet" düğmesine basın.`, 5200);
            return;
        }

        const summaries = generateEmployeeSummaries(employees, assignments, DAYS, closedDays, depotSelectedWeek.year, depotSelectedWeek.month);
        saveDepotWeekArchive(depotSelectedWeek, assignments, employees, summaries, closedDays);
        setArchiveVersion(version => version + 1);
        onArchiveChange?.();
        setPendingOverwrite(false);
        showMessage(`${depotSelectedWeek.label} kaydedildi ✓`);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const result = importDepotArchives(text);
            setArchiveVersion(version => version + 1);
            onArchiveChange?.();
            showMessage(`${result.imported} kayıt içe aktarıldı${result.errors > 0 ? `, ${result.errors} hata` : ''}`, 3000);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleDeleteArchive = (archive: DepotWeekArchive) => {
        const deleted = deleteDepotWeekArchive(archive.key);
        if (!deleted) {
            showMessage('Kayıt silinemedi.', 3000);
            return;
        }

        setArchiveVersion(version => version + 1);
        onArchiveChange?.();
        if (archive.key === depotSelectedWeek.key) setPendingOverwrite(false);
        showMessage(`${archive.label} silindi.`);
    };

    return (
        <div className="mb-3 rounded-2xl border border-border/60 bg-background/50 px-3 py-3 flex-shrink-0">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Yıl</span>
                        <select
                            value={depotSelectedWeek.year}
                            onChange={(event) => handleYearChange(Number(event.target.value))}
                            className="bg-background/80 border border-border/60 rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                        >
                            {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ay</span>
                        <select
                            value={depotSelectedWeek.month}
                            onChange={(event) => handleMonthChange(Number(event.target.value))}
                            className="bg-background/80 border border-border/60 rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                        >
                            {TURKISH_MONTH_NAMES.map((monthName, index) => <option key={monthName} value={index + 1}>{monthName}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hafta</span>
                        <select
                            value={depotSelectedWeek.week}
                            onChange={(event) => handleWeekChange(Number(event.target.value))}
                            className="bg-background/80 border border-border/60 rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                        >
                            {weekOptions.map(option => {
                                const isBlocked = !canCreateDepotWeekInSequence(option);
                                return (
                                    <option key={option.key} value={option.week} disabled={isBlocked}>
                                        {option.week}. Hafta · {option.shortRangeLabel}{isBlocked ? ' · önceki hafta eksik' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsArchiveViewerOpen(true)}
                        className="text-[11px] flex items-center gap-1.5 font-black text-indigo-700 dark:text-indigo-200 bg-indigo-500/[0.12] hover:bg-indigo-500/20 px-3 py-2 rounded-full transition-all border border-indigo-500/25"
                    >
                        <Eye size={12} /> Kayıtlı Tablolar ({savedArchives.length})
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveWeek}
                        disabled={isSaveDisabled}
                        title={isSaveDisabled ? saveBlockers.join(' ') : existingArchive && !pendingOverwrite ? 'Bu hafta kayıtlı. İlk tıklamada uyarı verir.' : undefined}
                        className={`text-[11px] flex items-center gap-1.5 font-black px-3 py-2 rounded-full transition-all border disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-muted/20 ${pendingOverwrite ? 'text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20' : 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'}`}
                    >
                        <CheckCircle size={12} /> {pendingOverwrite ? 'Yine de Kaydet' : 'Seçili Haftayı Kaydet'}
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        className="text-[11px] flex items-center gap-1.5 font-black text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-full transition-all border border-blue-500/20"
                    >
                        <Download size={12} /> Arşivi Dışa Aktar
                    </button>
                    <label className="text-[11px] flex items-center gap-1.5 font-black text-purple-500 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-2 rounded-full transition-all border border-purple-500/20 cursor-pointer">
                        <Upload size={12} /> Arşivi İçe Aktar
                        <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                    </label>
                </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground">
                <span className="rounded-full bg-indigo-500/[0.12] text-indigo-700 dark:text-indigo-200 border border-indigo-500/20 px-3 py-1">
                    Tablo: {depotSelectedWeek.label} · {depotSelectedWeek.rangeLabel}
                </span>
                {existingArchive && (
                    <span className="rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 px-3 py-1">
                        Bu hafta için kayıt var
                    </span>
                )}
                {saveBlockers.length > 0 && (
                    <span className="rounded-full bg-red-500/10 text-red-600 border border-red-500/20 px-3 py-1">
                        Kaydetme kapalı: {saveBlockers.join(' ')}
                    </span>
                )}
                {pendingOverwrite && !isSaveDisabled && (
                    <span className="rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 px-3 py-1">
                        Tekrar basılırsa eski kayıt silinir ve son tablo yazılır
                    </span>
                )}
                {importMsg && (
                    <span className="text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        {importMsg}
                    </span>
                )}
            </div>

            {isArchiveViewerOpen && (
                <DepotArchiveViewerModal archives={savedArchives} onClose={() => setIsArchiveViewerOpen(false)} onDelete={handleDeleteArchive} />
            )}
        </div>
    );
};

const DayHeaderCell = ({ day, dateLabel, isClosed, onToggle, compact = false }: { day: string; dateLabel?: string; isClosed: boolean; onToggle: () => void; compact?: boolean }) => (
    <div className={`${compact ? 'p-2 gap-1.5 text-[10px]' : 'p-3 lg:p-4 gap-2 text-[10px] lg:text-xs'} font-black uppercase tracking-widest text-center text-foreground flex flex-col items-center justify-center`}>
        <span>{day}</span>
        {dateLabel && <span className="text-[9px] font-bold tracking-normal text-muted-foreground normal-case">{dateLabel}</span>}
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={isClosed}
            className={`group inline-flex items-center gap-1.5 rounded-full border ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} transition-all ${isClosed ? 'border-red-500/25 bg-red-500/10 text-red-600' : 'border-border/70 bg-background/70 text-muted-foreground hover:text-foreground'}`}
        >
            <span className={`relative h-3.5 w-7 rounded-full transition-all ${isClosed ? 'bg-red-500/70' : 'bg-muted-foreground/25'}`}>
                <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-background shadow-sm transition-transform ${isClosed ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider">{isClosed ? 'Kapalı' : 'Açık'}</span>
        </button>
    </div>
);

const AssignmentCell = ({
    employeeId,
    day,
    isDayClosed,
    compact = false,
    fullscreen = false,
    employeeCount = 0
}: {
    employeeId: string;
    day: string;
    isDayClosed: boolean;
    compact?: boolean;
    fullscreen?: boolean;
    employeeCount?: number;
}) => {
    const id = `${employeeId}-${day}`;
    const { isOver, setNodeRef } = useDroppable({ id, data: { type: "Cell", id }, disabled: isDayClosed });
    const { assignments, updateAssignment, presets, operationMode } = useAppStore(); 
    const assign = assignments.find(a => a.id === id);
    const isBos = !assign || assign.type === 'BOS';
    const isDepot = operationMode === 'DEPO';

    const handleNativeDragOver = (event: DragEvent<HTMLDivElement>) => {
        if (isDayClosed) return;
        const hasPresetPayload = event.dataTransfer.types.includes(CHRONOSHIFT_PRESET_MIME) || event.dataTransfer.types.includes('text/plain');
        if (!hasPresetPayload) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleNativeDrop = (event: DragEvent<HTMLDivElement>) => {
        if (isDayClosed) return;
        const preset = readDroppedPreset(event, presets);
        if (!preset) return;

        event.preventDefault();
        event.stopPropagation();
        updateAssignment(id, preset.type, preset.startTime, preset.endTime, true);
    };

    const presetColor = !isBos && assign && !isDayClosed
        ? (isDepot ? getDepotInitialColor(assign.type) : presets[assign.type]?.color || '#94a3b8')
        : '#94a3b8';
    const customStyle = !isBos && assign && !isDayClosed ? {
        backgroundColor: `${presetColor}14`,
        borderColor: `${presetColor}55`,
        color: presetColor,
        boxShadow: `inset 0 0 18px ${presetColor}0D`
    } : {};

    const isRest = assign?.type === 'IZIN';
    const isDepotWorkAssignment = isDepot && assign && (assign.type === 'GUNDUZ' || assign.type === 'GECE');
    const timeChipClass = 'bg-background/85 border-border/50 shadow-inner';
    const timeInputTextClass = 'text-foreground';
    const lockButtonClass = assign?.isLocked
        ? 'bg-slate-950/15 text-current border-current/25 hover:bg-slate-950/20 dark:bg-white/15 dark:hover:bg-white/20'
        : 'bg-white/65 text-slate-700 border-white/70 hover:bg-white dark:bg-slate-900/55 dark:text-slate-100 dark:border-white/20 dark:hover:bg-slate-800';
    const isDenseFullscreen = fullscreen && employeeCount > 18;
    const isUltraDenseFullscreen = fullscreen && employeeCount > 40;
    const isLineFullscreen = fullscreen && employeeCount > 18;
    const isTinyLineFullscreen = fullscreen && employeeCount > 60;
    const timeRangeText = assign ? `${assign.startTime} / ${assign.endTime}` : '';
    const mergedStyle = isDepot && fullscreen
        ? { ...customStyle, minHeight: 0, height: '100%' }
        : customStyle;
    const depotCellClass = isDayClosed
        ? 'bg-red-500/10 border-red-500/20 text-red-600 shadow-inner'
        : isBos
            ? 'bg-background/45 border-border/50 border-dashed text-muted-foreground shadow-inner hover:bg-background/80'
            : 'shadow-sm hover:shadow-md hover:scale-[1.001]';

    return (
        <div 
            ref={setNodeRef} 
            data-assignment-cell-id={id}
            style={mergedStyle}
            onDragOver={handleNativeDragOver}
            onDrop={handleNativeDrop}
            className={`relative flex ${isLineFullscreen ? 'flex-col gap-0.5' : 'flex-col'} items-center justify-center ${isDepot ? (fullscreen ? `${isLineFullscreen ? 'px-1 py-0.5 rounded-none' : isUltraDenseFullscreen ? 'p-0.5 rounded-md' : isDenseFullscreen ? 'p-1 rounded-lg' : 'p-1.5 rounded-xl'} overflow-hidden` : compact ? 'p-1.5 min-h-[78px]' : 'p-2 min-h-[92px]') : 'p-3 min-h-[96px]'} border ${isDepot && fullscreen ? '' : 'rounded-2xl'} transition-all duration-150 ease-out
                ${isDepot ? depotCellClass : (isDayClosed ? 'bg-red-500/10 border-red-500/20 text-red-600 shadow-inner' : isBos ? 'bg-background/45 border-border/50 border-dashed text-muted-foreground shadow-inner hover:bg-background/80' : 'shadow-sm hover:shadow-md hover:scale-[1.01]')} 
                ${isOver && !isDayClosed ? 'ring-2 ring-primary bg-primary/5 scale-[1.03] shadow-xl z-10' : ''}`}
        >
            {isDayClosed ? (
                <span className={`${isLineFullscreen ? (isTinyLineFullscreen ? 'text-[6px] tracking-normal' : 'text-[7px] tracking-wide') : isUltraDenseFullscreen ? 'text-[8px] tracking-wider' : isDenseFullscreen ? 'text-[10px] tracking-widest' : 'text-sm lg:text-base tracking-[0.22em]'} font-black uppercase opacity-80`}>Kapalı</span>
            ) : (
                <>
                    {!isBos && assign && !isDayClosed && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                updateAssignment(id, assign.type, assign.startTime, assign.endTime, !assign.isLocked);
                            }}
                            aria-label={assign.isLocked ? 'Kilidi aç' : 'Kilitle'}
                            title={assign.isLocked ? 'Kilitli: oto diz değiştirmez. Açmak için tıkla.' : 'Açık: oto diz değiştirebilir. Kilitlemek için tıkla.'}
                            className={`absolute top-1 right-1 z-20 inline-flex items-center justify-center rounded-full border ${fullscreen ? (isTinyLineFullscreen ? 'h-3.5 w-3.5' : 'h-4 w-4') : 'h-5 w-5'} ${lockButtonClass} transition-all hover:scale-105`}
                        >
                            {assign.isLocked ? <Lock size={fullscreen ? (isTinyLineFullscreen ? 7 : 8) : 10} strokeWidth={3} /> : <LockOpen size={fullscreen ? (isTinyLineFullscreen ? 7 : 8) : 10} strokeWidth={3} />}
                        </button>
                    )}
                    {!isBos && assign ? (
                        isRest ? (
                            isLineFullscreen ? (
                                <div className="flex w-full min-w-0 flex-col items-center justify-center leading-none">
                                    <span className={`${isTinyLineFullscreen ? 'text-[6px]' : 'text-[7px]'} max-w-full truncate font-black uppercase tracking-wide text-current`}>İzin</span>
                                </div>
                            ) : (
                                <span className={`${isUltraDenseFullscreen ? 'text-sm' : isDenseFullscreen ? 'text-lg' : 'text-2xl'} font-black opacity-55 tracking-widest`}>X</span>
                            )
                        ) : (
                            <div className={`${isDepot ? (isLineFullscreen ? 'gap-0 px-0 leading-none' : isUltraDenseFullscreen ? 'gap-0 px-0' : isDenseFullscreen ? 'gap-0.5 px-0' : 'gap-1 px-0.5') : 'gap-1.5 px-1'} flex flex-col items-center justify-center z-10 w-full min-w-0`}>
                                <span className={`${isLineFullscreen ? (isTinyLineFullscreen ? 'text-[6px]' : 'text-[7.5px]') : isUltraDenseFullscreen ? 'text-[7px] tracking-wide' : isDenseFullscreen ? 'text-[8px] tracking-wider' : 'text-[10px] tracking-widest'} max-w-full truncate font-black uppercase text-current`}>
                                    {isDepot ? (DEPOT_ARCHIVE_LABELS[assign.type] || assign.type) : (presets[assign.type]?.label || assign.type)}
                                </span>
                                {fullscreen ? (
                                    <span className={`${isTinyLineFullscreen ? 'text-[6.5px]' : isLineFullscreen ? 'text-[8px]' : isUltraDenseFullscreen ? 'text-[9px]' : isDenseFullscreen ? 'text-[10px]' : 'text-xs lg:text-sm'} max-w-full whitespace-nowrap truncate font-black font-mono text-current`}>{timeRangeText}</span>
                                ) : (
                                    <>
                                        <div className={`${isDenseFullscreen ? 'px-1 py-0' : 'px-1.5 py-0.5'} ${timeChipClass} rounded-md border w-full flex justify-center`}>
                                            <input type="time" value={assign.startTime} onChange={(e) => updateAssignment(id, assign.type, e.target.value, assign.endTime, true)} className={`${isDenseFullscreen ? 'text-[8px]' : isDepot ? 'text-[10px]' : 'text-[11px]'} bg-transparent outline-none text-center font-black font-mono w-full cursor-pointer ${timeInputTextClass}`} />
                                        </div>
                                        <div className={`${isDenseFullscreen ? 'px-1 py-0' : 'px-1.5 py-0.5'} ${timeChipClass} rounded-md border w-full flex justify-center`}>
                                            <input type="time" value={assign.endTime} onChange={(e) => updateAssignment(id, assign.type, assign.startTime, e.target.value, true)} className={`${isDenseFullscreen ? 'text-[8px]' : isDepot ? 'text-[10px]' : 'text-[11px]'} bg-transparent outline-none text-center font-black font-mono w-full cursor-pointer ${timeInputTextClass}`} />
                                        </div>
                                    </>
                                )}
                                {isDepot && !isDenseFullscreen && (presets[assign.type]?.breakMinutes || 0) > 0 && <span className="text-[9px] font-bold text-current/70">1 sa. mola</span>}
                                {assign.type === 'ARACI' && !isDenseFullscreen && <span className="text-[9px] font-bold text-current/70">manuel</span>}
                            </div>
                        )
                    ) : <span className={`${isLineFullscreen ? (isTinyLineFullscreen ? 'text-[6px] tracking-normal' : 'text-[7px] tracking-wide') : isUltraDenseFullscreen ? 'text-[7px] tracking-wide' : 'text-[10px] tracking-widest'} font-semibold uppercase opacity-45`}>BOŞ</span>}
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
        updateEmployeePreviousStreak,
        toggleEmployeeAuthorized,
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
        toggleClosedDay,
        depotSelectedWeek
    } = useAppStore();

    const isDepot = operationMode === 'DEPO';
    const [showReport, setShowReport] = useState(false);
    const [isTableFullscreen, setIsTableFullscreen] = useState(false);
    const [depotArchiveVersion, setDepotArchiveVersion] = useState(0);

    useEffect(() => {
        if (!isDepot || !isTableFullscreen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isDepot, isTableFullscreen]);

    const depotArchivesForReport = useMemo(() => {
        if (!isDepot) return [];
        return listDepotWeekArchives();
    }, [isDepot, depotArchiveVersion, depotSelectedWeek.key, currentState]);

    const report = useMemo<DepotMonthReport[]>(() => {
        if (!isDepot || !showReport || employees.length === 0) return [];
        const reportEntries = buildDepotMonthlyReportEntries(depotArchivesForReport, depotSelectedWeek, assignments, employees, closedDays);
        return generateDepotDateRangeReport(employees, reportEntries, depotRuleSettings.maxConsecutiveWorkDays);
    }, [isDepot, showReport, employees, assignments, closedDays, depotArchivesForReport, depotSelectedWeek, depotRuleSettings.maxConsecutiveWorkDays]);

    const authorizedCount = employees.filter(e => e.isAuthorized).length;


    const renderScheduleMatrix = (fullscreen = false) => {
        const depotGridClass = fullscreen
            ? 'grid-cols-[minmax(150px,1.05fr)_repeat(7,minmax(0,1fr))]'
            : 'grid-cols-[165px_repeat(7,minmax(96px,1fr))] xl:grid-cols-[190px_repeat(7,minmax(102px,1fr))] 2xl:grid-cols-[210px_repeat(7,minmax(0,1fr))]';
        const storeGridClass = 'grid-cols-[190px_repeat(7,minmax(125px,1fr))] lg:grid-cols-[250px_repeat(7,minmax(130px,1fr))]';
        const isLineFullscreen = fullscreen && employees.length > 18;
        const fullscreenRowMin = employees.length > 70 ? 20 : employees.length > 48 ? 24 : employees.length > 32 ? 30 : employees.length > 18 ? 38 : 58;
        const fullscreenBodyStyle = fullscreen && employees.length > 0
            ? { gridTemplateRows: `repeat(${employees.length}, minmax(${fullscreenRowMin}px, 1fr))` }
            : undefined;

        return (
            <div className={`${isDepot ? 'h-full' : ''} flex-1 min-h-0 ${isDepot && fullscreen ? 'overflow-hidden' : 'overflow-x-auto overflow-y-hidden'} flex flex-col w-full custom-scrollbar depot-table-scroll`}>
                <div className={`${isDepot ? (fullscreen ? 'min-w-0 w-full' : 'min-w-[980px] xl:min-w-[1060px] 2xl:min-w-0') : 'min-w-[1180px] lg:min-w-[1180px]'} min-h-0 flex flex-col flex-1`}>
                    <div className={`${isDepot ? `${depotGridClass} bg-slate-100/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-50` : `${storeGridClass} bg-card/60`} grid border-b border-border/60 flex-shrink-0`}>
                        <div className={`${isDepot ? 'p-2 text-[10px]' : 'p-3 lg:p-4 text-[10px] lg:text-xs'} font-black uppercase tracking-widest text-muted-foreground flex items-center`}>Personel & Kota</div>
                        {DAYS.map(day => (
                            <DayHeaderCell
                                key={day}
                                day={day}
                                dateLabel={isDepot ? depotSelectedWeek.dayDates[day] : undefined}
                                isClosed={closedDays.includes(day)}
                                onToggle={() => toggleClosedDay(day)}
                                compact={isDepot}
                            />
                        ))}
                    </div>
                    <div style={fullscreenBodyStyle} className={`${fullscreen ? `${employees.length > 48 ? 'grid overflow-y-auto' : 'grid overflow-hidden'} pb-0` : 'overflow-y-auto pb-4'} flex-1 min-h-0 custom-scrollbar`}>
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
                            const statusColor = isOvertime ? "bg-red-500/15 text-red-600 border-red-500/20" : isPerfect ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : isDepot ? "bg-indigo-500/[0.12] text-indigo-700 dark:text-indigo-200 border-indigo-500/20" : "bg-primary/15 text-primary border-primary/20";
                            const depotShiftType = emp.depotShiftType ?? 'GUNDUZ';
                            const fullscreenNameClass = employees.length > 70 ? 'text-[9px]' : employees.length > 48 ? 'text-[10px]' : employees.length > 18 ? 'text-[11px]' : 'text-sm lg:text-base';
                            const fullscreenShiftClass = employees.length > 48 ? 'text-[7px]' : employees.length > 18 ? 'text-[8px]' : 'text-[10px]';

                            return (
                                <div key={emp.id} className={`${isDepot ? `${depotGridClass} ${fullscreen ? 'min-h-0 hover:bg-slate-50/25 dark:hover:bg-slate-900/25' : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/70'}` : `${storeGridClass} hover:bg-card/65`} grid border-b border-border/40 transition-colors group/row`}>
                                    <div className={`${isDepot ? (fullscreen ? (isLineFullscreen ? 'min-h-0 px-1 py-0.5' : 'min-h-0 p-1.5') : 'p-2') : 'p-3 lg:p-4'} flex ${isLineFullscreen ? 'flex-row items-center gap-1.5' : 'flex-col justify-center'} border-r border-border/40 relative overflow-hidden`}>
                                        {!fullscreen && <button onClick={() => removeEmployee(emp.id)} className="absolute top-2 right-2 text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-all hover:scale-110"><Trash2 size={14}/></button>}
                                        <span className={`${isDepot ? (fullscreen ? `${fullscreenNameClass} mb-0 pr-1 leading-tight` : 'text-[11px] mb-1.5 pr-5') : 'text-xs lg:text-sm mb-2 pr-5'} font-black text-foreground truncate`}>{emp.name}</span>
                                        {isDepot && fullscreen && !isLineFullscreen && (
                                            <span className={`${fullscreenShiftClass} mb-0.5 max-w-full truncate font-black uppercase tracking-wide text-muted-foreground`}>{depotShiftType === 'GECE' ? 'Gececi' : 'Gündüzcü'}</span>
                                        )}
                                        {isDepot && fullscreen && isLineFullscreen && (
                                            <span className={`${fullscreenShiftClass} shrink-0 font-black uppercase tracking-wide text-muted-foreground`}>{depotShiftType === 'GECE' ? 'Gececi' : 'Gündüzcü'}</span>
                                        )}
                                        {isDepot && !fullscreen && (
                                            <>
                                                <select
                                                    value={depotShiftType}
                                                    onChange={(event) => updateEmployeeDepotShiftType(emp.id, event.target.value as DepotShiftType)}
                                                    className="mb-1.5 w-full bg-background/70 border border-border/50 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                                                >
                                                    <option value="GUNDUZ">Gündüz Personeli</option>
                                                    <option value="GECE">Gece Personeli</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleEmployeeAuthorized(emp.id)}
                                                    className={`mb-1.5 w-full flex items-center gap-1.5 justify-center text-[9px] font-black uppercase tracking-wide rounded-lg px-2 py-1 border transition-all ${emp.isAuthorized ? 'text-amber-600 bg-amber-500/15 border-amber-500/30' : 'text-muted-foreground bg-background/60 border-border/40 hover:border-amber-500/30'}`}
                                                >
                                                    <ShieldCheck size={11} />
                                                    {emp.isAuthorized ? 'Yetkili' : 'Yetkisiz'}
                                                </button>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Önceki seri:</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="6"
                                                        value={emp.previousMonthWorkStreak ?? 0}
                                                        onChange={(e) => updateEmployeePreviousStreak(emp.id, parseInt(e.target.value) || 0)}
                                                        className="w-11 bg-background/70 border border-border/50 rounded-md px-1 py-0.5 text-[9px] font-bold text-center outline-none focus:ring-2 focus:ring-primary/30"
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <div className={`inline-flex items-center w-fit shrink-0 ${fullscreen ? (isLineFullscreen ? 'px-0 py-0 text-[6px] rounded-none border-0 bg-transparent' : 'px-1 py-0 text-[7px] rounded-md') : 'px-2 py-0.5 text-[9px] rounded-lg'} border font-black ${statusColor}`}>
                                            {formatHours(assignedHours)} / {formatHours(emp.targetHours)} sa.
                                        </div>
                                        {!isDepot && (
                                            <input type="number" step="0.5" value={emp.targetHours} onChange={(e) => updateEmployeeTargetHours(emp.id, Number(e.target.value))} className="mt-2 w-20 bg-background/70 border border-border/50 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:ring-2 focus:ring-primary/30" />
                                        )}
                                    </div>
                                    {DAYS.map(day => (
                                        <div key={day} className={`${isDepot ? (fullscreen ? (isLineFullscreen ? 'min-h-0 p-0' : 'min-h-0 p-0.5') : 'p-1 xl:p-1.5') : 'p-2 lg:p-3'} border-r border-border/20 last:border-r-0 overflow-hidden`}>
                                            <AssignmentCell employeeId={emp.id} day={day} isDayClosed={closedDays.includes(day)} compact={isDepot} fullscreen={fullscreen && isDepot} employeeCount={employees.length} />
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                        {employees.length === 0 && (
                            <div className="h-full min-h-[300px] flex items-center justify-center text-center p-8">
                                <div className="max-w-sm">
                                    <div className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">Başlamak için personel ekleyin</div>
                                    <p className="text-sm text-muted-foreground">Sağ panelden ekip üyelerini ekledikten sonra vardiya kalıplarını sürükleyebilir veya otomatik dizim çalıştırabilirsiniz.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`flex-1 ${isDepot ? 'min-h-[860px] lg:min-h-0' : 'min-h-[920px] lg:min-h-0'} my-3 mx-4 lg:ml-4 lg:mr-2 p-4 lg:p-5 flex flex-col bg-card/95 backdrop-blur-xl border border-border/70 rounded-[2rem] shadow-2xl overflow-hidden relative transition-all duration-500 ease-in-out`}>
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 flex-shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        {isDepot ? <Warehouse size={18} className="text-indigo-700 dark:text-indigo-300" /> : <Clock3 size={18} className="text-primary" />}
                        <span className={`text-[11px] font-black uppercase tracking-[0.24em] ${isDepot ? 'text-indigo-700 dark:text-indigo-300' : 'text-primary'}`}>{isDepot ? 'Depo Operasyonu' : 'Mağaza Operasyonu'}</span>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">Vardiya Matrisi</h1>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className={`${isDepot ? 'bg-indigo-600 dark:bg-indigo-300' : 'bg-primary'} w-2 h-2 rounded-full`}></div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Durum: <span className={isDepot ? 'text-indigo-700 dark:text-indigo-300' : 'text-primary'}>{currentState}</span></span>
                    </div>
                    {isDepot && (
                        <div className="mt-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Tablo tarihleri: <span className="text-indigo-700 dark:text-indigo-300">{depotSelectedWeek.label} · {depotSelectedWeek.rangeLabel}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 lg:gap-3 w-full xl:w-auto">
                    <button onClick={clearEmployees} className="flex-1 xl:flex-none justify-center px-3 lg:px-4 py-2.5 rounded-xl font-bold text-xs lg:text-sm text-red-600 bg-red-500/10 hover:bg-red-500/20 flex items-center gap-2 transition-all active:scale-95 border border-red-500/10"><UserX size={15}/> Personel Sil</button>
                    <button onClick={clearCalendar} className="flex-1 xl:flex-none justify-center px-3 lg:px-4 py-2.5 rounded-xl font-bold text-xs lg:text-sm text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 flex items-center gap-2 transition-all active:scale-95 border border-amber-500/10"><Trash2 size={15}/> Takvimi Temizle</button>
                    {isDepot && (
                        <button
                            onClick={() => setShowReport(v => !v)}
                            className={`flex-1 xl:flex-none justify-center px-3 lg:px-4 py-2.5 rounded-xl font-bold text-xs lg:text-sm flex items-center gap-2 transition-all active:scale-95 border ${showReport ? 'text-indigo-700 dark:text-indigo-200 bg-indigo-500/[0.12] border-indigo-500/25' : 'text-slate-600 dark:text-slate-300 bg-background/50 border-border/50 hover:bg-card/80'}`}
                        >
                            <BarChart3 size={15}/> Rapor
                        </button>
                    )}
                    <button onClick={onOptimize} disabled={isOptimizing} className={`w-full xl:w-auto justify-center px-5 lg:px-7 py-2.5 rounded-xl font-extrabold text-sm text-white transition-all hover:translate-y-[-1px] active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center gap-2 ${isDepot ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 dark:bg-indigo-500 dark:hover:bg-indigo-400' : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25'}`}>
                        {isOptimizing ? 'Hesaplanıyor...' : 'Otomatik Diz'}
                    </button>
                </div>
            </div>

            {isDepot && <DepotRulePanel settings={depotRuleSettings} updateSettings={updateDepotRuleSettings} resetSettings={resetDepotRuleSettings} />}

            {isDepot && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 flex-shrink-0">
                    <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                        <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">Gündüz Planı</div>
                        <div className="text-xs font-bold text-foreground">12:30 - 22:30 · 10 saat · 1 saat mola · 50 sa./hafta</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                        <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">Gece Planı</div>
                        <div className="text-xs font-bold text-foreground">00:30 - 09:00 · 8.5 saat · 1 saat mola · 42.5 sa./hafta</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                        <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">Yetkililer</div>
                        <div className="text-xs font-bold text-foreground">
                            {authorizedCount > 0 
                                ? `${authorizedCount} yetkili personel · Her gün en az 1 yetkili çalışmalı`
                                : 'Henüz yetkili yok · Aşağıdan atayabilirsiniz'}
                        </div>
                    </div>
                </div>
            )}

            {!isDepot && <MagazaRulePanel settings={magazaRuleSettings} updateSettings={updateMagazaRuleSettings} resetSettings={resetMagazaRuleSettings} />}

            {isDepot && showReport && <DepotReportPanel report={report} />}
            {isDepot && <DepotArchivePanel onArchiveChange={() => setDepotArchiveVersion(version => version + 1)} />}

            <div className={`flex-1 ${isDepot ? 'min-h-[620px] xl:min-h-[700px]' : 'min-h-[680px] lg:min-h-0'} bg-background/45 backdrop-blur-sm border border-border/60 rounded-2xl shadow-inner flex flex-col overflow-hidden relative`}>
                {isDepot && (
                    <button
                        type="button"
                        onClick={() => setIsTableFullscreen(true)}
                        className="absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/95 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-700 shadow-lg transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                        <Maximize2 size={14} />
                        Tam Ekran
                    </button>
                )}
                <div className={`${isDepot ? 'pt-12' : ''} flex flex-1 min-h-0`}>
                    {renderScheduleMatrix(false)}
                </div>
            </div>

            {isDepot && isTableFullscreen && createPortal((
                <div className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-950 shadow-2xl dark:bg-slate-950 dark:text-slate-50">
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                        <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-700 dark:text-indigo-300">Tam ekran depo tablosu</div>
                            <div className="mt-0.5 truncate text-sm font-black text-foreground">{depotSelectedWeek.label} · {depotSelectedWeek.rangeLabel}</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsTableFullscreen(false)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            <Minimize2 size={14} />
                            Küçült
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 p-1 sm:p-1.5">
                        <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white/85 shadow-inner dark:border-slate-800 dark:bg-slate-950/80">
                            {renderScheduleMatrix(true)}
                        </div>
                    </div>
                </div>
            ), document.body)}
        </div>
    );
};
