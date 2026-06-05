import type { DepotRuleSettings } from '@/types';

export const DEFAULT_DEPOT_RULE_SETTINGS: DepotRuleSettings = {
    consecutiveRestDays: true,
    maxConsecutiveWorkDays: 6,
    requireOffBeforeDayToNight: true,
    balanceWeekends: true,
    balanceDayNight: true,
    avoidSameDayCrowding: true,
};
