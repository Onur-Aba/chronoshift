import type { DepotWeekSelection } from '@/types';

export const DEPOT_DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'] as const;

export const TURKISH_MONTH_NAMES = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık'
];

const cloneDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
    const nextDate = cloneDate(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

const getMondayStart = (date: Date) => {
    const normalizedDate = cloneDate(date);
    const mondayIndex = (normalizedDate.getDay() + 6) % 7;
    normalizedDate.setDate(normalizedDate.getDate() - mondayIndex);
    return normalizedDate;
};

const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${date.getFullYear()}`;
};

const formatShortDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
};

export const parseDateKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
};

export const getMonthName = (month: number) => TURKISH_MONTH_NAMES[month - 1] ?? String(month);

export const buildDepotWeekSelection = (year: number, month: number, week: number, startDate: Date): DepotWeekSelection => {
    const endDate = addDays(startDate, 6);
    const dayDates = DEPOT_DAY_NAMES.reduce<Record<string, string>>((acc, dayName, index) => {
        acc[dayName] = formatDate(addDays(startDate, index));
        return acc;
    }, {});

    return {
        year,
        month,
        week,
        key: `${year}-${String(month).padStart(2, '0')}-W${String(week).padStart(2, '0')}`,
        startDate: toDateKey(startDate),
        endDate: toDateKey(endDate),
        label: `${getMonthName(month)} ${year} · ${week}. Hafta`,
        rangeLabel: `${formatDate(startDate)} - ${formatDate(endDate)}`,
        shortRangeLabel: `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`,
        dayDates,
    };
};

export const getDepotWeekOptions = (year: number, month: number): DepotWeekSelection[] => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    let cursor = getMondayStart(firstDayOfMonth);
    const options: DepotWeekSelection[] = [];
    let week = 1;

    while (cursor <= lastDayOfMonth) {
        options.push(buildDepotWeekSelection(year, month, week, cursor));
        cursor = addDays(cursor, 7);
        week++;
    }

    return options;
};

export const getDepotWeekSelection = (year: number, month: number, week: number): DepotWeekSelection => {
    const options = getDepotWeekOptions(year, month);
    return options.find(option => option.week === week) ?? options[0] ?? buildDepotWeekSelection(year, month, 1, getMondayStart(new Date(year, month - 1, 1)));
};

export const getCurrentDepotWeekSelection = (date = new Date()): DepotWeekSelection => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const options = getDepotWeekOptions(year, month);
    const currentMonday = toDateKey(getMondayStart(date));
    return options.find(option => option.startDate === currentMonday) ?? options[0];
};

export const getPreviousDepotWeekSelection = (selection: DepotWeekSelection): DepotWeekSelection => {
    const previousStartDate = addDays(parseDateKey(selection.startDate), -7);
    const previousYear = previousStartDate.getFullYear();
    const previousMonth = previousStartDate.getMonth() + 1;
    const previousOptions = getDepotWeekOptions(previousYear, previousMonth);
    return previousOptions.find(option => option.startDate === toDateKey(previousStartDate))
        ?? buildDepotWeekSelection(previousYear, previousMonth, previousOptions.length + 1, previousStartDate);
};

export const normalizeDepotWeekSelection = (selection: Partial<DepotWeekSelection> | null | undefined, fallbackDate = new Date()): DepotWeekSelection => {
    if (!selection || typeof selection !== 'object') return getCurrentDepotWeekSelection(fallbackDate);

    const year = Number(selection.year);
    const month = Number(selection.month);
    const week = Number(selection.week);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(week)) {
        return getCurrentDepotWeekSelection(fallbackDate);
    }

    return getDepotWeekSelection(year, month, week);
};
