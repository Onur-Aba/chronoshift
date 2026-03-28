import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Employee, Assignment, ShiftPreset, AppState } from '@/types';

const defaultPresets: Record<string, ShiftPreset> = {
    SABAH: { type: 'SABAH', startTime: '08:45', endTime: '17:45', label: 'Sabah', color: '#0ea5e9' }, 
    AKSAM: { type: 'AKSAM', startTime: '13:15', endTime: '21:15', label: 'Akşam', color: '#6366f1' }, 
    FULL: { type: 'FULL', startTime: '08:45', endTime: '21:15', label: 'Full', color: '#f59e0b' },   
    IZIN: { type: 'IZIN', startTime: '', endTime: '', label: 'İzin', color: '#71717a' }          
};

interface StoreState {
    employees: Employee[];
    assignments: Assignment[];
    presets: Record<string, ShiftPreset>;
    currentState: AppState;
    
    globalTargetHours: number;
    useGlobalTargetHours: boolean;
    setGlobalTargetSettings: (useGlobal: boolean, hours: number) => void;
    
    addEmployee: (name: string, targetHours: number) => void;
    removeEmployee: (id: string) => void;
    clearEmployees: () => void;
    updateEmployeeTargetHours: (id: string, hours: number) => void;
    
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

            updatePreset: (type, startTime, endTime, color) => set((state) => ({ 
                presets: { ...state.presets, [type]: { ...state.presets[type], startTime, endTime, color } } 
            })),
            resetPresets: () => set({ presets: defaultPresets }), 

            updateAssignment: (id, type, startTime, endTime, isLocked) => set((state) => {
                const existingIndex = state.assignments.findIndex(a => a.id === id);
                let newAssignments = [...state.assignments];
                
                if (existingIndex >= 0) {
                    newAssignments[existingIndex] = { ...newAssignments[existingIndex], type: type as any, startTime, endTime, isLocked };
                } else {
                    // KUSURSUZ MİMARİ DEVRİM: split('-') hatası yok edildi!
                    // UUID içindeki tirelere dokunmamak için sadece en sondaki tireyi (Günü ayıran) buluyoruz.
                    const lastDash = id.lastIndexOf('-');
                    const employeeId = id.substring(0, lastDash);
                    const day = id.substring(lastDash + 1);
                    
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
            version: 7, // Parçalanmış ID'leri temizlemek için versiyonu yükselttik
            migrate: (persistedState: any, version: number) => {
                if (version < 7) {
                    console.warn(`[ChronoShift]: Parçalanmış UUID tespiti. Veritabanı v7'ye temizleniyor...`);
                    return undefined as any; 
                }
                return persistedState as StoreState;
            }
        }
    )
);