import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Employee, Assignment, ShiftPreset, AppState } from '@/types';

// Varsayılan dinamik renkler (İstediğin zaman arayüzden değiştirebileceksin)
const defaultPresets: Record<string, ShiftPreset> = {
    SABAH: { type: 'SABAH', startTime: '08:45', endTime: '17:45', label: 'Sabah', color: '#0ea5e9' }, // Sky
    AKSAM: { type: 'AKSAM', startTime: '13:15', endTime: '21:15', label: 'Akşam', color: '#6366f1' }, // Indigo
    FULL: { type: 'FULL', startTime: '08:45', endTime: '21:15', label: 'Full', color: '#f59e0b' },   // Amber
    IZIN: { type: 'IZIN', startTime: '', endTime: '', label: 'İzin', color: '#71717a' }          // Zinc
};

interface StoreState {
    employees: Employee[];
    assignments: Assignment[];
    presets: Record<string, ShiftPreset>;
    currentState: AppState;
    
    // TS HATALARINI ÇÖZEN KAYIP DEĞİŞKENLER
    globalTargetHours: number;
    useGlobalTargetHours: boolean;
    setGlobalTargetSettings: (useGlobal: boolean, hours: number) => void;
    
    addEmployee: (name: string, targetHours: number) => void;
    removeEmployee: (id: string) => void;
    clearEmployees: () => void;
    updateEmployeeTargetHours: (id: string, hours: number) => void;
    
    // RENK MOTORU VE SIFIRLAMA EKLENDİ
    updatePreset: (type: string, startTime: string, endTime: string, color: string) => void;
    resetPresets: () => void; 
    
    updateAssignment: (id: string, type: string, startTime: string, endTime: string, isLocked: boolean) => void;
    clearCalendar: () => void; 
    setAppState: (state: AppState) => void;
}

export const useAppStore = create<StoreState>()(
    persist(
        (set, get) => ({
            employees: [], assignments: [], presets: defaultPresets, currentState: 'BOS',
            globalTargetHours: 45, useGlobalTargetHours: true,

            setGlobalTargetSettings: (useGlobal, hours) => set({ useGlobalTargetHours: useGlobal, globalTargetHours: hours }),

            addEmployee: (name, targetHours) => set((state) => ({ employees: [...state.employees, { id: crypto.randomUUID(), name, targetHours }] })),
            removeEmployee: (id) => set((state) => ({ employees: state.employees.filter(e => e.id !== id), assignments: state.assignments.filter(a => a.employeeId !== id) })),
            clearEmployees: () => set({ employees: [], assignments: [], currentState: 'BOS' }),
            updateEmployeeTargetHours: (id, hours) => set((state) => ({ employees: state.employees.map(e => e.id === id ? { ...e, targetHours: hours } : e) })),

            // Şablon güncelleyici artık rengi de alıyor
            updatePreset: (type, startTime, endTime, color) => set((state) => ({ 
                presets: { ...state.presets, [type]: { ...state.presets[type], startTime, endTime, color } } 
            })),
            resetPresets: () => set({ presets: defaultPresets }), // Şablonları Fabrika ayarlarına döndür

            updateAssignment: (id, type, startTime, endTime, isLocked) => set((state) => {
                const existingIndex = state.assignments.findIndex(a => a.id === id);
                let newAssignments = [...state.assignments];
                if (existingIndex >= 0) newAssignments[existingIndex] = { ...newAssignments[existingIndex], type: type as any, startTime, endTime, isLocked };
                else {
                    const [employeeId, day] = id.split('-');
                    newAssignments.push({ id, employeeId, day, type: type as any, startTime, endTime, isLocked });
                }
                return { assignments: newAssignments, currentState: 'ELLE_DIZILIYOR' };
            }),

            clearCalendar: () => set({ assignments: [], currentState: 'BOS' }),
            setAppState: (newState) => set({ currentState: newState }),
        }),
        { 
            name: 'chronoshift-v2-storage', 
            storage: createJSONStorage(() => localStorage), 
            version: 6,
            
            // KUSURSUZ MİMARİ: GÖÇ (MIGRATION) MOTORU
            migrate: (persistedState: any, version: number) => {
                if (version < 6) {
                    // Sistem eski bir veritabanı (v5 ve altı) yakalarsa, 
                    // çökmek yerine eski veriyi yok eder ve yeni mimariyle sıfırdan başlar.
                    console.warn(`[ChronoShift]: Eski veritabanı versiyonu (${version}) tespit edildi. Sistem v6'ya sıfırlanıyor...`);
                    return undefined as any; 
                }
                return persistedState as StoreState;
            }
        }
    )
);