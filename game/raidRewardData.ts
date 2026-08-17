import type { DungeonId } from './dungeonData';

export type RaidRewardLedger = Partial<Record<DungeonId, string>>;

export function canClaimRaidReward(
  ledger: RaidRewardLedger,
  dungeonId: DungeonId,
  cycleKey: string,
) {
  return ledger[dungeonId] !== cycleKey;
}

export function recordRaidReward(
  ledger: RaidRewardLedger,
  dungeonId: DungeonId,
  cycleKey: string,
): RaidRewardLedger {
  return canClaimRaidReward(ledger, dungeonId, cycleKey)
    ? { ...ledger, [dungeonId]: cycleKey }
    : ledger;
}
