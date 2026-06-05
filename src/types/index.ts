export type ShiftType = 'SABAH' | 'AKSAM' | 'FULL' | 'IZIN' | 'GUNDUZ' | 'GECE' | 'ARACI' | 'BOS';

export type DepotShiftType = 'GUNDUZ' | 'GECE';

export type OperationMode = 'MAGAZA' | 'DEPO';

export type Employee = {
    id: string;
    name: string;
    targetHours: number;
    depotShiftType?: DepotShiftType;
    /** DEPO: Bu personel yetkili mi? Yetkililerin en az biri her gün çalışmalı */
    isAuthorized?: boolean;
    /** DEPO: Önceki aydan gelen üst üste çalışma serisi (ay geçişi kuralı için) */
    previousMonthWorkStreak?: number;
};

export type Assignment = {
    id: string; 
    employeeId: string;
    day: string;
    type: ShiftType;
    startTime: string; 
    endTime: string;
    isLocked: boolean;
};

export type ShiftPreset = {
    type: ShiftType;
    startTime: string;
    endTime: string;
    label: string;
    color: string;
    breakMinutes?: number;
    targetHours?: number;
    plannedHours?: number;
};

export type AppState = 'BOS' | 'ELLE_DIZILIYOR' | 'OTO_DIZILDI';

export type MagazaRuleSettings = {
    weeklyIzinTarget: number;
    weeklyFullTarget: number;
    weeklySabahTarget: number;
    maxSabahPerEmployee: number;
    requiredOpeners: number;
    minClosers: number;
};

export type DepotRuleSettings = {
    /** Gece personeli izinlerini arka arkaya koy */
    consecutiveRestDays: boolean;
    /** Maks üst üste çalışma günü (sert kural) */
    maxConsecutiveWorkDays: number;
    /** Gündüzden geceye direkt geçiş yasak — arada izin zorunlu */
    requireOffBeforeDayToNight: boolean;
    /** Hafta sonu izin dengesini göz önünde bulundur */
    balanceWeekends: boolean;
    /** Gece/gündüz vardiya sayısını dengele */
    balanceDayNight: boolean;
    /** Aynı güne çok izin yığılmasını önle */
    avoidSameDayCrowding: boolean;
};


export type DepotWeekSelection = {
    year: number;
    month: number;
    /** Seçili ay içindeki hafta numarası */
    week: number;
    /** "YYYY-MM-W##" formatı */
    key: string;
    /** Pazartesi başlangıcı — "YYYY-MM-DD" */
    startDate: string;
    /** Pazar bitişi — "YYYY-MM-DD" */
    endDate: string;
    /** Örn: "Haziran 2026 · 1. Hafta" */
    label: string;
    /** Örn: "01.06.2026 - 07.06.2026" */
    rangeLabel: string;
    /** Örn: "01.06 - 07.06" */
    shortRangeLabel: string;
    /** Gün başlıklarında gösterilecek tarih etiketleri */
    dayDates: Record<string, string>;
};

/** Her ay sonunda personel bazlı özet — ay geçişi kuralları için saklanır */
export type DepotEmployeeMonthSummary = {
    employeeId: string;
    year: number;
    month: number;
    /** Ay sonu itibariyle üst üste kaç gün çalışıldı */
    endingWorkStreak: number;
    endingShiftType: 'GUNDUZ' | 'GECE' | 'IZIN' | null;
    dayShiftCount: number;
    nightShiftCount: number;
    offDayCount: number;
    weekendOffCount: number;
    maxConsecutiveWork: number;
};

/** Eski aylık depo arşiv kaydı — geriye dönük içe/dışa aktarma için korunur */
export type DepotMonthArchive = {
    year: number;
    month: number;
    /** "YYYY-MM" formatı */
    key: string;
    assignments: Assignment[];
    employees: Employee[];
    summaries: DepotEmployeeMonthSummary[];
    savedAt: string;
};

/** Haftalık depo arşiv kaydı — tarayıcıda saklanır */
export type DepotWeekArchive = DepotWeekSelection & {
    assignments: Assignment[];
    employees: Employee[];
    summaries: DepotEmployeeMonthSummary[];
    /** Depo haftası kaydedilirken kapalı işaretlenen günler */
    closedDays?: string[];
    savedAt: string;
};

/** Depo aylık raporu — UI'da gösterilir */
export type DepotMonthReport = {
    employeeId: string;
    employeeName: string;
    dayShiftCount: number;
    nightShiftCount: number;
    offDayCount: number;
    weekendOffCount: number;
    saturdayWorkedCount: number;
    sundayWorkedCount: number;
    maxConsecutiveWork: number;
    warnings: string[];
};
