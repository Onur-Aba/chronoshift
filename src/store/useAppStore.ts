import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Employee, Assignment, ShiftPreset, AppState, OperationMode, DepotShiftType, MagazaRuleSettings, DepotRuleSettings } from '@/types';

export const MAGAZA_PRESETS: Record<string, ShiftPreset> = {
    SABAH: { type: 'SABAH', startTime: '08:45', endTime: '17:45', label: 'Sabah', color: '#0ea5e9' }, 
    AKSAM: { type: 'AKSAM', startTime: '13:15', endTime: '21:15', label: 'Akşam', color: '#6366f1' }, 
    FULL: { type: 'FULL', startTime: '08:45', endTime: '21:15', label: 'Full', color: '#f59e0b' },   
    IZIN: { type: 'IZIN', startTime: '', endTime: '', label: 'İzin', color: '#71717a' }          
};

export const DEFAULT_MAGAZA_RULE_SETTINGS: MagazaRuleSettings = {
    weeklyIzinTarget: 1,
    weeklyFullTarget: 1,
    weeklySabahTarget: 2,
    maxSabahPerEmployee: 2,
    requiredOpeners: 2,
    minClosers: 3
};

export const DEFAULT_DEPOT_RULE_SETTINGS: DepotRuleSettings = {
    consecutiveRestDays: false
};

export const DEPO_PRESETS: Record<string, ShiftPreset> = {
    GUNDUZ: { type: 'GUNDUZ', startTime: '12:30', endTime: '22:30', label: 'Gündüz', color: '#ef4444', breakMinutes: 60, targetHours: 50, plannedHours: 10 },
    GECE: { type: 'GECE', startTime: '00:30', endTime: '09:00', label: 'Gece', color: '#f8fafc', breakMinutes: 60, targetHours: 42.5, plannedHours: 8.5 },
    IZIN: { type: 'IZIN', startTime: '', endTime: '', label: 'İzin', color: '#71717a' },
    ARACI: { type: 'ARACI', startTime: '', endTime: '', label: 'Aracı', color: '#10b981' }
};

const DEFAULT_PRESETS_BY_MODE: Record<OperationMode, Record<string, ShiftPreset>> = {
    MAGAZA: MAGAZA_PRESETS,
    DEPO: DEPO_PRESETS
};

interface StoreState {
    employees: Employee[];
    assignments: Assignment[];
    presets: Record<string, ShiftPreset>;
    modePresets: Record<OperationMode, Record<string, ShiftPreset>>;
    operationMode: OperationMode;
    currentState: AppState;
    magazaRuleSettings: MagazaRuleSettings;
    depotRuleSettings: DepotRuleSettings;
    closedDays: string[];
    
    globalTargetHours: number;
    useGlobalTargetHours: boolean;
    setGlobalTargetSettings: (useGlobal: boolean, hours: number) => void;
    updateMagazaRuleSettings: (settings: Partial<MagazaRuleSettings>) => void;
    resetMagazaRuleSettings: () => void;
    updateDepotRuleSettings: (settings: Partial<DepotRuleSettings>) => void;
    resetDepotRuleSettings: () => void;
    toggleClosedDay: (day: string) => void;
    setOperationMode: (mode: OperationMode) => void;
    
    addEmployee: (name: string, targetHours?: number, depotShiftType?: DepotShiftType) => void;
    removeEmployee: (id: string) => void;
    clearEmployees: () => void;
    updateEmployeeTargetHours: (id: string, hours: number) => void;
    updateEmployeeDepotShiftType: (id: string, depotShiftType: DepotShiftType) => void;
    
    updatePreset: (type: string, startTime: string, endTime: string, color: string) => void;
    resetPresets: () => void; 
    
    updateAssignment: (id: string, type: string, startTime: string, endTime: string, isLocked: boolean) => void;
    clearCalendar: () => void; 
    setAppState: (state: AppState) => void;
}

const getModeTarget = (mode: OperationMode) => mode === 'DEPO' ? 50 : 45;
const getDepotTarget = (depotShiftType: DepotShiftType = 'GUNDUZ') => DEPO_PRESETS[depotShiftType]?.targetHours ?? 50;
const getFallbackDepotShiftType = (index: number): DepotShiftType => index % 2 === 0 ? 'GUNDUZ' : 'GECE';

const normalizeEmployees = (employees: Employee[] = [], mode: OperationMode = 'MAGAZA', useGlobalTargetHours = true): Employee[] => {
    const modeTarget = getModeTarget(mode);

    return employees.map((employee, index) => {
        const depotShiftType = employee.depotShiftType ?? getFallbackDepotShiftType(index);
        const targetHours = mode === 'DEPO'
            ? getDepotTarget(depotShiftType)
            : useGlobalTargetHours
                ? modeTarget
                : employee.targetHours;

        return {
            ...employee,
            depotShiftType,
            targetHours
        };
    });
};

export const useAppStore = create<StoreState>()(
    persist(
        (set) => ({
            employees: [],
            assignments: [],
            operationMode: 'MAGAZA',
            modePresets: DEFAULT_PRESETS_BY_MODE,
            presets: MAGAZA_PRESETS,
            currentState: 'BOS',
            magazaRuleSettings: DEFAULT_MAGAZA_RULE_SETTINGS,
            depotRuleSettings: DEFAULT_DEPOT_RULE_SETTINGS,
            closedDays: [],
            globalTargetHours: 45,
            useGlobalTargetHours: true,

            setGlobalTargetSettings: (useGlobal, hours) => set({ useGlobalTargetHours: useGlobal, globalTargetHours: hours }),
            updateMagazaRuleSettings: (settings) => set((state) => ({
                magazaRuleSettings: { ...state.magazaRuleSettings, ...settings }
            })),
            resetMagazaRuleSettings: () => set({ magazaRuleSettings: DEFAULT_MAGAZA_RULE_SETTINGS }),
            updateDepotRuleSettings: (settings) => set((state) => ({
                depotRuleSettings: { ...state.depotRuleSettings, ...settings }
            })),
            resetDepotRuleSettings: () => set({ depotRuleSettings: DEFAULT_DEPOT_RULE_SETTINGS }),
            toggleClosedDay: (day) => set((state) => {
                const willClose = !state.closedDays.includes(day);
                const closedDays = willClose
                    ? [...state.closedDays, day]
                    : state.closedDays.filter(closedDay => closedDay !== day);

                return {
                    closedDays,
                    assignments: willClose
                        ? state.assignments.map(assignment => assignment.day === day
                            ? { ...assignment, type: 'BOS' as const, startTime: '', endTime: '', isLocked: false }
                            : assignment
                        )
                        : state.assignments,
                    currentState: 'ELLE_DIZILIYOR'
                };
            }),

            setOperationMode: (mode) => set((state) => {
                const nextPresets = state.modePresets?.[mode] || DEFAULT_PRESETS_BY_MODE[mode];
                const targetHours = getModeTarget(mode);
                return {
                    operationMode: mode,
                    presets: nextPresets,
                    assignments: [],
                    currentState: 'BOS',
                    globalTargetHours: targetHours,
                    employees: normalizeEmployees(state.employees, mode, state.useGlobalTargetHours)
                };
            }),

            addEmployee: (name, targetHours, depotShiftType = 'GUNDUZ') => set((state) => {
                const hours = state.operationMode === 'DEPO'
                    ? getDepotTarget(depotShiftType)
                    : targetHours ?? state.globalTargetHours ?? getModeTarget(state.operationMode);

                return {
                    employees: [
                        ...state.employees,
                        { id: crypto.randomUUID(), name, targetHours: hours, depotShiftType }
                    ]
                };
            }),
            removeEmployee: (id) => set((state) => ({ employees: state.employees.filter(e => e.id !== id), assignments: state.assignments.filter(a => a.employeeId !== id) })),
            clearEmployees: () => set({ employees: [], assignments: [], currentState: 'BOS' }),
            updateEmployeeTargetHours: (id, hours) => set((state) => ({ employees: state.employees.map(e => e.id === id ? { ...e, targetHours: hours } : e) })),
            updateEmployeeDepotShiftType: (id, depotShiftType) => set((state) => ({
                employees: state.employees.map(employee => employee.id === id
                    ? {
                        ...employee,
                        depotShiftType,
                        targetHours: state.operationMode === 'DEPO' ? getDepotTarget(depotShiftType) : employee.targetHours
                    }
                    : employee
                ),
                assignments: [],
                currentState: 'BOS'
            })),

            updatePreset: (type, startTime, endTime, color) => set((state) => {
                const previousPreset = state.presets[type];
                if (!previousPreset) return {};

                const nextPreset = { ...previousPreset, startTime, endTime, color };
                const nextPresets = { ...state.presets, [type]: nextPreset };
                const nextModePresets = {
                    ...state.modePresets,
                    [state.operationMode]: nextPresets
                };

                return {
                    presets: nextPresets,
                    modePresets: nextModePresets,
                    assignments: state.assignments.map(assignment => {
                        if (assignment.type !== type) return assignment;
                        return {
                            ...assignment,
                            startTime: nextPreset.startTime,
                            endTime: nextPreset.endTime
                        };
                    })
                };
            }),
            resetPresets: () => set((state) => {
                const defaults = DEFAULT_PRESETS_BY_MODE[state.operationMode];
                return {
                    presets: defaults,
                    modePresets: { ...state.modePresets, [state.operationMode]: defaults },
                    assignments: state.assignments.map(assignment => {
                        const preset = defaults[assignment.type];
                        if (!preset) return assignment;
                        return { ...assignment, startTime: preset.startTime, endTime: preset.endTime };
                    }),
                    employees: state.operationMode === 'DEPO'
                        ? state.employees.map(employee => ({
                            ...employee,
                            targetHours: getDepotTarget(employee.depotShiftType ?? 'GUNDUZ')
                        }))
                        : state.employees
                };
            }), 

            updateAssignment: (id, type, startTime, endTime, isLocked) => set((state) => {
                const existingIndex = state.assignments.findIndex(a => a.id === id);
                const newAssignments = [...state.assignments];
                
                if (existingIndex >= 0) {
                    newAssignments[existingIndex] = { ...newAssignments[existingIndex], type: type as any, startTime, endTime, isLocked };
                } else {
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
            version: 13,
            migrate: (persistedState: any, version: number) => {
                if (!persistedState || version < 7) return undefined as any;

                const operationMode = (persistedState.operationMode || 'MAGAZA') as OperationMode;
                const savedModePresets = persistedState.modePresets || {};
                const modePresets = version < 10
                    ? {
                        MAGAZA: { ...MAGAZA_PRESETS, ...(savedModePresets.MAGAZA || {}) },
                        DEPO: DEPO_PRESETS
                    }
                    : {
                        ...DEFAULT_PRESETS_BY_MODE,
                        ...savedModePresets
                    };

                const baseState = version < 8
                    ? {
                        ...persistedState,
                        operationMode: 'MAGAZA' as OperationMode,
                        modePresets,
                        presets: persistedState.presets || MAGAZA_PRESETS
                    }
                    : {
                        ...persistedState,
                        operationMode,
                        modePresets,
                        presets: version < 10 && operationMode === 'DEPO'
                            ? DEPO_PRESETS
                            : persistedState.presets || modePresets[operationMode]
                    };

	                const savedRules = persistedState.magazaRuleSettings || {};
	                const savedDepotRules = persistedState.depotRuleSettings || {};

	                return {
                    ...baseState,
                    magazaRuleSettings: {
	                        weeklyIzinTarget: savedRules.weeklyIzinTarget ?? DEFAULT_MAGAZA_RULE_SETTINGS.weeklyIzinTarget,
	                        weeklyFullTarget: savedRules.weeklyFullTarget ?? DEFAULT_MAGAZA_RULE_SETTINGS.weeklyFullTarget,
	                        weeklySabahTarget: savedRules.weeklySabahTarget ?? DEFAULT_MAGAZA_RULE_SETTINGS.weeklySabahTarget,
	                        maxSabahPerEmployee: savedRules.maxSabahPerEmployee ?? DEFAULT_MAGAZA_RULE_SETTINGS.maxSabahPerEmployee,
	                        requiredOpeners: savedRules.requiredOpeners ?? DEFAULT_MAGAZA_RULE_SETTINGS.requiredOpeners,
	                        minClosers: savedRules.minClosers ?? DEFAULT_MAGAZA_RULE_SETTINGS.minClosers
                    },
                    depotRuleSettings: {
                        consecutiveRestDays: savedDepotRules.consecutiveRestDays ?? DEFAULT_DEPOT_RULE_SETTINGS.consecutiveRestDays
                    },
	                    closedDays: Array.isArray(persistedState.closedDays) ? persistedState.closedDays : [],
                    employees: normalizeEmployees(baseState.employees || [], baseState.operationMode, baseState.useGlobalTargetHours ?? true)
                } as StoreState;
            }
        }
    )
);
