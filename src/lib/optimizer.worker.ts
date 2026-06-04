export type ShiftType = 'SABAH' | 'AKSAM' | 'FULL' | 'IZIN' | 'GUNDUZ' | 'GECE' | 'ARACI' | 'BOS';

type Mode = 'MAGAZA' | 'DEPO';
type DepotShiftType = 'GUNDUZ' | 'GECE';

type MagazaRuleSettings = {
    weeklyIzinTarget: number;
    weeklyFullTarget: number;
    weeklySabahTarget: number;
    maxSabahPerEmployee: number;
    requiredOpeners: number;
    minClosers: number;
};

const DEFAULT_MAGAZA_RULE_SETTINGS: MagazaRuleSettings = {
    weeklyIzinTarget: 1,
    weeklyFullTarget: 1,
    weeklySabahTarget: 2,
    maxSabahPerEmployee: 2,
    requiredOpeners: 2,
    minClosers: 3
};

const normalizeNonNegativeInteger = (value: unknown, fallback: number) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.max(0, Math.round(numericValue));
};

const normalizeMagazaRuleSettings = (settings?: Partial<MagazaRuleSettings>): MagazaRuleSettings => ({
    weeklyIzinTarget: normalizeNonNegativeInteger(settings?.weeklyIzinTarget, DEFAULT_MAGAZA_RULE_SETTINGS.weeklyIzinTarget),
    weeklyFullTarget: normalizeNonNegativeInteger(settings?.weeklyFullTarget, DEFAULT_MAGAZA_RULE_SETTINGS.weeklyFullTarget),
    weeklySabahTarget: normalizeNonNegativeInteger(settings?.weeklySabahTarget, DEFAULT_MAGAZA_RULE_SETTINGS.weeklySabahTarget),
    maxSabahPerEmployee: normalizeNonNegativeInteger(settings?.maxSabahPerEmployee, DEFAULT_MAGAZA_RULE_SETTINGS.maxSabahPerEmployee),
    requiredOpeners: normalizeNonNegativeInteger(settings?.requiredOpeners, DEFAULT_MAGAZA_RULE_SETTINGS.requiredOpeners),
    minClosers: normalizeNonNegativeInteger(settings?.minClosers, DEFAULT_MAGAZA_RULE_SETTINGS.minClosers)
});

const normalizeClosedDays = (closedDays: unknown): string[] => Array.isArray(closedDays)
    ? closedDays.filter((day): day is string => typeof day === 'string')
    : [];

const assignFromPreset = (assignment: any, type: string, presets: any) => {
    const preset = presets?.[type];
    assignment.type = type;
    assignment.startTime = preset?.startTime || '';
    assignment.endTime = preset?.endTime || '';
};

const clearAssignment = (assignment: any) => {
    assignment.type = 'BOS';
    assignment.startTime = '';
    assignment.endTime = '';
    assignment.isLocked = false;
};

const isOpeningShift = (type: string) => type === 'SABAH' || type === 'FULL';
const isClosingShift = (type: string) => type === 'AKSAM' || type === 'FULL';
const isMagazaWorkType = (type: string) => type === 'SABAH' || type === 'AKSAM' || type === 'FULL';
const isDepotAutoWorkType = (type: string) => type === 'GUNDUZ' || type === 'GECE';
const isDepotWorkType = (type: string) => type === 'GUNDUZ' || type === 'GECE' || type === 'ARACI';
const getFallbackDepotShiftType = (index: number): DepotShiftType => index % 2 === 0 ? 'GUNDUZ' : 'GECE';
const getEmployeeDepotShiftType = (employee: any, index: number): DepotShiftType => {
    return employee?.depotShiftType === 'GECE' ? 'GECE' : employee?.depotShiftType === 'GUNDUZ' ? 'GUNDUZ' : getFallbackDepotShiftType(index);
};

const DEPOT_WEEKLY_IZIN_TARGET = 2;
const getDepotTargetWorkDays = (openDayCount: number) => Math.max(0, openDayCount - DEPOT_WEEKLY_IZIN_TARGET);

self.addEventListener("message", (event: MessageEvent<any>) => {
    const { employees, assignments, presets, days, operationMode = 'MAGAZA', magazaRuleSettings, closedDays } = event.data;
    const safeAssignments = assignments || [];

    if (!employees || employees.length === 0) { 
        self.postMessage(safeAssignments); 
        return; 
    }

    const mode = operationMode as Mode;
    const storeRules = normalizeMagazaRuleSettings(magazaRuleSettings);
    const DAYS = days as string[];
    const closedDaySet = new Set(normalizeClosedDays(closedDays));
    const openDays = DAYS.filter(day => !closedDaySet.has(day));
    let currentAssignments = [...safeAssignments];

    employees.forEach((emp: any) => {
        let empAssignments = currentAssignments.filter((a: any) => a.employeeId === emp.id);
        DAYS.forEach(day => {
            const id = `${emp.id}-${day}`;
            if (!empAssignments.find((a: any) => a.id === id)) {
                const newAssign = { id, employeeId: emp.id, day, type: 'BOS', startTime: '', endTime: '', isLocked: false };
                currentAssignments.push(newAssign);
                empAssignments.push(newAssign);
            }
        });
    });

    currentAssignments.forEach((assignment: any) => {
        if (closedDaySet.has(assignment.day)) clearAssignment(assignment);
    });

    if (mode === 'DEPO') {
        employees.forEach((emp: any, employeeIndex: number) => {
            const empAssignments = currentAssignments.filter((a: any) => a.employeeId === emp.id && !closedDaySet.has(a.day));
            const locked = empAssignments.filter((a: any) => a.isLocked);
            const unlocked = empAssignments.filter((a: any) => !a.isLocked);
            const preferredType = getEmployeeDepotShiftType(emp, employeeIndex);
            const lockedWorkDays = locked.filter((a: any) => isDepotWorkType(a.type)).length;
            const targetWorkDays = getDepotTargetWorkDays(openDays.length);
            const workSlots = Math.max(0, Math.min(unlocked.length, targetWorkDays - lockedWorkDays));

            const pool: string[] = [];
            for (let i = 0; i < workSlots; i++) pool.push(preferredType);
            while (pool.length < unlocked.length) pool.push('IZIN');
            pool.sort(() => Math.random() - 0.5);

            unlocked.forEach((assignment: any, index: number) => {
                const type = pool[index] || 'BOS';
                if (type === 'BOS' || type === 'IZIN') {
                    assignment.type = type;
                    assignment.startTime = '';
                    assignment.endTime = '';
                } else {
                    assignFromPreset(assignment, type, presets);
                }
            });
        });

        const calculateDepotCost = (state: any[]) => {
            let cost = 0;
            employees.forEach((emp: any, employeeIndex: number) => {
                const preferredType = getEmployeeDepotShiftType(emp, employeeIndex);
                const empAssigns = state.filter(a => a.employeeId === emp.id && !closedDaySet.has(a.day));
                const workAssigns = empAssigns.filter(a => isDepotWorkType(a.type));
                const targetWorkDays = getDepotTargetWorkDays(openDays.length);
                const wrongUnlockedTypeCount = workAssigns.filter(a => !a.isLocked && isDepotAutoWorkType(a.type) && a.type !== preferredType).length;

                if (workAssigns.length !== targetWorkDays) cost += Math.abs(targetWorkDays - workAssigns.length) * 100000;
                if (wrongUnlockedTypeCount > 0) cost += wrongUnlockedTypeCount * 500000;
            });

            openDays.forEach(day => {
                const dayAssigns = state.filter(a => a.day === day && isDepotWorkType(a.type));
                const dayWorkers = dayAssigns.filter(a => a.type === 'GUNDUZ').length;
                const nightWorkers = dayAssigns.filter(a => a.type === 'GECE').length;

                if (dayAssigns.length === 0) cost += 50000;
                cost += Math.abs(dayWorkers - nightWorkers) * 500;
            });
            return cost;
        };

        let bestState = JSON.parse(JSON.stringify(currentAssignments));
        let bestCost = calculateDepotCost(bestState);
        let currentCost = bestCost;
        let temperature = 20000;

        for (let i = 0; i < 35000; i++) {
            if (temperature < 0.1 || bestCost === 0) break;
            const neighbor = JSON.parse(JSON.stringify(currentAssignments));
            const randomEmp = employees[Math.floor(Math.random() * employees.length)].id;
            const empAssigns = neighbor.filter((a:any) => a.employeeId === randomEmp && !a.isLocked && !closedDaySet.has(a.day));

            if (empAssigns.length >= 2) {
                const idx1 = Math.floor(Math.random() * empAssigns.length);
                let idx2 = Math.floor(Math.random() * empAssigns.length);
                while(idx1 === idx2) idx2 = Math.floor(Math.random() * empAssigns.length);
                const temp = { type: empAssigns[idx1].type, startTime: empAssigns[idx1].startTime, endTime: empAssigns[idx1].endTime };
                empAssigns[idx1].type = empAssigns[idx2].type;
                empAssigns[idx1].startTime = empAssigns[idx2].startTime;
                empAssigns[idx1].endTime = empAssigns[idx2].endTime;
                empAssigns[idx2].type = temp.type;
                empAssigns[idx2].startTime = temp.startTime;
                empAssigns[idx2].endTime = temp.endTime;
            }

            const newCost = calculateDepotCost(neighbor);
            if (newCost < currentCost || Math.random() < Math.exp((currentCost - newCost) / temperature)) {
                currentAssignments = neighbor;
                currentCost = newCost;
                if (newCost < bestCost) {
                    bestCost = newCost;
                    bestState = JSON.parse(JSON.stringify(currentAssignments));
                }
            }
            temperature *= 0.999;
        }

        bestState.forEach((assignment: any) => {
            if (closedDaySet.has(assignment.day)) clearAssignment(assignment);
        });
        self.postMessage(bestState);
        return;
    }

    employees.forEach((emp: any) => {
        let empAssignments = currentAssignments.filter((a: any) => a.employeeId === emp.id && !closedDaySet.has(a.day));
        const locked = empAssignments.filter((a: any) => a.isLocked);
        const unlocked = empAssignments.filter((a: any) => !a.isLocked);
        let targets: Record<string, number> = {
            IZIN: storeRules.weeklyIzinTarget,
            FULL: storeRules.weeklyFullTarget,
            SABAH: storeRules.weeklySabahTarget
        };
        locked.forEach((a: any) => {
            if (targets[a.type] !== undefined) targets[a.type]--;
        });

        let pool: string[] = [];
        for(let i=0; i < Math.max(0, targets.IZIN); i++) pool.push('IZIN');
        for(let i=0; i < Math.max(0, targets.FULL); i++) pool.push('FULL');
        for(let i=0; i < Math.max(0, targets.SABAH); i++) pool.push('SABAH');
        while(pool.length < unlocked.length) pool.push('AKSAM');
        pool = pool.slice(0, unlocked.length).sort(() => Math.random() - 0.5);

        unlocked.forEach((a: any, index: number) => {
            const type = pool[index]; 
            if (type === 'IZIN' || type === 'BOS') { 
                a.type = type; a.startTime = ''; a.endTime = ''; 
            } else {
                assignFromPreset(a, type, presets);
            }
        });
    });

    const calculateCost = (state: any[]) => {
        let cost = 0;
        openDays.forEach((day) => {
            const dayAssigns = state.filter(a => a.day === day && isMagazaWorkType(a.type));
            const openers = dayAssigns.filter(a => isOpeningShift(a.type)).length;
            if (openers !== storeRules.requiredOpeners) cost += Math.abs(storeRules.requiredOpeners - openers) * 100000;

            const closers = dayAssigns.filter(a => isClosingShift(a.type)).length;
            if (closers < storeRules.minClosers) cost += (storeRules.minClosers - closers) * 100000;
            else cost -= (closers - storeRules.minClosers) * 5000;
        });

        employees.forEach((emp: any) => {
            const empAssigns = state.filter(a => a.employeeId === emp.id && !closedDaySet.has(a.day));
            const izinCount = empAssigns.filter(a => a.type === 'IZIN').length;
            const fullCount = empAssigns.filter(a => a.type === 'FULL').length;
            const sabahCount = empAssigns.filter(a => a.type === 'SABAH').length;
            if (izinCount !== storeRules.weeklyIzinTarget) cost += Math.abs(storeRules.weeklyIzinTarget - izinCount) * 500000;
            if (fullCount !== storeRules.weeklyFullTarget) cost += Math.abs(storeRules.weeklyFullTarget - fullCount) * 500000;
            if (sabahCount !== storeRules.weeklySabahTarget) cost += Math.abs(storeRules.weeklySabahTarget - sabahCount) * 500000;
            if (sabahCount > storeRules.maxSabahPerEmployee) cost += (sabahCount - storeRules.maxSabahPerEmployee) * 50000;
        });
        return cost;
    };

    let bestState = JSON.parse(JSON.stringify(currentAssignments));
    let bestCost = calculateCost(bestState);
    let currentCost = bestCost;
    let temperature = 50000; 

    for (let i = 0; i < 60000; i++) {
        if (temperature < 0.1 || bestCost === 0) break; 
        const neighbor = JSON.parse(JSON.stringify(currentAssignments));
        const randomEmp = employees[Math.floor(Math.random() * employees.length)].id;
        const empAssigns = neighbor.filter((a:any) => a.employeeId === randomEmp && !a.isLocked && !closedDaySet.has(a.day));

        if (empAssigns.length > 0) {
            if (Math.random() > 0.3 && empAssigns.length >= 2) {
                const idx1 = Math.floor(Math.random() * empAssigns.length);
                let idx2 = Math.floor(Math.random() * empAssigns.length);
                while(idx1 === idx2) idx2 = Math.floor(Math.random() * empAssigns.length);
                const temp = { type: empAssigns[idx1].type, startTime: empAssigns[idx1].startTime, endTime: empAssigns[idx1].endTime };
                empAssigns[idx1].type = empAssigns[idx2].type;
                empAssigns[idx1].startTime = empAssigns[idx2].startTime;
                empAssigns[idx1].endTime = empAssigns[idx2].endTime;
                empAssigns[idx2].type = temp.type;
                empAssigns[idx2].startTime = temp.startTime;
                empAssigns[idx2].endTime = temp.endTime;
            } else {
                const idx = Math.floor(Math.random() * empAssigns.length);
                const currentType = empAssigns[idx].type;
                if (currentType === 'SABAH' || currentType === 'AKSAM') {
                    const newType = currentType === 'SABAH' ? 'AKSAM' : 'SABAH';
                    assignFromPreset(empAssigns[idx], newType, presets);
                }
            }
        }

        const newCost = calculateCost(neighbor);
        if (newCost < currentCost || Math.random() < Math.exp((currentCost - newCost) / temperature)) {
            currentAssignments = neighbor;
            currentCost = newCost;
            if (newCost < bestCost) {
                bestCost = newCost;
                bestState = JSON.parse(JSON.stringify(currentAssignments));
            }
        }
        temperature *= 0.999;
    }

    bestState.forEach((assignment: any) => {
        if (closedDaySet.has(assignment.day)) clearAssignment(assignment);
    });
    self.postMessage(bestState);
});
