export type ShiftType = 'SABAH' | 'AKSAM' | 'FULL' | 'IZIN' | 'GUNDUZ' | 'GECE' | 'ARACI' | 'BOS';

type Mode = 'MAGAZA' | 'DEPO';
type DepotShiftType = 'GUNDUZ' | 'GECE';

const getMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const assignFromPreset = (assignment: any, type: string, presets: any) => {
    const preset = presets?.[type];
    assignment.type = type;
    assignment.startTime = preset?.startTime || '';
    assignment.endTime = preset?.endTime || '';
};

const isDepotAutoWorkType = (type: string) => type === 'GUNDUZ' || type === 'GECE';
const isDepotWorkType = (type: string) => type === 'GUNDUZ' || type === 'GECE' || type === 'ARACI';
const getFallbackDepotShiftType = (index: number): DepotShiftType => index % 2 === 0 ? 'GUNDUZ' : 'GECE';
const getEmployeeDepotShiftType = (employee: any, index: number): DepotShiftType => {
    return employee?.depotShiftType === 'GECE' ? 'GECE' : employee?.depotShiftType === 'GUNDUZ' ? 'GUNDUZ' : getFallbackDepotShiftType(index);
};

self.addEventListener("message", (event: MessageEvent<any>) => {
    const { employees, assignments, presets, days, operationMode = 'MAGAZA' } = event.data;
    const safeAssignments = assignments || [];

    if (!employees || employees.length === 0) { 
        self.postMessage(safeAssignments); 
        return; 
    }

    const mode = operationMode as Mode;
    const DAYS = days as string[];
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

    if (mode === 'DEPO') {
        employees.forEach((emp: any, employeeIndex: number) => {
            const empAssignments = currentAssignments.filter((a: any) => a.employeeId === emp.id);
            const locked = empAssignments.filter((a: any) => a.isLocked);
            const unlocked = empAssignments.filter((a: any) => !a.isLocked);
            const preferredType = getEmployeeDepotShiftType(emp, employeeIndex);
            const lockedWorkDays = locked.filter((a: any) => isDepotWorkType(a.type)).length;
            const workSlots = Math.max(0, 5 - lockedWorkDays);

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
                const empAssigns = state.filter(a => a.employeeId === emp.id);
                const workAssigns = empAssigns.filter(a => isDepotWorkType(a.type));
                const wrongUnlockedTypeCount = workAssigns.filter(a => !a.isLocked && isDepotAutoWorkType(a.type) && a.type !== preferredType).length;

                if (workAssigns.length !== 5) cost += Math.abs(5 - workAssigns.length) * 100000;
                if (wrongUnlockedTypeCount > 0) cost += wrongUnlockedTypeCount * 500000;
            });

            DAYS.forEach(day => {
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
            const empAssigns = neighbor.filter((a:any) => a.employeeId === randomEmp && !a.isLocked);

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

        self.postMessage(bestState);
        return;
    }

    employees.forEach((emp: any) => {
        let empAssignments = currentAssignments.filter((a: any) => a.employeeId === emp.id);
        const locked = empAssignments.filter((a: any) => a.isLocked);
        const unlocked = empAssignments.filter((a: any) => !a.isLocked);
        let targets: Record<string, number> = { IZIN: 1, FULL: 1, SABAH: 2, AKSAM: 3 };
        locked.forEach((a: any) => {
            if (targets[a.type] !== undefined) targets[a.type]--;
        });

        let pool: string[] = [];
        for(let i=0; i < Math.max(0, targets.IZIN); i++) pool.push('IZIN');
        for(let i=0; i < Math.max(0, targets.FULL); i++) pool.push('FULL');
        for(let i=0; i < Math.max(0, targets.SABAH); i++) pool.push('SABAH');
        for(let i=0; i < Math.max(0, targets.AKSAM); i++) pool.push('AKSAM');
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
        DAYS.forEach((day, dayIndex) => {
            const dayAssigns = state.filter(a => a.day === day && a.type !== 'IZIN' && a.type !== 'BOS');
            const izinAssigns = state.filter(a => a.day === day && a.type === 'IZIN');
            if (dayAssigns.length === 0) cost += 10000000;
            else {
                const openers = dayAssigns.filter(a => getMinutes(a.startTime) <= 9 * 60).length;
                if (openers !== 2) cost += Math.abs(2 - openers) * 100000; 
                const closers = dayAssigns.filter(a => getMinutes(a.endTime) >= 20 * 60 + 30).length;
                if (closers < 3) cost += (3 - closers) * 100000;
                else cost -= (closers - 3) * 5000;
            }
            if (izinAssigns.length > 1) cost += (izinAssigns.length - 1) * 200000; 
            if (dayIndex < DAYS.length - 1) {
                const nextDay = DAYS[dayIndex + 1];
                dayAssigns.forEach(a => {
                    if (getMinutes(a.endTime) >= 21 * 60) { 
                        const nextAssign = state.find(n => n.employeeId === a.employeeId && n.day === nextDay);
                        if (nextAssign && nextAssign.type !== 'IZIN' && nextAssign.type !== 'BOS' && getMinutes(nextAssign.startTime) <= 9 * 60) cost += 200000; 
                    }
                });
            }
        });

        employees.forEach((emp: any) => {
            const empAssigns = state.filter(a => a.employeeId === emp.id);
            const izinCount = empAssigns.filter(a => a.type === 'IZIN').length;
            const fullCount = empAssigns.filter(a => a.type === 'FULL').length;
            const sabahCount = empAssigns.filter(a => a.type === 'SABAH').length;
            if (izinCount !== 1) cost += Math.abs(1 - izinCount) * 500000;
            if (fullCount !== 1) cost += Math.abs(1 - fullCount) * 500000;
            if (sabahCount > 2) cost += (sabahCount - 2) * 50000;
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
        const empAssigns = neighbor.filter((a:any) => a.employeeId === randomEmp && !a.isLocked);

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
    self.postMessage(bestState);
});
