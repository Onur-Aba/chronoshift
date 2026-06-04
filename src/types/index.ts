export type ShiftType = 'SABAH' | 'AKSAM' | 'FULL' | 'IZIN' | 'GUNDUZ' | 'GECE' | 'ARACI' | 'BOS';

export type DepotShiftType = 'GUNDUZ' | 'GECE';

export type OperationMode = 'MAGAZA' | 'DEPO';

export type Employee = {
    id: string;
    name: string;
    targetHours: number;
    depotShiftType?: DepotShiftType;
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
