import type { DepotMonthArchive, DepotWeekArchive, DepotWeekSelection, Employee, Assignment, DepotEmployeeMonthSummary } from '@/types';
import { getDepotWeekSelection, getPreviousDepotWeekSelection } from './depotWeek';

const ARCHIVE_PREFIX = 'depot-archive-';
const WEEK_ARCHIVE_PREFIX = 'depot-week-archive-';
const DEPOT_WEEK_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const isBrowserStorageAvailable = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/** Eski arşiv anahtarı: "depot-archive-YYYY-MM" */
const archiveKey = (year: number, month: number) =>
    `${ARCHIVE_PREFIX}${year}-${String(month).padStart(2, '0')}`;

/** Haftalık arşiv anahtarı: "depot-week-archive-YYYY-MM-W##" */
const weekArchiveKey = (selection: Pick<DepotWeekSelection, 'key'>) => `${WEEK_ARCHIVE_PREFIX}${selection.key}`;

const getWeekArchiveSortValue = (archive: Partial<DepotWeekArchive>) => {
    if (typeof archive.startDate === 'string' && archive.startDate.length > 0) return archive.startDate;
    if (typeof archive.key === 'string' && archive.key.length > 0) return archive.key;
    return `${archive.year ?? 0}-${String(archive.month ?? 0).padStart(2, '0')}-W${String(archive.week ?? 0).padStart(2, '0')}`;
};

const sortWeekArchives = (archives: DepotWeekArchive[]) => archives.sort((a, b) => {
    const startCompare = getWeekArchiveSortValue(a).localeCompare(getWeekArchiveSortValue(b));
    if (startCompare !== 0) return startCompare;
    return String(a.key ?? '').localeCompare(String(b.key ?? ''));
});

const normalizeDepotWeekArchive = (archive: Partial<DepotWeekArchive> | null | undefined, storageKey?: string): DepotWeekArchive | null => {
    if (!archive || typeof archive !== 'object') return null;

    const keyFromStorage = storageKey?.startsWith(WEEK_ARCHIVE_PREFIX)
        ? storageKey.slice(WEEK_ARCHIVE_PREFIX.length)
        : undefined;
    const key = typeof archive.key === 'string' && archive.key.length > 0 ? archive.key : keyFromStorage;
    const keyParts = key?.match(/^(\d{4})-(\d{2})-W(\d{2})$/);

    const year = Number.isFinite(archive.year) ? Number(archive.year) : Number(keyParts?.[1]);
    const month = Number.isFinite(archive.month) ? Number(archive.month) : Number(keyParts?.[2]);
    const week = Number.isFinite(archive.week) ? Number(archive.week) : Number(keyParts?.[3]);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(week)) return null;

    const selection = getDepotWeekSelection(year, month, week);

    return {
        ...selection,
        ...archive,
        year,
        month,
        week,
        key: key ?? selection.key,
        startDate: typeof archive.startDate === 'string' && archive.startDate.length > 0 ? archive.startDate : selection.startDate,
        endDate: typeof archive.endDate === 'string' && archive.endDate.length > 0 ? archive.endDate : selection.endDate,
        label: typeof archive.label === 'string' && archive.label.length > 0 ? archive.label : selection.label,
        rangeLabel: typeof archive.rangeLabel === 'string' && archive.rangeLabel.length > 0 ? archive.rangeLabel : selection.rangeLabel,
        shortRangeLabel: typeof archive.shortRangeLabel === 'string' && archive.shortRangeLabel.length > 0 ? archive.shortRangeLabel : selection.shortRangeLabel,
        dayDates: archive.dayDates && typeof archive.dayDates === 'object' ? archive.dayDates : selection.dayDates,
        assignments: Array.isArray(archive.assignments) ? archive.assignments : [],
        employees: Array.isArray(archive.employees) ? archive.employees : [],
        summaries: Array.isArray(archive.summaries) ? archive.summaries : [],
        closedDays: Array.isArray(archive.closedDays) ? archive.closedDays : [],
        savedAt: typeof archive.savedAt === 'string' && archive.savedAt.length > 0 ? archive.savedAt : new Date(0).toISOString(),
    };
};

/** Eski depo ayını localStorage'a kaydet — geriye dönük uyumluluk için korunur */
export const saveDepotMonthArchive = (
    year: number,
    month: number,
    assignments: Assignment[],
    employees: Employee[],
    summaries: DepotEmployeeMonthSummary[]
): void => {
    if (!isBrowserStorageAvailable()) return;

    const key = archiveKey(year, month);
    const archive: DepotMonthArchive = {
        year,
        month,
        key: `${year}-${String(month).padStart(2, '0')}`,
        assignments,
        employees,
        summaries,
        savedAt: new Date().toISOString(),
    };
    try {
        localStorage.setItem(key, JSON.stringify(archive));
    } catch {
        // localStorage dolu olabilir; sessizce geç
    }
};

/** Seçili depo haftasını localStorage'a kaydet */
export const saveDepotWeekArchive = (
    selection: DepotWeekSelection,
    assignments: Assignment[],
    employees: Employee[],
    summaries: DepotEmployeeMonthSummary[],
    closedDays: string[] = []
): void => {
    if (!isBrowserStorageAvailable()) return;

    const archive: DepotWeekArchive = {
        ...selection,
        assignments,
        employees,
        summaries,
        closedDays,
        savedAt: new Date().toISOString(),
    };

    try {
        localStorage.setItem(weekArchiveKey(selection), JSON.stringify(archive));
    } catch {
        // localStorage dolu olabilir; sessizce geç
    }
};

/** Belirli ayın eski arşivini oku */
export const loadDepotMonthArchive = (year: number, month: number): DepotMonthArchive | null => {
    if (!isBrowserStorageAvailable()) return null;

    try {
        const raw = localStorage.getItem(archiveKey(year, month));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

/** Belirli haftanın arşivini oku */
export const loadDepotWeekArchive = (selection: DepotWeekSelection): DepotWeekArchive | null => {
    if (!isBrowserStorageAvailable()) return null;

    try {
        const storageKey = weekArchiveKey(selection);
        const raw = localStorage.getItem(storageKey);
        return raw ? normalizeDepotWeekArchive(JSON.parse(raw), storageKey) : null;
    } catch {
        return null;
    }
};

/** Seçili hafta için arşiv var mı? */
export const hasDepotWeekArchive = (selection: DepotWeekSelection): boolean => Boolean(loadDepotWeekArchive(selection));

/** Belirli haftalık depo arşivini sil */
export const deleteDepotWeekArchive = (selectionOrKey: DepotWeekSelection | string): boolean => {
    if (!isBrowserStorageAvailable()) return false;

    const key = typeof selectionOrKey === 'string' ? selectionOrKey : selectionOrKey.key;
    try {
        localStorage.removeItem(`${WEEK_ARCHIVE_PREFIX}${key}`);
        return true;
    } catch {
        return false;
    }
};

/** Bir önceki ayın özetlerini getir — eski aylık arşivler için korunur */
export const loadPreviousMonthSummaries = (
    year: number,
    month: number
): DepotEmployeeMonthSummary[] => {
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear--;
    }
    return loadDepotMonthArchive(prevYear, prevMonth)?.summaries ?? [];
};

/** Bir önceki haftanın arşivini getir */
export const loadPreviousDepotWeekArchive = (selection: DepotWeekSelection): DepotWeekArchive | null => {
    return loadDepotWeekArchive(getPreviousDepotWeekSelection(selection));
};

const isDepotWorkType = (type: string) => type === 'GUNDUZ' || type === 'GECE' || type === 'ARACI';
const toDepotShiftType = (type: unknown): 'GUNDUZ' | 'GECE' | undefined => {
    if (type === 'GUNDUZ' || type === 'GECE') return type;
    return undefined;
};

const getArchiveAssignment = (archive: DepotWeekArchive, employeeId: string, day: string) => {
    return archive.assignments.find(assignment => assignment.employeeId === employeeId && assignment.day === day);
};

const getArchiveEndingWorkStreak = (archive: DepotWeekArchive, employeeId: string): number => {
    const closedDaySet = new Set(archive.closedDays ?? []);
    let streak = 0;

    for (let index = DEPOT_WEEK_DAYS.length - 1; index >= 0; index--) {
        const day = DEPOT_WEEK_DAYS[index];
        if (closedDaySet.has(day)) break;

        const assignment = getArchiveAssignment(archive, employeeId, day);
        if (assignment && isDepotWorkType(assignment.type)) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
};

const getPreviousArchiveShiftType = (archive: DepotWeekArchive, employeeId: string) => {
    const previousEmployee = archive.employees.find(prevEmployee => prevEmployee.id === employeeId);
    const savedProfileType = toDepotShiftType(previousEmployee?.depotShiftType);
    if (savedProfileType) return savedProfileType;

    for (let index = DEPOT_WEEK_DAYS.length - 1; index >= 0; index--) {
        const assignmentType = toDepotShiftType(getArchiveAssignment(archive, employeeId, DEPOT_WEEK_DAYS[index])?.type);
        if (assignmentType) return assignmentType;
    }

    return undefined;
};

export type DepotPreviousWeekRules = {
    /** Önceki hafta Pazar çalışıp bu hafta gündüz/gece profili değişenler */
    transitionOffEmployeeIds: string[];
    /** Önceki kayıtlı haftanın Pazar gününden geriye doğru çalışma serisi */
    previousWorkStreakByEmployeeId: Record<string, number>;
};

/**
 * Önceki kaydedilmiş hafta baz alınarak yeni haftanın sert depo kurallarını üretir.
 * - Pazar çalışıp gündüz/gece profili değişen kişi Pazartesi izin alır.
 * - Önceki haftanın sonundan gelen çalışma serisi 7 gün kuralına taşınır.
 */
export const getDepotPreviousWeekRules = (
    selection: DepotWeekSelection,
    currentEmployees: Employee[]
): DepotPreviousWeekRules => {
    const previousArchive = loadPreviousDepotWeekArchive(selection);
    if (!previousArchive) {
        return { transitionOffEmployeeIds: [], previousWorkStreakByEmployeeId: {} };
    }

    const transitionOffEmployeeIds: string[] = [];
    const previousWorkStreakByEmployeeId: Record<string, number> = {};

    currentEmployees.forEach(employee => {
        const previousStreak = getArchiveEndingWorkStreak(previousArchive, employee.id);
        if (previousStreak > 0) {
            previousWorkStreakByEmployeeId[employee.id] = previousStreak;
        }

        const previousSundayAssignment = getArchiveAssignment(previousArchive, employee.id, 'Pazar');
        const previousShiftType = getPreviousArchiveShiftType(previousArchive, employee.id);
        const currentShiftType = toDepotShiftType(employee.depotShiftType);

        if (
            previousSundayAssignment &&
            isDepotWorkType(previousSundayAssignment.type) &&
            previousShiftType &&
            currentShiftType &&
            previousShiftType !== currentShiftType
        ) {
            transitionOffEmployeeIds.push(employee.id);
        }
    });

    return { transitionOffEmployeeIds, previousWorkStreakByEmployeeId };
};

/**
 * Önceki kaydedilmiş haftada Pazar çalışan ve yeni haftada gündüz/gece profili değişen
 * personelleri döndürür. Bu kişilere Pazartesi zorunlu izin uygulanır.
 */
export const getDepotPreviousWeekTransitionOffEmployeeIds = (
    selection: DepotWeekSelection,
    currentEmployees: Employee[]
): string[] => getDepotPreviousWeekRules(selection, currentEmployees).transitionOffEmployeeIds;

/** Tüm eski aylık arşiv anahtarlarını listele */
export const listDepotArchiveKeys = (): string[] => {
    if (!isBrowserStorageAvailable()) return [];

    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(ARCHIVE_PREFIX)) keys.push(k);
    }
    return keys.sort();
};

/** Tüm haftalık arşiv anahtarlarını listele */
export const listDepotWeekArchiveKeys = (): string[] => {
    if (!isBrowserStorageAvailable()) return [];

    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(WEEK_ARCHIVE_PREFIX)) keys.push(k);
    }
    return keys.sort();
};

/** Tüm haftalık depo arşivlerini sırayla getir */
export const listDepotWeekArchives = (): DepotWeekArchive[] => {
    if (!isBrowserStorageAvailable()) return [];

    const archives: DepotWeekArchive[] = [];
    listDepotWeekArchiveKeys().forEach(k => {
        try {
            const raw = localStorage.getItem(k);
            const archive = raw ? normalizeDepotWeekArchive(JSON.parse(raw), k) : null;
            if (archive) archives.push(archive);
        } catch {
            // Bozuk kayıtları listeye dahil etme
        }
    });

    return sortWeekArchives(archives);
};

/** Seçili aydaki daha önceki haftalardan kaydı eksik olan ilk haftayı döndürür. */
export const getFirstMissingDepotWeekBefore = (selection: DepotWeekSelection): DepotWeekSelection | null => {
    if (selection.week <= 1) return null;

    for (let week = 1; week < selection.week; week++) {
        const previousSelection = getDepotWeekSelection(selection.year, selection.month, week);
        if (!loadDepotWeekArchive(previousSelection)) return previousSelection;
    }

    return null;
};

/** Depo haftaları arada boşluk bırakmadan oluşturulabilir. */
export const canCreateDepotWeekInSequence = (selection: DepotWeekSelection): boolean => {
    return getFirstMissingDepotWeekBefore(selection) === null;
};

/** Tüm depo arşivini JSON olarak dışa aktar */
export const exportAllDepotArchives = (): string => {
    const monthArchives: DepotMonthArchive[] = [];
    const weekArchives: DepotWeekArchive[] = [];

    listDepotArchiveKeys().forEach(k => {
        try {
            const raw = localStorage.getItem(k);
            if (raw) monthArchives.push(JSON.parse(raw));
        } catch {/* skip */}
    });

    listDepotWeekArchiveKeys().forEach(k => {
        try {
            const raw = localStorage.getItem(k);
            const archive = raw ? normalizeDepotWeekArchive(JSON.parse(raw), k) : null;
            if (archive) weekArchives.push(archive);
        } catch {/* skip */}
    });

    return JSON.stringify({ version: 3, type: 'depot-archive', weekArchives: sortWeekArchives(weekArchives), monthArchives }, null, 2);
};

/** JSON dosyasından depo arşivini içe aktar */
export const importDepotArchives = (json: string): { imported: number; errors: number } => {
    let imported = 0;
    let errors = 0;
    if (!isBrowserStorageAvailable()) return { imported, errors: 1 };

    try {
        const data = JSON.parse(json);
        const weekArchives: DepotWeekArchive[] = data.weekArchives ?? [];
        const monthArchives: DepotMonthArchive[] = data.monthArchives ?? data.archives ?? [];

        weekArchives.forEach(archive => {
            try {
                const normalizedArchive = normalizeDepotWeekArchive(archive);
                if (!normalizedArchive) {
                    errors++;
                    return;
                }
                localStorage.setItem(weekArchiveKey(normalizedArchive), JSON.stringify(normalizedArchive));
                imported++;
            } catch {
                errors++;
            }
        });

        monthArchives.forEach(archive => {
            try {
                const key = archiveKey(archive.year, archive.month);
                localStorage.setItem(key, JSON.stringify(archive));
                imported++;
            } catch {
                errors++;
            }
        });
    } catch {
        errors++;
    }
    return { imported, errors };
};
