import type { Assignment, Employee, DepotMonthReport, DepotEmployeeMonthSummary } from '@/types';

const WEEKEND_DAYS = ['Cumartesi', 'Pazar'];

/** Haftalık plan gün adları */
const isWeekend = (day: string): boolean => WEEKEND_DAYS.includes(day);

const isWork = (type: string) => type === 'GUNDUZ' || type === 'GECE' || type === 'ARACI';

export type DepotReportAssignmentEntry = {
    employeeId: string;
    day: string;
    dateKey: string;
    type: string;
};

const parseDateKeyToTime = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1).getTime();
};

const getDateDiffInDays = (previousDateKey: string, currentDateKey: string) => {
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.round((parseDateKeyToTime(currentDateKey) - parseDateKeyToTime(previousDateKey)) / dayMs);
};

/** Üst üste çalışma serisini hesapla */
export const calcMaxConsecutiveWork = (
    assignments: Assignment[],
    employeeId: string,
    days: string[],
    previousStreak = 0
): number => {
    const empMap = new Map(
        assignments.filter(a => a.employeeId === employeeId).map(a => [a.day, a])
    );
    let maxRun = 0;
    let currentRun = previousStreak;

    for (const day of days) {
        const a = empMap.get(day);
        if (a && isWork(a.type)) {
            currentRun++;
            maxRun = Math.max(maxRun, currentRun);
        } else {
            currentRun = 0;
        }
    }
    return maxRun;
};

/** Ay sonu serisi (ay geçişi için saklanır) */
export const calcEndingWorkStreak = (
    assignments: Assignment[],
    employeeId: string,
    days: string[]
): number => {
    const empMap = new Map(
        assignments.filter(a => a.employeeId === employeeId).map(a => [a.day, a])
    );
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
        const a = empMap.get(days[i]);
        if (a && isWork(a.type)) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
};

const calcDateBasedMaxConsecutiveWork = (entries: DepotReportAssignmentEntry[], employeeId: string): number => {
    const empEntries = entries
        .filter(entry => entry.employeeId === employeeId)
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    let maxRun = 0;
    let currentRun = 0;
    let previousDateKey: string | null = null;

    empEntries.forEach(entry => {
        const isNextCalendarDay = previousDateKey ? getDateDiffInDays(previousDateKey, entry.dateKey) === 1 : true;
        if (!isNextCalendarDay) currentRun = 0;

        if (isWork(entry.type)) {
            currentRun += 1;
            maxRun = Math.max(maxRun, currentRun);
        } else {
            currentRun = 0;
        }

        previousDateKey = entry.dateKey;
    });

    return maxRun;
};

/** Tarih bazlı depo raporu üret. Haftalar arası maksimum seri hesabında gerçek tarihleri kullanır. */
export const generateDepotDateRangeReport = (
    employees: Employee[],
    entries: DepotReportAssignmentEntry[],
    maxConsecutiveWorkDays = 6
): DepotMonthReport[] => {
    return employees.map(emp => {
        const empEntries = entries.filter(entry => entry.employeeId === emp.id);
        const dayShiftCount = empEntries.filter(entry => entry.type === 'GUNDUZ').length;
        const nightShiftCount = empEntries.filter(entry => entry.type === 'GECE').length;
        const offDayCount = empEntries.filter(entry => entry.type === 'IZIN').length;

        const weekendOff = empEntries.filter(entry => isWeekend(entry.day) && entry.type === 'IZIN').length;
        const saturdayWorked = empEntries.filter(entry => entry.day === 'Cumartesi' && isWork(entry.type)).length;
        const sundayWorked = empEntries.filter(entry => entry.day === 'Pazar' && isWork(entry.type)).length;
        const maxConsec = calcDateBasedMaxConsecutiveWork(entries, emp.id);

        const warnings: string[] = [];
        if (maxConsecutiveWorkDays > 0 && maxConsec > maxConsecutiveWorkDays) warnings.push(`${maxConsec} gün üst üste çalışma!`);
        if (empEntries.length > 0 && weekendOff === 0) warnings.push('Hiç hafta sonu izni yok');
        if (emp.depotShiftType === 'GECE' && dayShiftCount > nightShiftCount + 2) warnings.push('Gece sayısı az');
        if (emp.depotShiftType === 'GUNDUZ' && nightShiftCount > dayShiftCount + 2) warnings.push('Gündüz sayısı az');

        return {
            employeeId: emp.id,
            employeeName: emp.name,
            dayShiftCount,
            nightShiftCount,
            offDayCount,
            weekendOffCount: weekendOff,
            saturdayWorkedCount: saturdayWorked,
            sundayWorkedCount: sundayWorked,
            maxConsecutiveWork: maxConsec,
            warnings,
        };
    });
};

/** Depo raporu üret */
export const generateDepotMonthReport = (
    employees: Employee[],
    assignments: Assignment[],
    days: string[],
    closedDays: string[],
    previousSummaries: DepotEmployeeMonthSummary[] = []
): DepotMonthReport[] => {
    const closedSet = new Set(closedDays);
    const openDays = days.filter(d => !closedSet.has(d));

    return employees.map(emp => {
        const prevSummary = previousSummaries.find(s => s.employeeId === emp.id);
        const prevStreak = prevSummary?.endingWorkStreak ?? (emp.previousMonthWorkStreak ?? 0);

        const empAssigns = assignments.filter(a => a.employeeId === emp.id && !closedSet.has(a.day));

        const dayShiftCount = empAssigns.filter(a => a.type === 'GUNDUZ').length;
        const nightShiftCount = empAssigns.filter(a => a.type === 'GECE').length;
        const offDayCount = empAssigns.filter(a => a.type === 'IZIN').length;

        const weekendOff = empAssigns.filter(a => isWeekend(a.day) && a.type === 'IZIN').length;
        const saturdayWorked = empAssigns.filter(a => a.day === 'Cumartesi' && isWork(a.type)).length;
        const sundayWorked = empAssigns.filter(a => a.day === 'Pazar' && isWork(a.type)).length;

        const maxConsec = calcMaxConsecutiveWork(assignments, emp.id, openDays, prevStreak);

        const warnings: string[] = [];
        if (maxConsec > 6) warnings.push(`${maxConsec} gün üst üste çalışma!`);
        if (weekendOff === 0) warnings.push('Hiç hafta sonu izni yok');
        if (emp.depotShiftType === 'GECE' && dayShiftCount > nightShiftCount + 2) warnings.push('Gece sayısı az');
        if (emp.depotShiftType === 'GUNDUZ' && nightShiftCount > dayShiftCount + 2) warnings.push('Gündüz sayısı az');

        return {
            employeeId: emp.id,
            employeeName: emp.name,
            dayShiftCount,
            nightShiftCount,
            offDayCount,
            weekendOffCount: weekendOff,
            saturdayWorkedCount: saturdayWorked,
            sundayWorkedCount: sundayWorked,
            maxConsecutiveWork: maxConsec,
            warnings,
        };
    });
};

/** Personel bazlı hafta sonu özeti üret (arşiv için) */
export const generateEmployeeSummaries = (
    employees: Employee[],
    assignments: Assignment[],
    days: string[],
    closedDays: string[],
    year: number,
    month: number
): DepotEmployeeMonthSummary[] => {
    const closedSet = new Set(closedDays);
    const openDays = days.filter(d => !closedSet.has(d));

    return employees.map(emp => {
        const empAssigns = assignments.filter(a => a.employeeId === emp.id && !closedSet.has(a.day));
        const lastAssign = [...openDays]
            .reverse()
            .map(day => empAssigns.find(a => a.day === day))
            .find((assignment): assignment is Assignment => Boolean(assignment)) ?? null;
        const endingType = lastAssign ? (
            lastAssign.type === 'GUNDUZ' ? 'GUNDUZ' :
            lastAssign.type === 'GECE' ? 'GECE' :
            lastAssign.type === 'IZIN' ? 'IZIN' : null
        ) : null;

        return {
            employeeId: emp.id,
            year,
            month,
            endingWorkStreak: calcEndingWorkStreak(assignments, emp.id, openDays),
            endingShiftType: endingType as any,
            dayShiftCount: empAssigns.filter(a => a.type === 'GUNDUZ').length,
            nightShiftCount: empAssigns.filter(a => a.type === 'GECE').length,
            offDayCount: empAssigns.filter(a => a.type === 'IZIN').length,
            weekendOffCount: empAssigns.filter(a => isWeekend(a.day) && a.type === 'IZIN').length,
            maxConsecutiveWork: calcMaxConsecutiveWork(assignments, emp.id, openDays, emp.previousMonthWorkStreak ?? 0),
        };
    });
};
