export type ShiftType = 'SABAH' | 'AKSAM' | 'FULL' | 'IZIN' | 'BOS';

export type Employee = { id: string; name: string; targetHours: number; };

export type Assignment = {
    id: string; 
    employeeId: string;
    day: string;
    type: ShiftType;
    startTime: string; 
    endTime: string;
    isLocked: boolean;
};

// KUSURSUZ MİMARİ: color eklendi
export type ShiftPreset = { type: ShiftType; startTime: string; endTime: string; label: string; color: string; };

export type AppState = 'BOS' | 'ELLE_DIZILIYOR' | 'OTO_DIZILDI';