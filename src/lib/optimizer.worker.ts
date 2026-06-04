export type ShiftType = 'SABAH' | 'AKSAM' | 'FULL' | 'IZIN' | 'GUNDUZ' | 'GECE' | 'ARACI' | 'BOS';

type Mode = 'MAGAZA' | 'DEPO';
type DepotShiftType = 'GUNDUZ' | 'GECE';

type DepotRuleSettings = {
    consecutiveRestDays: boolean;
};

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

const DEFAULT_DEPOT_RULE_SETTINGS: DepotRuleSettings = {
    consecutiveRestDays: false
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

const normalizeDepotRuleSettings = (settings?: Partial<DepotRuleSettings>): DepotRuleSettings => ({
    consecutiveRestDays: settings?.consecutiveRestDays ?? DEFAULT_DEPOT_RULE_SETTINGS.consecutiveRestDays
});

const normalizeClosedDays = (closedDays: unknown): string[] => Array.isArray(closedDays)
    ? closedDays.filter((day): day is string => typeof day === 'string')
    : [];

const createSeededRandom = (seed: number) => {
    let state = Math.abs(Math.floor(seed)) % 2147483647;
    if (state === 0) state = 1;

    return () => {
        state = state * 16807 % 2147483647;
        return (state - 1) / 2147483646;
    };
};

const getHashSeed = (...parts: unknown[]) => {
    const input = parts.map(part => String(part)).join('|');
    let hash = 2166136261;

    for (let index = 0; index < input.length; index++) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return Math.abs(hash >>> 0) || 1;
};

const seededShuffle = <T>(items: T[], seed: number) => {
    const random = createSeededRandom(seed);
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
};

const getSeededTieBreaker = (...parts: unknown[]) => createSeededRandom(getHashSeed(...parts))();

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
const getDepotTargetRestDays = (openDayCount: number) => openDayCount - getDepotTargetWorkDays(openDayCount);

const getMaxConsecutiveRun = (indexes: number[]) => {
    if (indexes.length === 0) return 0;
    const sortedIndexes = [...indexes].sort((a, b) => a - b);
    let bestRun = 1;
    let currentRun = 1;

    for (let index = 1; index < sortedIndexes.length; index++) {
        if (sortedIndexes[index] === sortedIndexes[index - 1] + 1) {
            currentRun++;
            bestRun = Math.max(bestRun, currentRun);
        } else {
            currentRun = 1;
        }
    }

    return bestRun;
};

const getDepotRestDayRunPenalty = (state: any[], employeeId: string, openDays: string[]) => {
    const targetRestDays = getDepotTargetRestDays(openDays.length);
    if (targetRestDays <= 1) return 0;

    const restDayIndexes = openDays
        .map((day, index) => state.find(a => a.employeeId === employeeId && a.day === day)?.type === 'IZIN' ? index : -1)
        .filter(index => index >= 0);

    if (restDayIndexes.length < targetRestDays) return targetRestDays - restDayIndexes.length;
    const maxRun = getMaxConsecutiveRun(restDayIndexes);
    return Math.max(0, Math.min(targetRestDays, restDayIndexes.length) - maxRun);
};

const getCompatibleConsecutiveRestDays = (empAssignments: any[], openDays: string[], targetRestDays: number) => {
    if (targetRestDays <= 1) return null;

    const assignmentByDay = new Map(empAssignments.map((assignment: any) => [assignment.day, assignment]));
    const possibleBlocks: string[][] = [];

    for (let startIndex = 0; startIndex <= openDays.length - targetRestDays; startIndex++) {
        const block = openDays.slice(startIndex, startIndex + targetRestDays);
        const hasLockedRestOutsideBlock = empAssignments.some((assignment: any) =>
            assignment.isLocked && assignment.type === 'IZIN' && openDays.includes(assignment.day) && !block.includes(assignment.day)
        );
        const hasLockedWorkInsideBlock = block.some(day => {
            const assignment = assignmentByDay.get(day);
            return assignment?.isLocked && isDepotWorkType(assignment.type);
        });

        if (!hasLockedRestOutsideBlock && !hasLockedWorkInsideBlock) possibleBlocks.push(block);
    }

    if (possibleBlocks.length === 0) return null;
    return possibleBlocks[Math.floor(Math.random() * possibleBlocks.length)];
};

const getDayCombinations = (days: string[], size: number): string[][] => {
    if (size <= 0) return [[]];
    if (size > days.length) return [];

    const results: string[][] = [];
    const walk = (startIndex: number, selected: string[]) => {
        if (selected.length === size) {
            results.push([...selected]);
            return;
        }

        for (let index = startIndex; index < days.length; index++) {
            selected.push(days[index]);
            walk(index + 1, selected);
            selected.pop();
        }
    };

    walk(0, []);
    return results;
};

const isConsecutiveRestBlock = (restDays: string[], openDays: string[], targetRestDays: number) => {
    if (targetRestDays <= 1) return true;

    const indexes = Array.from(new Set(restDays
        .map(day => openDays.indexOf(day))
        .filter(index => index >= 0)
    )).sort((a, b) => a - b);

    if (indexes.length < targetRestDays) return false;

    for (let index = 0; index <= indexes.length - targetRestDays; index++) {
        const startIndex = indexes[index];
        let isBlock = true;
        for (let offset = 1; offset < targetRestDays; offset++) {
            if (!indexes.includes(startIndex + offset)) {
                isBlock = false;
                break;
            }
        }
        if (isBlock) return true;
    }

    return false;
};

const getRestLoad = (restLoadByDay: Map<string, number>, day: string) => restLoadByDay.get(day) ?? 0;

const getDepotRestDistributionScore = (candidateRestDays: string[], restLoadByDay: Map<string, number>, openDays: string[]) => {
    const candidateSet = new Set(candidateRestDays);
    const simulatedLoads = openDays.map(day => getRestLoad(restLoadByDay, day) + (candidateSet.has(day) ? 1 : 0));
    const maxLoad = simulatedLoads.length > 0 ? Math.max(...simulatedLoads) : 0;
    const minLoad = simulatedLoads.length > 0 ? Math.min(...simulatedLoads) : 0;
    const squareLoad = simulatedLoads.reduce((total, load) => total + load * load, 0);
    const selectedLoad = candidateRestDays.reduce((total, day) => total + getRestLoad(restLoadByDay, day), 0);
    return maxLoad * 100000 + (maxLoad - minLoad) * 10000 + squareLoad * 1000 + selectedLoad * 100;
};

const getBalancedDepotRestDays = (
    empAssignments: any[],
    openDays: string[],
    targetRestDays: number,
    restLoadByDay: Map<string, number>,
    consecutiveRestDays: boolean,
    runSeed: number,
    employeeId: string
) => {
    const lockedRestDays = empAssignments
        .filter((assignment: any) => assignment.isLocked && assignment.type === 'IZIN' && openDays.includes(assignment.day))
        .map((assignment: any) => assignment.day);
    const lockedRestSet = new Set(lockedRestDays);
    const availableUnlockedDays = empAssignments
        .filter((assignment: any) => !assignment.isLocked && openDays.includes(assignment.day))
        .map((assignment: any) => assignment.day);
    const neededRestDays = Math.max(0, targetRestDays - lockedRestSet.size);

    if (neededRestDays <= 0) return lockedRestSet;

    const combinations = getDayCombinations(availableUnlockedDays, neededRestDays);
    const fallbackCombination = [...availableUnlockedDays]
        .sort((firstDay, secondDay) => getRestLoad(restLoadByDay, firstDay) - getRestLoad(restLoadByDay, secondDay))
        .slice(0, neededRestDays);
    const baseCandidates = combinations.length > 0 ? combinations : [fallbackCombination];
    const consecutiveCandidates = consecutiveRestDays
        ? baseCandidates.filter(candidate => isConsecutiveRestBlock([...lockedRestSet, ...candidate], openDays, targetRestDays))
        : [];
    const candidates = consecutiveRestDays && consecutiveCandidates.length > 0 ? consecutiveCandidates : baseCandidates;

    let bestCandidate = candidates[0] || [];
    let bestScore = Number.POSITIVE_INFINITY;

    candidates.forEach(candidate => {
        const consecutivePenalty = consecutiveRestDays && !isConsecutiveRestBlock([...lockedRestSet, ...candidate], openDays, targetRestDays)
            ? 100000000
            : 0;
        const tieBreaker = getSeededTieBreaker(runSeed, employeeId, candidate.join('|'));
        const score = getDepotRestDistributionScore(candidate, restLoadByDay, openDays) + consecutivePenalty + tieBreaker;
        if (score < bestScore) {
            bestScore = score;
            bestCandidate = candidate;
        }
    });

    return new Set([...lockedRestSet, ...bestCandidate]);
};

const getDepotRestBalanceLimits = (employeeCount: number, openDayCount: number) => {
    const totalRestTarget = employeeCount * getDepotTargetRestDays(openDayCount);
    if (openDayCount <= 0) return { totalRestTarget, minRestPerDay: 0, maxRestPerDay: 0, idealRestPerDay: 0 };

    return {
        totalRestTarget,
        minRestPerDay: Math.floor(totalRestTarget / openDayCount),
        maxRestPerDay: Math.ceil(totalRestTarget / openDayCount),
        idealRestPerDay: totalRestTarget / openDayCount
    };
};

self.addEventListener("message", (event: MessageEvent<any>) => {
    const { employees, assignments, presets, days, operationMode = 'MAGAZA', magazaRuleSettings, depotRuleSettings, closedDays, optimizationRunId = Date.now() } = event.data;
    const safeAssignments = assignments || [];
    const runSeed = getHashSeed(optimizationRunId, Date.now());

    if (!employees || employees.length === 0) { 
        self.postMessage(safeAssignments); 
        return; 
    }

    const mode = operationMode as Mode;
    const storeRules = normalizeMagazaRuleSettings(magazaRuleSettings);
    const depotRules = normalizeDepotRuleSettings(depotRuleSettings);
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
        const restLoadByDay = new Map<string, number>(openDays.map(day => [day, 0] as [string, number]));
        currentAssignments.forEach((assignment: any) => {
            if (!closedDaySet.has(assignment.day) && assignment.isLocked && assignment.type === 'IZIN') {
                restLoadByDay.set(assignment.day, getRestLoad(restLoadByDay, assignment.day) + 1);
            }
        });

        const employeeIndexById = new Map<string, number>(employees.map((emp: any, index: number) => [emp.id, index] as [string, number]));
        const depotEmployeeOrder = seededShuffle<any>(employees, getHashSeed(runSeed, 'depot-employee-order'));

        depotEmployeeOrder.forEach((emp: any) => {
            const employeeIndex = employeeIndexById.get(emp.id) ?? 0;
            const empAssignments = currentAssignments.filter((a: any) => a.employeeId === emp.id && !closedDaySet.has(a.day));
            const unlocked = empAssignments.filter((a: any) => !a.isLocked);
            const preferredType = getEmployeeDepotShiftType(emp, employeeIndex);
            const targetRestDays = getDepotTargetRestDays(openDays.length);
            const restDaySet = getBalancedDepotRestDays(empAssignments, openDays, targetRestDays, restLoadByDay, depotRules.consecutiveRestDays, runSeed, emp.id);
            const lockedRestDays = new Set(empAssignments
                .filter((assignment: any) => assignment.isLocked && assignment.type === 'IZIN' && openDays.includes(assignment.day))
                .map((assignment: any) => assignment.day)
            );

            unlocked.forEach((assignment: any) => {
                const type = restDaySet.has(assignment.day) ? 'IZIN' : preferredType;
                if (type === 'IZIN') {
                    assignment.type = type;
                    assignment.startTime = '';
                    assignment.endTime = '';
                    if (!lockedRestDays.has(assignment.day)) {
                        restLoadByDay.set(assignment.day, getRestLoad(restLoadByDay, assignment.day) + 1);
                    }
                } else {
                    assignFromPreset(assignment, type, presets);
                }
            });
        });

        const depotRestBalanceLimits = getDepotRestBalanceLimits(employees.length, openDays.length);

        const calculateDepotCost = (state: any[]) => {
            let cost = 0;
            employees.forEach((emp: any, employeeIndex: number) => {
                const preferredType = getEmployeeDepotShiftType(emp, employeeIndex);
                const empAssigns = state.filter(a => a.employeeId === emp.id && !closedDaySet.has(a.day));
                const workAssigns = empAssigns.filter(a => isDepotWorkType(a.type));
                const restAssigns = empAssigns.filter(a => a.type === 'IZIN');
                const targetWorkDays = getDepotTargetWorkDays(openDays.length);
                const targetRestDays = getDepotTargetRestDays(openDays.length);
                const wrongUnlockedTypeCount = workAssigns.filter(a => !a.isLocked && isDepotAutoWorkType(a.type) && a.type !== preferredType).length;

                if (workAssigns.length !== targetWorkDays) cost += Math.abs(targetWorkDays - workAssigns.length) * 100000;
                if (restAssigns.length !== targetRestDays) cost += Math.abs(targetRestDays - restAssigns.length) * 100000;
                if (wrongUnlockedTypeCount > 0) cost += wrongUnlockedTypeCount * 500000;
                if (depotRules.consecutiveRestDays) {
                    cost += getDepotRestDayRunPenalty(state, emp.id, openDays) * 5000000;
                }
            });

            openDays.forEach(day => {
                const dayAssigns = state.filter(a => a.day === day && isDepotWorkType(a.type));
                const dayRestCount = state.filter(a => a.day === day && a.type === 'IZIN').length;
                const dayWorkers = dayAssigns.filter(a => a.type === 'GUNDUZ').length;
                const nightWorkers = dayAssigns.filter(a => a.type === 'GECE').length;

                if (dayAssigns.length === 0) cost += 50000;
                if (dayRestCount > depotRestBalanceLimits.maxRestPerDay) cost += (dayRestCount - depotRestBalanceLimits.maxRestPerDay) * 900000;
                if (dayRestCount < depotRestBalanceLimits.minRestPerDay) cost += (depotRestBalanceLimits.minRestPerDay - dayRestCount) * 350000;
                cost += Math.pow(dayRestCount - depotRestBalanceLimits.idealRestPerDay, 2) * 25000;
                cost += Math.abs(dayWorkers - nightWorkers) * 500;
            });
            return cost;
        };

        const hasConsecutiveRestViolation = (state: any[]) => depotRules.consecutiveRestDays && employees.some((emp: any) => {
            const targetRestDays = getDepotTargetRestDays(openDays.length);
            if (targetRestDays <= 1) return false;
            const restDays = state
                .filter((assignment: any) => assignment.employeeId === emp.id && !closedDaySet.has(assignment.day) && assignment.type === 'IZIN')
                .map((assignment: any) => assignment.day);

            return restDays.length >= targetRestDays && !isConsecutiveRestBlock(restDays, openDays, targetRestDays);
        });

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

            if (hasConsecutiveRestViolation(neighbor)) {
                temperature *= 0.999;
                continue;
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
        pool = seededShuffle(pool.slice(0, unlocked.length), getHashSeed(runSeed, emp.id, 'magaza-pool'));

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
