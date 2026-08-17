import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

import {
  APPEARANCES,
  CLASS_SPRITES,
  getAvatarEvolution,
} from '../game/appearanceData';
import { FriendProfile } from '../data/socialData';
import {
  CLASS_COMBAT_KITS,
  CombatVfx,
  CoreCombatAction,
} from '../game/combatData';
import {
  getAbilityCooldown,
  getAbilityStagger,
  getActionStagger,
  getBossIntent,
  getBossPhase,
  getBossPhaseAttackMultiplier,
  getBossPhaseName,
  getComboMultiplier,
  getFocusCooldown,
  getPhaseBarrier,
  tickCooldowns,
} from '../game/combatBalance';
import {
  ClassCombatStatus,
  EMPTY_CLASS_STATUS,
  getClassMechanicName,
  resolveClassAction,
  tickClassStatusAfterBossTurn,
} from '../game/classCombatMechanics';
import {
  DUNGEONS,
  DungeonDefinition,
  DungeonId,
  DungeonRoom,
  getDungeon,
} from '../game/dungeonData';
import {
  DUNGEON_BOONS,
  DungeonBoon,
  getDungeonAffix,
} from '../game/dungeonModifiers';
import {
  CHARACTER_CLASSES,
  getEffectiveAttributePower,
  getLevelProgress,
} from '../game/gameData';
import { getEquippedGearSet } from '../game/gearData';
import { getRaidBoss, RaidBoss } from '../game/raidData';
import {
  getSkillBonuses,
  SkillNode,
  SKILL_TREES,
} from '../game/skillData';
import { useGame } from '../state/GameContext';
import { FEATURES } from '../config/features';
import { useAuth } from '../state/AuthContext';
import { useSocial } from '../state/SocialContext';
import {
  BATTLE_MUSIC,
  BOSS_MUSIC,
  DUNGEON_MUSIC,
  MusicTrackId,
} from '../game/musicData';
import { useMusic } from '../state/MusicContext';
import GameIcon from '../components/GameIcon';
import { useReducedMotion } from '../hooks/useReducedMotion';

type BattleOutcome = 'fighting' | 'victory' | 'defeat';
type DungeonRunPhase = 'selection' | 'room' | 'traveling' | 'complete';
type RaidBrowserMode = 'dungeons' | 'party-raids';

const PARTY_RAID_IDS: readonly DungeonId[] = [
  'tempest-depths',
  'lunar-hunt',
  'void-citadel',
];

type DungeonCombatant = RaidBoss & {
  isFinalBoss: boolean;
};

type FloatingText = {
  text: string;
  color: string;
};

type CombatEffect = {
  color: string;
  icon: string;
  kind: CombatVfx;
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function runAnimation(animation: Animated.CompositeAnimation) {
  return new Promise<void>((resolve) => {
    animation.start(() => resolve());
  });
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function getDungeonCombatant(
  dungeon: DungeonDefinition,
  room: DungeonRoom,
): DungeonCombatant {
  const finalBoss = getRaidBoss(dungeon.bossId);
  if (room.kind !== 'battle') {
    return { ...finalBoss, isFinalBoss: room.kind === 'boss' };
  }

  const spriteBoss = getRaidBoss(room.encounter.spriteBossId);
  return {
    ...finalBoss,
    id: spriteBoss.id,
    name: room.encounter.name,
    title: room.encounter.title,
    maxHp: Math.round(finalBoss.maxHp * room.encounter.hpMultiplier),
    attackMin: Math.round(finalBoss.attackMin * room.encounter.attackMultiplier),
    attackMax: Math.round(finalBoss.attackMax * room.encounter.attackMultiplier),
    rewardXp: 0,
    description: room.description,
    source: spriteBoss.source,
    isFinalBoss: false,
  };
}

export default function RaidScreen() {
  const reduceMotion = useReducedMotion();
  const {
    appearanceId,
    characterClass,
    characterName,
    claimRaidVictory,
    completedDungeonIds,
    equippedGearSetId,
    isRaidRewardAvailable,
    raidWins,
    markDungeonComplete,
    stats,
    totalXp,
    unlockedSkillIds,
  } = useGame();
  const { user } = useAuth();
  const {
    claimVerifiedRaidReward,
    createRaid,
    launchRaid,
    onlineRaid,
    party,
    performRaidAction,
    reportRaidResult,
    setRaidReady,
  } = useSocial();
  const { playTrack } = useMusic();
  const isFocused = useIsFocused();
  const [selectedDungeonId, setSelectedDungeonId] =
    useState<DungeonId>('ember-vault');
  const [roomIndex, setRoomIndex] = useState(0);
  const [runPhase, setRunPhase] =
    useState<DungeonRunPhase>('selection');
  const [browserMode, setBrowserMode] =
    useState<RaidBrowserMode>('dungeons');
  const [selectedPartyRaidId, setSelectedPartyRaidId] =
    useState<DungeonId>('tempest-depths');
  const [partyRaidActive, setPartyRaidActive] = useState(false);
  const [readyMemberIds, setReadyMemberIds] = useState<string[]>([]);
  const [readyCheckActive, setReadyCheckActive] = useState(false);
  const dungeon = getDungeon(selectedDungeonId);
  const dungeonAffix = getDungeonAffix(dungeon.id);
  const raidRewardAvailable = isRaidRewardAvailable(dungeon.id);
  const room = dungeon.rooms[roomIndex];
  const boss = getDungeonCombatant(dungeon, room);
  const partyMembers = party?.members.filter((member) => member.id !== user?.id) ?? [];
  const partyName = party?.name ?? null;
  const isPartyLeader = Boolean(party && user && party.ownerId === user.id);
  const isRaidHost = Boolean(onlineRaid && user && onlineRaid.hostId === user.id);
  const fullPartyOnline =
    Boolean(party) &&
    partyMembers.length === 3 &&
    partyMembers.every((friend) => friend.isOnline);
  const wholePartyReady =
    fullPartyOnline &&
    onlineRaid?.dungeonId === selectedPartyRaidId &&
    onlineRaid.participants.length === 4 &&
    onlineRaid.participants.every(
      (participant) => participant.ready && participant.connected,
    );
  const partyLinkLost = partyRaidActive && !fullPartyOnline;
  const appearance = APPEARANCES[appearanceId];
  const character = CHARACTER_CLASSES[characterClass];
  const combatKit = CLASS_COMBAT_KITS[characterClass];
  const tacticalTrait = {
    Warrior: '25% faster BREAK',
    Scholar: '50% energy-drain resistance',
    Monk: 'faster recovery cooldowns',
    Ranger: 'rapid variety combos',
  }[characterClass];
  const level = getLevelProgress(totalXp).level;
  const evolution = getAvatarEvolution(characterClass, level);
  const equippedGear = getEquippedGearSet(characterClass, equippedGearSetId);
  const skillBonuses = getSkillBonuses(characterClass, unlockedSkillIds);
  const activeAbilities = SKILL_TREES[characterClass].filter(
    (skill) => skill.kind === 'active' && unlockedSkillIds.includes(skill.id),
  );
  const focusPower = getEffectiveAttributePower(stats[character.focus]);
  const strengthPower = getEffectiveAttributePower(stats.strength);
  const intelligencePower = getEffectiveAttributePower(stats.intelligence);
  const mindfulnessPower = getEffectiveAttributePower(stats.mindfulness);
  const endurancePower = getEffectiveAttributePower(stats.endurance);
  const vitalityPower = getEffectiveAttributePower(stats.vitality);
  const playerMaxHp = Math.round(
    500 +
    (level - 1) * 40 +
    endurancePower * 10 +
    vitalityPower * 14 +
    skillBonuses.maxHp +
    equippedGear.maxHpBonus,
  );
  const bossMaxHp = Math.round(
    partyRaidActive && onlineRaid?.bossMaxHp
      ? onlineRaid.bossMaxHp
      : boss.maxHp * dungeonAffix.hpMultiplier,
  );
  const selectedPartyRaidLevelReady =
    level >= getDungeon(selectedPartyRaidId).recommendedLevel;
  const startingEnergy = Math.min(
    100,
    22 + Math.floor(intelligencePower * 1.5) + skillBonuses.startingEnergy,
  );

  const [playerHp, setPlayerHp] = useState(playerMaxHp);
  const [bossHp, setBossHp] = useState(bossMaxHp);
  const bossPhase = getBossPhase(bossHp, bossMaxHp);
  const [energy, setEnergy] = useState(startingEnergy);
  const [bossTurnNumber, setBossTurnNumber] = useState(0);
  const [bossShield, setBossShield] = useState(0);
  const [stagger, setStagger] = useState(0);
  const [combo, setCombo] = useState(0);
  const [classStatus, setClassStatus] =
    useState<ClassCombatStatus>(EMPTY_CLASS_STATUS);
  const [runDamageBonus, setRunDamageBonus] = useState(0);
  const [runGuardBonus, setRunGuardBonus] = useState(0);
  const [lastDamageActionId, setLastDamageActionId] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [turnLocked, setTurnLocked] = useState(false);
  const [outcome, setOutcome] = useState<BattleOutcome>('fighting');
  const [victoryRewardEarned, setVictoryRewardEarned] = useState(false);
  const [status, setStatus] = useState('Choose your attack.');
  const [battleLog, setBattleLog] = useState<string[]>([
    `${boss.name} enters the arena.`,
  ]);
  const bossIntent = getBossIntent(boss.id, bossTurnNumber, bossPhase);
  const musicTrack: MusicTrackId =
    runPhase === 'selection'
      ? 'raid-hall'
      : outcome === 'victory'
        ? 'victory'
        : outcome === 'defeat'
          ? 'defeat'
          : room.kind === 'boss'
            ? BOSS_MUSIC[boss.id]
            : room.kind === 'battle'
              ? BATTLE_MUSIC[characterClass]
              : DUNGEON_MUSIC[dungeon.id];
  const [bossFloat, setBossFloat] = useState<FloatingText>({
    text: '',
    color: '#FF6B6B',
  });
  const [heroFloat, setHeroFloat] = useState<FloatingText>({
    text: '',
    color: '#FF6B6B',
  });
  const [partyFloat, setPartyFloat] = useState<FloatingText>({
    text: '',
    color: '#65C7FF',
  });
  const [combatEffect, setCombatEffect] = useState<CombatEffect>({
    color: combatKit.actions[0].color,
    icon: combatKit.actions[0].icon,
    kind: combatKit.actions[0].vfx,
  });

  const mounted = useRef(true);
  const finalVictoryInFlight = useRef(false);
  const previousMaxHp = useRef(playerMaxHp);
  const previousStartingEnergy = useRef(startingEnergy);
  const heroX = useRef(new Animated.Value(0)).current;
  const heroY = useRef(new Animated.Value(0)).current;
  const bossX = useRef(new Animated.Value(0)).current;
  const bossY = useRef(new Animated.Value(0)).current;
  const heroShake = useRef(new Animated.Value(0)).current;
  const bossShake = useRef(new Animated.Value(0)).current;
  const bossDamageY = useRef(new Animated.Value(0)).current;
  const bossDamageOpacity = useRef(new Animated.Value(0)).current;
  const heroDamageY = useRef(new Animated.Value(0)).current;
  const heroDamageOpacity = useRef(new Animated.Value(0)).current;
  const slashOpacity = useRef(new Animated.Value(0)).current;
  const effectX = useRef(new Animated.Value(0)).current;
  const effectScale = useRef(new Animated.Value(0.7)).current;
  const auraOpacity = useRef(new Animated.Value(0.18)).current;
  const allyStrikeX = useRef(new Animated.Value(0)).current;
  const partyDamageY = useRef(new Animated.Value(0)).current;
  const partyDamageOpacity = useRef(new Animated.Value(0)).current;
  const routeProgress = useRef(new Animated.Value(0)).current;
  const sceneOpacity = useRef(new Animated.Value(1)).current;
  const sceneX = useRef(new Animated.Value(0)).current;
  const walkingX = useRef(new Animated.Value(-70)).current;
  const travelPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    mounted.current = true;
    if (reduceMotion) {
      heroY.setValue(0);
      bossY.setValue(0);
      return () => {
        mounted.current = false;
      };
    }

    if (isFocused) playTrack(musicTrack);
  }, [isFocused, musicTrack, playTrack]);

  useEffect(() => {
    setReadyMemberIds(
      onlineRaid?.participants
        .filter((participant) => participant.ready)
        .map((participant) => participant.userId) ?? [],
    );
    setReadyCheckActive(false);
  }, [onlineRaid]);

  useEffect(() => {
    if (!onlineRaid || partyRaidActive) return;
    if (!PARTY_RAID_IDS.includes(onlineRaid.dungeonId as DungeonId)) return;
    const raidDungeonId = onlineRaid.dungeonId as DungeonId;
    setSelectedPartyRaidId(raidDungeonId);
    if (onlineRaid.state === 'active' && runPhase === 'selection') {
      enterPartyRaid(raidDungeonId);
    }
  }, [onlineRaid, partyRaidActive, runPhase]);

  useEffect(() => {
    if (!partyRaidActive || !onlineRaid) return;
    setBossHp(onlineRaid.bossHp);
    if (onlineRaid.state === 'victory' && outcome === 'fighting') {
      void completeVictory('The party’s synchronized assault finished the raid!');
    }
  }, [onlineRaid?.bossHp, onlineRaid?.state, partyRaidActive]);

  useEffect(() => {
    const heroIdle = Animated.loop(
      Animated.sequence([
        Animated.timing(heroY, {
          toValue: -4,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(heroY, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const bossIdle = Animated.loop(
      Animated.sequence([
        Animated.timing(bossY, {
          toValue: -5,
          duration: 1250,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bossY, {
          toValue: 0,
          duration: 1250,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    heroIdle.start();
    bossIdle.start();

    return () => {
      mounted.current = false;
      heroIdle.stop();
      bossIdle.stop();
      heroX.stopAnimation();
      heroY.stopAnimation();
      bossX.stopAnimation();
      bossY.stopAnimation();
      heroShake.stopAnimation();
      bossShake.stopAnimation();
    };
  }, [bossShake, bossX, bossY, heroShake, heroX, heroY, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      walkingX.setValue(0);
      travelPulse.setValue(0);
      return;
    }

    const walking = Animated.loop(
      Animated.sequence([
        Animated.timing(walkingX, {
          toValue: 70,
          duration: 1550,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(walkingX, {
          toValue: -70,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    const pulsing = Animated.loop(
      Animated.sequence([
        Animated.timing(travelPulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(travelPulse, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    walking.start();
    pulsing.start();
    return () => {
      walking.stop();
      pulsing.stop();
    };
  }, [reduceMotion, travelPulse, walkingX]);

  useEffect(() => {
    setPlayerHp((current) =>
      current === previousMaxHp.current ? playerMaxHp : Math.min(current, playerMaxHp),
    );
    previousMaxHp.current = playerMaxHp;
  }, [playerMaxHp]);

  useEffect(() => {
    setEnergy((current) =>
      current === previousStartingEnergy.current ? startingEnergy : current,
    );
    previousStartingEnergy.current = startingEnergy;
  }, [startingEnergy]);

  useEffect(() => {
    if (!partyLinkLost) return;
    setTurnLocked(true);
    setStatus('Party link lost. Every member must be online to continue this raid.');
  }, [partyLinkLost]);

  const playerHpPercent = `${Math.max(0, (playerHp / playerMaxHp) * 100)}%` as `${number}%`;
  const bossHpPercent = `${Math.max(0, (bossHp / bossMaxHp) * 100)}%` as `${number}%`;
  const bossShieldPercent = `${Math.min(100, (bossShield / Math.max(1, bossMaxHp * 0.24)) * 100)}%` as `${number}%`;
  const staggerPercent = `${stagger}%` as `${number}%`;
  const routeX = routeProgress.interpolate({
    inputRange: [0, Math.max(1, dungeon.rooms.length - 1)],
    outputRange: [0, 264],
  });
  const travelScale = travelPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  function addLog(message: string) {
    setBattleLog((current) => [message, ...current].slice(0, 4));
  }

  function getCoreDamageRange(action: CoreCombatAction) {
    const multiplier =
      1 + skillBonuses.damageBonus + equippedGear.damageBonus + runDamageBonus;
    return {
      min: Math.round(
        (action.damageMin +
          focusPower * action.statScaling +
          strengthPower * 2) * multiplier,
      ),
      max: Math.round(
        (action.damageMax +
          focusPower * action.statScaling +
          strengthPower * 2) * multiplier,
      ),
    };
  }

  function getCoreHealing(action: CoreCombatAction) {
    if (action.healing === 0) return 0;
    return Math.round(
      (action.healing + mindfulnessPower * 3) *
        (1 + skillBonuses.healingBonus),
    );
  }

  function getAttackComboMultiplier(actionId: string) {
    const nextCombo =
      lastDamageActionId && lastDamageActionId !== actionId
        ? Math.min(4, combo + (characterClass === 'Ranger' ? 2 : 1))
        : 0;
    setCombo(nextCombo);
    setLastDamageActionId(actionId);
    return getComboMultiplier(nextCombo);
  }

  function calculateBossHit(damage: number) {
    const shieldAbsorbed = Math.min(bossShield, damage);
    const hpDamage = Math.max(0, damage - shieldAbsorbed);
    const nextHp = Math.max(0, bossHp - hpDamage);
    const nextPhase = getBossPhase(nextHp, bossMaxHp);
    const phaseChanged = nextPhase > bossPhase;
    const remainingShield = Math.max(0, bossShield - shieldAbsorbed);
    const phaseBarrier = phaseChanged ? getPhaseBarrier(bossMaxHp, nextPhase) : 0;
    return {
      hpDamage,
      nextHp,
      nextPhase,
      nextShield: remainingShield + phaseBarrier,
      phaseBarrier,
      shieldAbsorbed,
    };
  }

  function applyStagger(staggerGain: number) {
    const nextStagger = Math.min(100, stagger + staggerGain);
    if (nextStagger < 100) {
      setStagger(nextStagger);
      return false;
    }

    setStagger(0);
    setStatus(`${boss.name} is broken! Take another turn.`);
    addLog(`BREAK! ${boss.name} is staggered and loses its turn.`);
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    setTurnLocked(false);
    return true;
  }

  function getMasteryNames(action: CoreCombatAction) {
    const skillIds = new Set(action.synergySkillIds);
    return SKILL_TREES[characterClass]
      .filter(
        (skill) =>
          skillIds.has(skill.id) && unlockedSkillIds.includes(skill.id),
      )
      .map((skill) => skill.name);
  }

  function getPartyAssistDamage(multiplier = 1) {
    const assist = partyMembers.reduce(
      (total, friend) =>
        total +
        Math.round(
          randomBetween(38 + friend.level * 3, 58 + friend.level * 4) *
            multiplier,
        ),
      0,
    );
    return Math.round(assist * (partyRaidActive ? 1.2 : 1));
  }

  async function completeVictory(finisher: string) {
    if (!boss.isFinalBoss) {
      setOutcome('victory');
      setStatus(`${boss.name} has been defeated. The path ahead is open.`);
      addLog(`${finisher} Room cleared.`);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
      setTurnLocked(false);
      return;
    }

    if (finalVictoryInFlight.current) return;
    finalVictoryInFlight.current = true;

    const modifiedRewardXp = Math.round(
      (boss.rewardXp * dungeonAffix.rewardMultiplier) / 5,
    ) * 5;
    let earnedReward = false;
    let awardedXp = modifiedRewardXp;
    if (partyRaidActive) {
      const verifiedReward = await claimVerifiedRaidReward();
      awardedXp = verifiedReward?.rewardXp ?? 0;
      if (verifiedReward?.serverVerified && awardedXp > 0) {
        earnedReward = claimRaidVictory(
          dungeon.id,
          `${boss.name} co-raid`,
          awardedXp,
        );
      }
    } else {
      earnedReward = claimRaidVictory(
        dungeon.id,
        boss.name,
        modifiedRewardXp,
      );
      markDungeonComplete(dungeon.id);
    }
    setVictoryRewardEarned(earnedReward);
    setOutcome('victory');
    setRunPhase('complete');
    setStatus(
      partyRaidActive
        ? `${dungeon.name} clear submitted for server verification.`
        : `${dungeon.name} has been cleared!`,
    );
    addLog(
      partyRaidActive
        ? earnedReward
          ? `${finisher} Server-verified co-raid reward: +${awardedXp} XP!`
          : `${finisher} This raid’s co-op reward was already claimed today.`
        : earnedReward
        ? `${finisher} Victory reward: +${modifiedRewardXp} XP!`
        : `${finisher} Practice victory complete.`,
    );
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    setTurnLocked(false);
  }

  async function animateHeroAttack(
    damage: number,
    heavy: boolean,
    effect: CombatEffect,
  ) {
    setCombatEffect(effect);
    setBossFloat({ text: `-${damage}`, color: effect.color });
    bossDamageY.setValue(0);
    bossDamageOpacity.setValue(1);
    slashOpacity.setValue(0);
    effectX.setValue(
      effect.kind === 'arcane' || effect.kind === 'arrow' ? -125 : 0,
    );
    effectScale.setValue(effect.kind === 'chi' ? 0.35 : 0.72);
    void Haptics.impactAsync(
      heavy
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium,
    ).catch(() => undefined);

    await runAnimation(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(heroX, {
            toValue:
              effect.kind === 'steel'
                ? 55
                : effect.kind === 'chi'
                  ? 38
                  : 8,
            duration: 135,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(heroX, {
            toValue: 0,
            duration: 190,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(effect.kind === 'arcane' || effect.kind === 'arrow' ? 35 : 95),
          Animated.parallel([
            Animated.timing(slashOpacity, {
              toValue: 1,
              duration: 70,
              useNativeDriver: true,
            }),
            Animated.timing(effectX, {
              toValue: 0,
              duration: effect.kind === 'arcane' || effect.kind === 'arrow' ? 210 : 80,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.spring(effectScale, {
              toValue: heavy ? 1.35 : 1,
              speed: 22,
              bounciness: 7,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(slashOpacity, {
            toValue: 0,
            duration: heavy ? 240 : 170,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(105),
          Animated.sequence([
            Animated.timing(bossShake, {
              toValue: -11,
              duration: 55,
              useNativeDriver: true,
            }),
            Animated.timing(bossShake, {
              toValue: 10,
              duration: 55,
              useNativeDriver: true,
            }),
            Animated.timing(bossShake, {
              toValue: -6,
              duration: 45,
              useNativeDriver: true,
            }),
            Animated.timing(bossShake, {
              toValue: 0,
              duration: 45,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(105),
          Animated.parallel([
            Animated.timing(bossDamageY, {
              toValue: -38,
              duration: 430,
              useNativeDriver: true,
            }),
            Animated.timing(bossDamageOpacity, {
              toValue: 0,
              duration: 430,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
    );
  }

  async function animatePartyAssist(damage: number) {
    if (damage <= 0 || partyMembers.length === 0) return;
    setPartyFloat({
      text: `PARTY COMBO  -${damage}`,
      color: partyRaidActive ? '#FFCE6A' : '#65C7FF',
    });
    allyStrikeX.setValue(0);
    partyDamageY.setValue(0);
    partyDamageOpacity.setValue(1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => undefined,
    );

    await runAnimation(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(allyStrikeX, {
            toValue: 34,
            duration: 130,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(allyStrikeX, {
            toValue: 0,
            duration: 210,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(bossShake, {
            toValue: 7,
            duration: 65,
            useNativeDriver: true,
          }),
          Animated.timing(bossShake, {
            toValue: -7,
            duration: 65,
            useNativeDriver: true,
          }),
          Animated.timing(bossShake, {
            toValue: 0,
            duration: 65,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(partyDamageY, {
            toValue: -34,
            duration: 470,
            useNativeDriver: true,
          }),
          Animated.timing(partyDamageOpacity, {
            toValue: 0,
            duration: 470,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
  }

  async function animateBossAttack(damage: number) {
    setHeroFloat({ text: `-${damage}`, color: '#FF6B6B' });
    heroDamageY.setValue(0);
    heroDamageOpacity.setValue(1);
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning,
    ).catch(() => undefined);

    await runAnimation(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(bossX, {
            toValue: -28,
            duration: 150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bossX, {
            toValue: 0,
            duration: 210,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(105),
          Animated.timing(heroShake, {
            toValue: -9,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(heroShake, {
            toValue: 8,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(heroShake, {
            toValue: 0,
            duration: 60,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(105),
          Animated.parallel([
            Animated.timing(heroDamageY, {
              toValue: -34,
              duration: 430,
              useNativeDriver: true,
            }),
            Animated.timing(heroDamageOpacity, {
              toValue: 0,
              duration: 430,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
    );
  }

  async function bossTurn(
    currentPlayerHp: number,
    guardPercent = 0,
    statusAfterAction = classStatus,
    currentBossHp = bossHp,
  ) {
    if (statusAfterAction.id === 'bleed' && !partyRaidActive) {
      const bleedHp = Math.max(0, currentBossHp - statusAfterAction.potency);
      setBossHp(bleedHp);
      addLog(`REND tears ${boss.name} for ${statusAfterAction.potency} damage.`);
      if (bleedHp === 0) {
        setClassStatus(EMPTY_CLASS_STATUS);
        void completeVictory('Rend finished the raid!');
        return;
      }
    }
    setStatus(`${boss.name} uses ${bossIntent.name}…`);
    await wait(300);
    if (!mounted.current) return;

    const rawDamage = randomBetween(boss.attackMin, boss.attackMax);
    const effectiveGuard = Math.max(0, guardPercent - bossIntent.guardPierce);
    const damage = Math.max(
      1,
      Math.round(
        rawDamage *
          bossIntent.damageMultiplier *
          getBossPhaseAttackMultiplier(bossPhase) *
          dungeonAffix.attackMultiplier *
          (1 - Math.min(0.45, skillBonuses.damageReduction)) *
          (1 - Math.min(0.65, effectiveGuard + runGuardBonus)),
      ),
    );
    const renewal =
      statusAfterAction.id === 'renewal' ? statusAfterAction.potency : 0;
    const nextPlayerHp = Math.min(
      playerMaxHp,
      Math.max(0, currentPlayerHp - damage) + renewal,
    );
    await animateBossAttack(damage);
    if (!mounted.current) return;

    setPlayerHp(nextPlayerHp);
    const energyDrain = Math.round(
      bossIntent.energyDrain * (characterClass === 'Scholar' ? 0.5 : 1),
    );
    if (energyDrain > 0) {
      setEnergy((current) => Math.max(0, current - energyDrain));
    }
    if (bossIntent.shieldPercent > 0) {
      const shieldGain = Math.round(bossMaxHp * bossIntent.shieldPercent);
      setBossShield((current) =>
        Math.min(Math.round(bossMaxHp * 0.24), current + shieldGain),
      );
      addLog(`${bossIntent.name} grants ${shieldGain} ward.`);
    }
    addLog(
      `${bossIntent.name} hits ${characterName} for ${damage}${
        energyDrain > 0
          ? ` and drains ${energyDrain} energy`
          : ''
      }.`,
    );
    if (renewal > 0) addLog(`RENEWAL restores ${renewal} HP after the hit.`);
    setClassStatus(tickClassStatusAfterBossTurn(statusAfterAction));
    setBossTurnNumber((current) => current + 1);

    if (nextPlayerHp === 0) {
      setOutcome('defeat');
      setStatus('Your Ascendant has fallen.');
      if (partyRaidActive) void reportRaidResult('defeat', 0);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => undefined);
      setTurnLocked(false);
      return;
    }

    setStatus('Read the next intent and choose your response.');
    setTurnLocked(false);
  }

  async function useCoreAction(action: CoreCombatAction) {
    if (turnLocked || outcome !== 'fighting' || partyLinkLost) return;
    const cooldown = cooldowns[action.id] ?? 0;
    if (cooldown > 0) {
      setStatus(`${action.name} is ready in ${cooldown} turn${cooldown === 1 ? '' : 's'}.`);
      return;
    }
    if (energy < action.energyCost) {
      setStatus(`${action.name} needs ${action.energyCost} energy.`);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      ).catch(() => undefined);
      return;
    }

    if (partyRaidActive) setTurnLocked(true);
    const verifiedAction = partyRaidActive
      ? await performRaidAction(action.id)
      : null;
    if (partyRaidActive && !verifiedAction) {
      setTurnLocked(false);
      setStatus('The raid server rejected the action. Reconnect and try again.');
      return;
    }

    const damageRange = getCoreDamageRange(action);
    const mechanic = resolveClassAction(
      characterClass,
      action,
      classStatus,
      focusPower,
    );
    const comboMultiplier =
      action.damageMax > 0 ? getAttackComboMultiplier(action.id) : 1;
    const playerDamage = verifiedAction
      ? verifiedAction.damage
      : action.damageMax > 0
        ? Math.round(
            randomBetween(damageRange.min, damageRange.max) *
              comboMultiplier *
              mechanic.damageMultiplier,
          )
        : 0;
    const assistDamage =
      !partyRaidActive && playerDamage > 0
        ? getPartyAssistDamage(action.partyMultiplier)
        : 0;
    const damage = playerDamage + assistDamage;
    const bossHit = verifiedAction
      ? {
          hpDamage: verifiedAction.damage,
          nextHp: verifiedAction.bossHp,
          nextPhase: getBossPhase(
            verifiedAction.bossHp,
            verifiedAction.bossMaxHp,
          ),
          nextShield: 0,
          phaseBarrier: 0,
          shieldAbsorbed: 0,
        }
      : calculateBossHit(damage);
    const healingPower = getCoreHealing(action) + mechanic.bonusHealing;
    const healing = Math.min(healingPower, playerMaxHp - playerHp);
    const nextPlayerHp = Math.min(playerMaxHp, playerHp + healingPower);
    const energyChange =
      action.energyGain +
      (action.energyGain > 0 ? skillBonuses.energyGain : 0) -
      action.energyCost;

    setTurnLocked(true);
    setStatus(`${action.name}!`);
    setEnergy((current) =>
      Math.max(0, Math.min(100, current + energyChange)),
    );
    setCooldowns((current) =>
      tickCooldowns(
        current,
        action.id,
        action.id === 'focus'
          ? Math.max(1, getFocusCooldown() - (characterClass === 'Monk' ? 1 : 0))
          : 0,
      ),
    );
    setClassStatus(mechanic.nextStatus);
    if (mechanic.message) addLog(mechanic.message);

    if (damage > 0) {
      await animateHeroAttack(playerDamage, action.id === 'power', {
        color: action.color,
        icon: action.icon,
        kind: action.vfx,
      });
      if (!mounted.current) return;
      await animatePartyAssist(assistDamage);
      if (!mounted.current) return;
      setBossHp(bossHit.nextHp);
      setBossShield(bossHit.nextShield);
    } else {
      setHeroFloat({ text: `+${healing}`, color: action.color });
      heroDamageY.setValue(0);
      heroDamageOpacity.setValue(1);
      auraOpacity.setValue(0.2);
      void Haptics.selectionAsync().catch(() => undefined);

      await runAnimation(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(auraOpacity, {
              toValue: 0.58,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(auraOpacity, {
              toValue: 0.18,
              duration: 420,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(heroDamageY, {
              toValue: -34,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(heroDamageOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      if (!mounted.current) return;
    }

    if (healing > 0) {
      setPlayerHp(nextPlayerHp);
      if (damage > 0) {
        setHeroFloat({ text: `+${healing}`, color: action.color });
        heroDamageY.setValue(0);
        heroDamageOpacity.setValue(1);
        await runAnimation(
          Animated.parallel([
            Animated.timing(heroDamageY, {
              toValue: -26,
              duration: 330,
              useNativeDriver: true,
            }),
            Animated.timing(heroDamageOpacity, {
              toValue: 0,
              duration: 330,
              useNativeDriver: true,
            }),
          ]),
        );
        if (!mounted.current) return;
      }
    }
    addLog(
      damage > 0
        ? `${action.name} deals ${bossHit.hpDamage}${
            bossHit.shieldAbsorbed > 0
              ? ` (${bossHit.shieldAbsorbed} absorbed by ward)`
              : ''
          }${comboMultiplier > 1 ? ` · x${comboMultiplier.toFixed(2)} combo` : ''}${
            assistDamage > 0 ? ` (${assistDamage} party assist)` : ''
          }${healing > 0 ? ` and restores ${healing} HP` : ''}.`
        : `${action.name} restores ${healing} HP and grants ${Math.max(
            0,
            energyChange,
          )} energy.`,
    );

    if (bossHit.phaseBarrier > 0) {
      addLog(
        `PHASE ${bossHit.nextPhase}: ${getBossPhaseName(boss.id, bossHit.nextPhase)}. ${bossHit.phaseBarrier} ward gained.`,
      );
      setStatus(`${boss.name} enters ${getBossPhaseName(boss.id, bossHit.nextPhase)}!`);
    }

    if (bossHit.nextHp === 0) {
      void completeVictory(`${action.name} finished the raid!`);
      return;
    }

    if (
      damage > 0 &&
      applyStagger(
        Math.round(getActionStagger(action) * (characterClass === 'Warrior' ? 1.25 : 1)),
      )
    ) return;

    await bossTurn(
      nextPlayerHp,
      action.guardPercent,
      mechanic.nextStatus,
      bossHit.nextHp,
    );
  }

  async function useClassAbility(skill: SkillNode) {
    const ability = skill.active;
    if (!ability || turnLocked || outcome !== 'fighting' || partyLinkLost) return;
    const cooldown = cooldowns[skill.id] ?? 0;
    if (cooldown > 0) {
      setStatus(`${skill.name} is ready in ${cooldown} turn${cooldown === 1 ? '' : 's'}.`);
      return;
    }
    if (energy < ability.energyCost) {
      setStatus(`${skill.name} needs ${ability.energyCost} energy.`);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      ).catch(() => undefined);
      return;
    }


    if (partyRaidActive) setTurnLocked(true);
    const verifiedAction = partyRaidActive
      ? await performRaidAction('ability')
      : null;
    if (partyRaidActive && !verifiedAction) {
      setTurnLocked(false);
      setStatus('The raid server rejected the ability. Reconnect and try again.');
      return;
    }

    const comboMultiplier = getAttackComboMultiplier(skill.id);
    const playerDamage = verifiedAction?.damage ?? Math.round(
      (randomBetween(ability.damageMin, ability.damageMax) *
        (1 + skillBonuses.damageBonus + equippedGear.damageBonus + runDamageBonus) +
        focusPower * 3 +
        strengthPower * 2) * comboMultiplier,
    );
    const assistDamage = partyRaidActive
      ? 0
      : getPartyAssistDamage(
          skill.tier >= 8 ? 1.6 : skill.tier >= 3 ? 1.4 : 1.1,
        );
    const damage = playerDamage + assistDamage;
    const bossHit = verifiedAction
      ? {
          hpDamage: verifiedAction.damage,
          nextHp: verifiedAction.bossHp,
          nextPhase: getBossPhase(
            verifiedAction.bossHp,
            verifiedAction.bossMaxHp,
          ),
          nextShield: 0,
          phaseBarrier: 0,
          shieldAbsorbed: 0,
        }
      : calculateBossHit(damage);
    const healing = Math.round(
      ability.healing * (1 + skillBonuses.healingBonus),
    );
    const nextPlayerHp = Math.min(playerMaxHp, playerHp + healing);
    const energyChange =
      ability.energyGain +
      (ability.energyGain > 0 ? skillBonuses.energyGain : 0) -
      ability.energyCost;

    setTurnLocked(true);
    setStatus(`${skill.name}!`);
    setEnergy((current) => Math.max(0, Math.min(100, current + energyChange)));
    setCooldowns((current) =>
      tickCooldowns(current, skill.id, getAbilityCooldown(skill.tier)),
    );

    const isCapstone = skill.tier === 3 || skill.tier >= 8;
    await animateHeroAttack(playerDamage, isCapstone, {
      color: isCapstone ? '#FFCE6A' : character.color,
      icon: skill.icon,
      kind: combatKit.actions[1].vfx,
    });
    if (!mounted.current) return;

    await animatePartyAssist(assistDamage);
    if (!mounted.current) return;

    setBossHp(bossHit.nextHp);
    setBossShield(bossHit.nextShield);
    if (healing > 0) {
      setPlayerHp(nextPlayerHp);
      setHeroFloat({ text: `+${healing}`, color: '#73E5B2' });
      heroDamageY.setValue(0);
      heroDamageOpacity.setValue(1);
      await runAnimation(
        Animated.parallel([
          Animated.timing(heroDamageY, {
            toValue: -26,
            duration: 330,
            useNativeDriver: true,
          }),
          Animated.timing(heroDamageOpacity, {
            toValue: 0,
            duration: 330,
            useNativeDriver: true,
          }),
        ]),
      );
      if (!mounted.current) return;
    }
    addLog(
      `${skill.name} + party deal ${bossHit.hpDamage} damage${
        bossHit.shieldAbsorbed > 0
          ? ` (${bossHit.shieldAbsorbed} absorbed by ward)`
          : ''
      }${comboMultiplier > 1 ? ` · x${comboMultiplier.toFixed(2)} combo` : ''}${
        healing > 0 ? ` and restores ${healing} HP` : ''
      }.`,
    );

    if (bossHit.phaseBarrier > 0) {
      addLog(
        `PHASE ${bossHit.nextPhase}: ${getBossPhaseName(boss.id, bossHit.nextPhase)}. ${bossHit.phaseBarrier} ward gained.`,
      );
      setStatus(`${boss.name} enters ${getBossPhaseName(boss.id, bossHit.nextPhase)}!`);
    }

    if (bossHit.nextHp === 0) {
      void completeVictory(`${skill.name} finished the raid!`);
      return;
    }

    if (
      applyStagger(
        Math.round(getAbilityStagger(skill.tier) * (characterClass === 'Warrior' ? 1.25 : 1)),
      )
    ) return;

    await bossTurn(
      nextPlayerHp,
      ability.guardPercent,
      classStatus,
      bossHit.nextHp,
    );
  }

  function getCoreActionSubtitle(action: CoreCombatAction) {
    const parts: string[] = [];
    if (action.damageMax > 0) {
      const range = getCoreDamageRange(action);
      parts.push(`${range.min}–${range.max} damage`);
    }
    if (action.healing > 0) {
      parts.push(`heal ${getCoreHealing(action)} HP`);
    }
    if (action.energyCost > 0) {
      parts.push(`costs ${action.energyCost}`);
    } else if (action.energyGain > 0) {
      parts.push(`+${action.energyGain + skillBonuses.energyGain} energy`);
    }
    if (action.guardPercent > 0) {
      parts.push(`${Math.round(action.guardPercent * 100)}% guard`);
    }
    return parts.join(' · ');
  }

  function startDungeon(nextDungeonId: DungeonId) {
    const nextDungeon = getDungeon(nextDungeonId);
    const firstRoom = nextDungeon.rooms[0];
    const firstEnemy = getDungeonCombatant(nextDungeon, firstRoom);
    heroX.setValue(0);
    bossX.setValue(0);
    heroShake.setValue(0);
    bossShake.setValue(0);
    routeProgress.setValue(0);
    sceneOpacity.setValue(1);
    sceneX.setValue(0);
    setSelectedDungeonId(nextDungeonId);
    finalVictoryInFlight.current = false;
    setPartyRaidActive(false);
    setRoomIndex(0);
    setPlayerHp(playerMaxHp);
    setBossHp(
      Math.round(firstEnemy.maxHp * getDungeonAffix(nextDungeonId).hpMultiplier),
    );
    setEnergy(startingEnergy);
    setBossTurnNumber(0);
    setBossShield(0);
    setStagger(0);
    setCombo(0);
    setLastDamageActionId(null);
    setClassStatus(EMPTY_CLASS_STATUS);
    setRunDamageBonus(0);
    setRunGuardBonus(0);
    setCooldowns({});
    setTurnLocked(false);
    setOutcome('fighting');
    setVictoryRewardEarned(false);
    setStatus(`${nextDungeon.name} expedition started.`);
    setBattleLog([`The party enters ${nextDungeon.name}.`]);
    setRunPhase('room');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => undefined,
    );
  }

  async function rallyParty() {
    if (!selectedPartyRaidLevelReady) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      ).catch(() => undefined);
      return;
    }
    setReadyCheckActive(true);
    if (!onlineRaid || onlineRaid.dungeonId !== selectedPartyRaidId) {
      if (isPartyLeader) await createRaid(selectedPartyRaidId);
    } else {
      await setRaidReady(true);
    }
    setReadyCheckActive(false);
  }

  async function startPartyRaid() {
    if (!selectedPartyRaidLevelReady || !wholePartyReady || !isRaidHost) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      ).catch(() => undefined);
      return;
    }
    await launchRaid();
  }

  function enterPartyRaid(raidDungeonId: DungeonId) {
    const raidDungeon = getDungeon(raidDungeonId);
    const bossRoomIndex = raidDungeon.rooms.length - 1;
    const bossRoom = raidDungeon.rooms[bossRoomIndex];
    const raidBoss = getDungeonCombatant(raidDungeon, bossRoom);

    heroX.setValue(0);
    bossX.setValue(0);
    heroShake.setValue(0);
    bossShake.setValue(0);
    routeProgress.setValue(bossRoomIndex);
    sceneOpacity.setValue(1);
    sceneX.setValue(0);
    setSelectedDungeonId(raidDungeonId);
    finalVictoryInFlight.current = false;
    setRoomIndex(bossRoomIndex);
    setPartyRaidActive(true);
    setPlayerHp(playerMaxHp);
    setBossHp(
      onlineRaid?.bossHp ?? Math.round(raidBoss.maxHp * 1.35),
    );
    setEnergy(100);
    setBossTurnNumber(0);
    setBossShield(0);
    setStagger(0);
    setCombo(0);
    setLastDamageActionId(null);
    setClassStatus(EMPTY_CLASS_STATUS);
    setRunDamageBonus(0);
    setRunGuardBonus(0);
    setCooldowns({});
    setTurnLocked(false);
    setOutcome('fighting');
    setVictoryRewardEarned(false);
    setStatus('All four Ascendants are linked. Begin the synchronized assault.');
    setBattleLog([
      `${partyName ?? 'The party'} enters ${raidBoss.name}’s raid instance.`,
      'All four party links are synchronized.',
    ]);
    setRunPhase('room');
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
  }

  async function advanceRoom() {
    if (turnLocked || roomIndex >= dungeon.rooms.length - 1) return;
    const nextIndex = roomIndex + 1;
    const nextRoom = dungeon.rooms[nextIndex];
    const nextEnemy = getDungeonCombatant(dungeon, nextRoom);
    setTurnLocked(true);
    setStatus(`Traveling to ${nextRoom.name}…`);

    await runAnimation(
      Animated.parallel([
        Animated.timing(sceneOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sceneX, {
          toValue: 26,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    setRunPhase('traveling');
    sceneOpacity.setValue(1);
    sceneX.setValue(0);
    await runAnimation(
      Animated.timing(routeProgress, {
        toValue: nextIndex,
        duration: 900,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    if (!mounted.current) return;

    sceneOpacity.setValue(0);
    sceneX.setValue(-26);
    setRoomIndex(nextIndex);
    setBossHp(
      Math.round(
        nextEnemy.maxHp * (partyRaidActive ? 1 : dungeonAffix.hpMultiplier),
      ),
    );
    setBossTurnNumber(0);
    setBossShield(0);
    setStagger(0);
    setCombo(0);
    setLastDamageActionId(null);
    setClassStatus(EMPTY_CLASS_STATUS);
    setEnergy((current) => Math.min(100, current + 12));
    setOutcome('fighting');
    setVictoryRewardEarned(false);
    setBattleLog(
      nextRoom.kind === 'battle' || nextRoom.kind === 'boss'
        ? [`${nextEnemy.name} blocks the path.`]
        : [`The party reaches ${nextRoom.name}.`],
    );
    setStatus(
      nextRoom.kind === 'battle' || nextRoom.kind === 'boss'
        ? `${nextEnemy.name} engages the party. Choose your attack.`
        : nextRoom.description,
    );
    setRunPhase('room');
    await runAnimation(
      Animated.parallel([
        Animated.timing(sceneOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(sceneX, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    setTurnLocked(false);
  }

  function takeRest(choice: 'heal' | 'energy') {
    if (choice === 'heal') {
      const restored = Math.round(playerMaxHp * 0.35);
      setPlayerHp((current) => Math.min(playerMaxHp, current + restored));
      addLog(`The shrine restores ${restored} HP.`);
    } else {
      setEnergy(100);
      addLog('The shrine restores the party’s energy.');
    }
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    void advanceRoom();
  }

  function choosePathBoon(boon: DungeonBoon) {
    if (boon.damageBonus > 0) {
      setRunDamageBonus((current) =>
        Math.min(0.24, current + boon.damageBonus),
      );
    }
    if (boon.guardBonus > 0) {
      setRunGuardBonus((current) =>
        Math.min(0.24, current + boon.guardBonus),
      );
    }
    if (boon.healPercent > 0) {
      const restored = Math.round(playerMaxHp * boon.healPercent);
      setPlayerHp((current) => Math.min(playerMaxHp, current + restored));
    }
    addLog(`${boon.name} chosen. ${boon.description}.`);
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    void advanceRoom();
  }

  function restartDungeon() {
    if (partyRaidActive) {
      startPartyRaid();
    } else {
      startDungeon(selectedDungeonId);
    }
  }

  function leaveDungeon() {
    if (turnLocked && !partyLinkLost) return;
    setRunPhase('selection');
    finalVictoryInFlight.current = false;
    setPartyRaidActive(false);
    setReadyMemberIds([]);
    setReadyCheckActive(false);
    setRoomIndex(0);
    setClassStatus(EMPTY_CLASS_STATUS);
    setRunDamageBonus(0);
    setRunGuardBonus(0);
    routeProgress.setValue(0);
  }

  if (runPhase === 'selection') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow}>ADVENTURE EXPEDITIONS</Text>
              <Text style={styles.title}>DUNGEON RAIDS</Text>
              <Text style={styles.selectionSubtitle}>
                Clear every room, preserve your HP, and defeat the boss.
              </Text>
            </View>
            <View style={styles.victoryBadge}>
              <Text style={styles.victoryValue}>{raidWins}</Text>
              <Text style={styles.victoryLabel}>CLEARS</Text>
            </View>
          </View>

          <View style={styles.expeditionBrief}>
            <GameIcon token="dungeon-map" size={42} />
            <View style={styles.expeditionBriefCopy}>
              <Text style={styles.expeditionBriefTitle}>HOW A RUN WORKS</Text>
              <Text style={styles.expeditionBriefText}>
                Health and cooldowns carry forward. Read boss intents, vary attacks
                to build combos, and fill BREAK to interrupt lethal moves.
              </Text>
            </View>
          </View>

          {FEATURES.multiplayer && (
            <View style={styles.raidModeTabs}>
              <Pressable
                style={[styles.raidModeTab, browserMode === 'dungeons' && styles.raidModeTabActive]}
                onPress={() => setBrowserMode('dungeons')}
              >
                <Text style={[styles.raidModeTabText, browserMode === 'dungeons' && styles.raidModeTabTextActive]}>DUNGEONS</Text>
              </Pressable>
              <Pressable
                style={[styles.raidModeTab, browserMode === 'party-raids' && styles.raidModeTabActive]}
                onPress={() => setBrowserMode('party-raids')}
              >
                <Text style={[styles.raidModeTabText, browserMode === 'party-raids' && styles.raidModeTabTextActive]}>4-PLAYER RAIDS</Text>
              </Pressable>
            </View>
          )}

          {!FEATURES.multiplayer || browserMode === 'dungeons' ? (
            <>
              <Text style={styles.dungeonSectionLabel}>CHOOSE A DUNGEON</Text>
              {DUNGEONS.map((dungeonItem, dungeonIndex) => {
            const dungeonBoss = getRaidBoss(dungeonItem.bossId);
            const itemAffix = getDungeonAffix(dungeonItem.id);
            const levelReady = level >= dungeonItem.recommendedLevel;
            const previousDungeon = DUNGEONS[dungeonIndex - 1];
            const routeReady =
              dungeonIndex === 0 ||
              completedDungeonIds.includes(previousDungeon.id);
            const unlocked = levelReady && routeReady;
            const completed = completedDungeonIds.includes(dungeonItem.id);
            return (
              <Pressable
                key={dungeonItem.id}
                style={({ pressed }) => [
                  styles.dungeonCard,
                  { borderColor: `${dungeonItem.accent}65` },
                  !unlocked && styles.dungeonCardLocked,
                  pressed && styles.dungeonCardPressed,
                ]}
                onPress={() => startDungeon(dungeonItem.id)}
                disabled={!unlocked}
                accessibilityRole="button"
                accessibilityLabel={`Enter ${dungeonItem.name}, boss ${dungeonBoss.name}`}
                accessibilityState={{ disabled: !unlocked }}
              >
                <View
                  style={[
                    styles.dungeonCardGlow,
                    { backgroundColor: dungeonItem.accent },
                  ]}
                />
                <Image
                  source={dungeonBoss.source}
                  style={[styles.dungeonCardBoss, !unlocked && styles.dungeonCardBossLocked]}
                  resizeMode="contain"
                />
                <View style={styles.dungeonCardInfo}>
                  <Text style={[styles.dungeonCardName, { color: dungeonItem.accent }]}>
                    {dungeonItem.name.toUpperCase()}
                  </Text>
                  <Text style={styles.dungeonCardSubtitle} numberOfLines={2}>
                    {dungeonItem.subtitle}
                  </Text>
                  <View style={styles.dungeonMetaRow}>
                    <Text style={styles.dungeonMeta}>{dungeonItem.rooms.length} ROOMS</Text>
                    <Text style={styles.dungeonMeta}>
                      {dungeonItem.rooms.filter((candidate) => candidate.kind === 'battle').length + 1} BATTLES
                    </Text>
                    <Text style={styles.dungeonMeta}>BOSS · {dungeonBoss.name.toUpperCase()}</Text>
                    <Text style={styles.dungeonMeta}>{dungeonBoss.maxHp.toLocaleString()} BOSS HP</Text>
                    <Text style={styles.dungeonMeta}>
                      {isRaidRewardAvailable(dungeonItem.id)
                        ? `${dungeonBoss.rewardXp} XP READY`
                        : 'XP CLAIMED · RESETS NOON'}
                    </Text>
                  </View>
                  <View style={[styles.affixPill, { borderColor: `${itemAffix.accent}88` }]}>
                    <GameIcon token={itemAffix.icon} size={22} />
                    <Text style={[styles.affixPillText, { color: itemAffix.accent }]}>
                      {itemAffix.name.toUpperCase()} · +{Math.round((itemAffix.rewardMultiplier - 1) * 100)}% XP
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.recommendedLevel,
                      unlocked && styles.recommendedReady,
                    ]}
                  >
                    {!levelReady
                      ? `LOCKED · REACH LV ${dungeonItem.recommendedLevel}`
                      : !routeReady
                        ? `LOCKED · CLEAR ${previousDungeon.name.toUpperCase()}`
                        : '✓ EXPEDITION READY'}
                  </Text>
                  {completed && (
                    <Text style={[styles.dungeonComplete, { color: dungeonItem.accent }]}>◆ CLEARED</Text>
                  )}
                </View>
                {unlocked ? (
                  <Text style={styles.dungeonArrow}>›</Text>
                ) : (
                  <GameIcon token="status-lock" size={30} />
                )}
              </Pressable>
            );
              })}
            </>
          ) : (
            <>
              <Text style={styles.dungeonSectionLabel}>CHOOSE A PARTY RAID</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.partyRaidRoster}
              >
                {PARTY_RAID_IDS.map((raidId) => {
                  const raidDungeon = getDungeon(raidId);
                  const raidBoss = getRaidBoss(raidDungeon.bossId);
                  const selected = selectedPartyRaidId === raidId;
                  const raidLevelReady = level >= raidDungeon.recommendedLevel;
                  return (
                    <Pressable
                      key={raidId}
                      style={[
                        styles.partyRaidOption,
                        selected && {
                          borderColor: raidDungeon.accent,
                          backgroundColor: `${raidDungeon.accent}18`,
                        },
                        !raidLevelReady && styles.partyRaidOptionLocked,
                      ]}
                      onPress={() => {
                        setSelectedPartyRaidId(raidId);
                        setReadyMemberIds([]);
                        setReadyCheckActive(false);
                      }}
                    >
                      <Image source={raidBoss.source} style={styles.partyRaidOptionImage} resizeMode="contain" />
                      <Text style={styles.partyRaidOptionName}>{raidBoss.name}</Text>
                      <Text style={[styles.partyRaidOptionTier, { color: raidDungeon.accent }]}>
                        {raidLevelReady ? `SYNC RAID · LV ${raidBoss.level}` : `LOCKED · REACH LV ${raidDungeon.recommendedLevel}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.raidLobbyCard}>
                <View style={[styles.raidLobbyGlow, { backgroundColor: getDungeon(selectedPartyRaidId).accent }]} />
                <View style={styles.raidLobbyHeader}>
                  <View>
                    <Text style={[styles.raidLobbyEyebrow, { color: getDungeon(selectedPartyRaidId).accent }]}>SYNCHRONIZED INSTANCE</Text>
                    <Text style={styles.raidLobbyTitle}>{getRaidBoss(getDungeon(selectedPartyRaidId).bossId).name}</Text>
                    <Text style={styles.raidLobbySubtitle}>All four members must remain online for the entire battle.</Text>
                  </View>
                  <View style={[styles.lobbyStatusBadge, wholePartyReady && styles.lobbyStatusReady]}>
                    <Text style={styles.lobbyStatusText}>{wholePartyReady ? 'READY' : `${readyMemberIds.length}/4`}</Text>
                  </View>
                </View>

                <View style={styles.readyRoster}>
                  <RaidLobbyMember
                    name={`${characterName} · YOU`}
                    characterClass={characterClass}
                    source={equippedGear.source}
                    online
                    ready={Boolean(user && readyMemberIds.includes(user.id))}
                  />
                  {partyMembers.map((friend) => (
                    <RaidLobbyMember
                      key={friend.id}
                      name={friend.name}
                      characterClass={friend.characterClass}
                      online={friend.isOnline}
                      ready={readyMemberIds.includes(friend.id)}
                    />
                  ))}
                  {Array.from({ length: Math.max(0, 3 - partyMembers.length) }).map((_, index) => (
                    <RaidLobbyMember key={`open-${index}`} name="OPEN SLOT" online={false} ready={false} />
                  ))}
                </View>

                {!fullPartyOnline && (
                  <View style={styles.raidGateWarning}>
                    <GameIcon token="status-lock" size={30} />
                    <Text style={styles.raidGateWarningText}>
                      {partyMembers.length < 3
                        ? `A full 4-player party is required. ${3 - partyMembers.length} ally slot${3 - partyMembers.length === 1 ? '' : 's'} still open.`
                        : 'At least one party member is offline. Everyone must reconnect before the ready check.'}
                    </Text>
                  </View>
                )}

                {!selectedPartyRaidLevelReady && (
                  <View style={styles.raidGateWarning}>
                    <GameIcon token="status-lock" size={30} />
                    <Text style={styles.raidGateWarningText}>
                      Reach level {getDungeon(selectedPartyRaidId).recommendedLevel} before challenging this synchronized raid.
                    </Text>
                  </View>
                )}

                <View style={styles.lobbyActions}>
                  <Pressable
                    style={[styles.rallyButton, !fullPartyOnline && styles.lobbyButtonDisabled]}
                    onPress={() => void rallyParty()}
                    disabled={
                      !selectedPartyRaidLevelReady ||
                      !fullPartyOnline ||
                      readyCheckActive ||
                      ((!onlineRaid || onlineRaid.dungeonId !== selectedPartyRaidId) && !isPartyLeader)
                    }
                  >
                    <Text style={styles.rallyButtonText}>
                      {readyCheckActive
                        ? 'SYNCING LOBBY…'
                        : wholePartyReady
                          ? 'READY CHECK COMPLETE'
                          : !onlineRaid || onlineRaid.dungeonId !== selectedPartyRaidId
                            ? isPartyLeader ? 'CREATE RAID LOBBY' : 'WAIT FOR PARTY LEADER'
                            : 'MARK ME READY'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.launchRaidButton,
                      { backgroundColor: getDungeon(selectedPartyRaidId).accent },
                      (!selectedPartyRaidLevelReady || !wholePartyReady || !isRaidHost) && styles.lobbyButtonDisabled,
                    ]}
                    onPress={() => void startPartyRaid()}
                    disabled={!selectedPartyRaidLevelReady || !wholePartyReady || !isRaidHost}
                  >
                    <Text style={styles.launchRaidButtonText}>{isRaidHost ? 'LAUNCH RAID' : 'HOST LAUNCHES'}</Text>
                    <Text style={styles.launchRaidArrow}>→</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (runPhase === 'traveling' || room.kind === 'path' || room.kind === 'rest') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <DungeonRunHeader
            dungeon={dungeon}
            room={room}
            roomIndex={roomIndex}
            routeX={routeX}
            travelScale={travelScale}
            raidWins={raidWins}
            onLeave={leaveDungeon}
          />

          <Animated.View
            style={[
              styles.eventScene,
              { opacity: sceneOpacity, transform: [{ translateX: sceneX }] },
            ]}
          >
            <View style={[styles.eventGlow, { backgroundColor: dungeon.accent }]} />
            <View style={styles.eventStars}>
              <GameIcon token="dungeon-stars" size={38} />
              <GameIcon token="progress-xp" size={22} />
              <GameIcon token="dungeon-stars" size={30} />
            </View>
            <Animated.View
              style={[
                styles.walkingHero,
                {
                  transform: [
                    { translateX: walkingX },
                    { scale: travelScale },
                  ],
                },
              ]}
            >
              <Image
                source={equippedGear.source}
                style={[
                  styles.walkingHeroImage,
                  {
                    transform: [
                      { scale: evolution.scale },
                      { scaleX: evolution.widthScale },
                    ],
                  },
                ]}
                resizeMode="contain"
              />
            </Animated.View>
            <View style={styles.eventFloor} />
          </Animated.View>

          {runPhase === 'traveling' ? (
            <View style={styles.travelCard}>
              <Text style={[styles.travelEyebrow, { color: dungeon.accent }]}>PARTY ADVANCING</Text>
              <Text style={styles.travelTitle}>Moving deeper…</Text>
              <View style={styles.travelDots}>
                <Animated.View style={[styles.travelDot, { backgroundColor: dungeon.accent, transform: [{ scale: travelScale }] }]} />
                <View style={[styles.travelDot, { backgroundColor: `${dungeon.accent}99` }]} />
                <View style={[styles.travelDot, { backgroundColor: `${dungeon.accent}55` }]} />
              </View>
            </View>
          ) : (
            <View style={styles.roomEventCard}>
              <GameIcon token={room.icon} size={72} />
              <Text style={[styles.roomEventKind, { color: dungeon.accent }]}>ROOM {roomIndex + 1} · {room.kind.toUpperCase()}</Text>
              <Text style={styles.roomEventTitle}>{room.name}</Text>
              <Text style={styles.roomEventDescription}>{room.description}</Text>

              {room.kind === 'path' ? (
                <View style={styles.pathChoiceWrap}>
                  <Text style={styles.pathChoiceLabel}>{room.actionLabel} · CHOOSE ONE ROUTE BOON</Text>
                  <View style={styles.pathBoonChoices}>
                    {DUNGEON_BOONS.map((boon) => (
                      <Pressable
                        key={boon.id}
                        style={[styles.pathBoonButton, { borderColor: `${dungeon.accent}88` }]}
                        onPress={() => choosePathBoon(boon)}
                        accessibilityRole="button"
                        accessibilityLabel={`${boon.name}. ${boon.description}`}
                      >
                        <GameIcon token={boon.icon} size={34} />
                        <Text style={styles.boonTitle}>{boon.name.toUpperCase()}</Text>
                        <Text style={styles.boonText}>{boon.description}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.boonChoices}>
                  <Pressable
                    style={[styles.boonButton, { borderColor: `${dungeon.accent}88` }]}
                    onPress={() => takeRest('heal')}
                  >
                    <GameIcon token="resource-healing" size={42} />
                    <Text style={styles.boonTitle}>RESTORE HP</Text>
                    <Text style={styles.boonText}>Recover 35% max health</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.boonButton, { borderColor: `${dungeon.accent}88` }]}
                    onPress={() => takeRest('energy')}
                  >
                    <GameIcon token="resource-energy" size={42} />
                    <Text style={styles.boonTitle}>CHARGE ENERGY</Text>
                    <Text style={styles.boonText}>Refill energy to 100</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          <View style={styles.runResourceCard}>
            <View>
              <Text style={styles.runResourceLabel}>CARRIED HEALTH</Text>
              <Text style={styles.runResourceValue}>{playerHp} / {playerMaxHp} HP</Text>
            </View>
            <View>
              <Text style={styles.runResourceLabel}>ENERGY</Text>
              <Text style={[styles.runResourceValue, { color: '#65C7FF' }]}>{energy} / 100</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <DungeonRunHeader
          dungeon={dungeon}
          room={room}
          roomIndex={roomIndex}
          routeX={routeX}
          travelScale={travelScale}
          raidWins={raidWins}
          onLeave={leaveDungeon}
          isPartyRaid={partyRaidActive}
          partyMembers={partyMembers}
        />

        <Animated.View
          style={{
            opacity: sceneOpacity,
            transform: [{ translateX: sceneX }],
          }}
        >

        {partyLinkLost && (
          <View style={styles.partyLinkLostCard}>
            <GameIcon token="status-warning" size={38} />
            <View style={styles.partyLinkLostCopy}>
              <Text style={styles.partyLinkLostTitle}>PARTY LINK INTERRUPTED</Text>
              <Text style={styles.partyLinkLostText}>Combat is paused until every original party member is back online.</Text>
            </View>
          </View>
        )}

        <View style={styles.bossStats}>
          <View style={styles.hpLabels}>
            <Text style={styles.combatantName}>{boss.name.toUpperCase()} · LV {boss.level}</Text>
            <Text style={styles.hpText}>{bossHp} / {bossMaxHp} HP</Text>
          </View>
          <View style={styles.hpBar}>
            <View style={[styles.bossHp, { width: bossHpPercent, backgroundColor: boss.accent }]} />
          </View>
          {bossShield > 0 && (
            <View style={styles.wardRow}>
              <Text style={styles.wardLabel}>WARD · {bossShield}</Text>
              <View style={styles.wardTrack}>
                <View style={[styles.wardFill, { width: bossShieldPercent }]} />
              </View>
            </View>
          )}
          <Text style={styles.bossDescription}>{boss.description}</Text>
          <View style={styles.bossTacticalRow}>
            <View style={styles.phaseBadge}>
              <Text style={styles.phaseLabel}>PHASE {bossPhase}</Text>
              <Text style={[styles.phaseName, { color: boss.accent }]}>
                {getBossPhaseName(boss.id, bossPhase).toUpperCase()}
              </Text>
            </View>
            <View style={styles.breakReadout}>
              <View style={styles.breakLabels}>
                <Text style={styles.breakLabel}>BREAK</Text>
                <Text style={styles.breakValue}>{stagger}%</Text>
              </View>
              <View style={styles.breakTrack}>
                <View style={[styles.breakFill, { width: staggerPercent }]} />
              </View>
            </View>
            <View style={styles.comboBadge}>
              <Text style={styles.comboValue}>x{getComboMultiplier(combo).toFixed(2)}</Text>
              <Text style={styles.comboLabel}>VARIETY</Text>
            </View>
          </View>
          <View style={[styles.intentCard, { borderColor: `${bossIntent.color}88` }]}>
            <GameIcon token={bossIntent.icon} size={38} />
            <View style={styles.intentCopy}>
              <Text style={styles.intentEyebrow}>NEXT BOSS INTENT</Text>
              <Text style={[styles.intentName, { color: bossIntent.color }]}>{bossIntent.name.toUpperCase()}</Text>
              <Text style={styles.intentDescription}>{bossIntent.description}</Text>
            </View>
            <Text style={[styles.intentThreat, { color: bossIntent.color }]}>
              {bossIntent.kind === 'heavy' ? 'HEAVY' : bossIntent.kind === 'drain' ? 'DRAIN' : bossIntent.kind === 'fortify' ? 'WARD' : 'STRIKE'}
            </Text>
          </View>
          <View style={styles.combatModifierRow}>
            <View style={[styles.combatModifier, { borderColor: `${dungeonAffix.accent}70` }]}>
              <GameIcon token={dungeonAffix.icon} size={25} />
              <View style={styles.combatModifierCopy}>
                <Text style={[styles.combatModifierName, { color: dungeonAffix.accent }]}>{dungeonAffix.name.toUpperCase()}</Text>
                <Text style={styles.combatModifierText}>{dungeonAffix.description}</Text>
              </View>
            </View>
            <View style={[styles.combatModifier, { borderColor: `${character.color}70` }]}>
              <GameIcon token={character.icon} size={25} />
              <View style={styles.combatModifierCopy}>
                <Text style={[styles.combatModifierName, { color: character.color }]}>{getClassMechanicName(characterClass).toUpperCase()}</Text>
                <Text style={styles.combatModifierText}>
                  {classStatus.id
                    ? `${classStatus.turns} turns · ${classStatus.potency} potency`
                    : 'Ready to activate through your class actions'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.arena}>
          <View style={[styles.arenaGlow, { backgroundColor: boss.accent }]} />
          <View style={styles.floorOuter} />
          <View style={styles.floorInner} />

          <Animated.View
            style={[
              styles.bossModel,
              {
                transform: [
                  { translateX: bossX },
                  { translateX: bossShake },
                  { translateY: bossY },
                ],
              },
            ]}
          >
            <Image
              source={boss.source}
              style={styles.bossImage}
              resizeMode="contain"
              accessibilityLabel={`${boss.name} raid boss`}
            />
          </Animated.View>

          <Animated.Text
            style={[
              styles.bossDamage,
              {
                color: bossFloat.color,
                opacity: bossDamageOpacity,
                transform: [{ translateY: bossDamageY }],
              },
            ]}
          >
            {bossFloat.text}
          </Animated.Text>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.combatEffect,
              combatEffect.kind === 'steel' && styles.steelEffect,
              combatEffect.kind === 'arcane' && styles.arcaneEffect,
              combatEffect.kind === 'chi' && styles.chiEffect,
              combatEffect.kind === 'arrow' && styles.arrowEffect,
              {
                backgroundColor:
                  combatEffect.kind === 'steel' ||
                  combatEffect.kind === 'arrow'
                    ? 'transparent'
                    : `${combatEffect.color}25`,
                borderColor: combatEffect.color,
                opacity: slashOpacity,
                shadowColor: combatEffect.color,
                transform: [
                  { translateX: effectX },
                  { scale: effectScale },
                ],
              },
            ]}
          >
            <GameIcon token={combatEffect.icon} size={70} />
          </Animated.View>

          <Animated.View
            style={[
              styles.heroAura,
              {
                backgroundColor: appearance.accent,
                opacity: auraOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.heroModel,
              {
                transform: [
                  { translateX: heroX },
                  { translateX: heroShake },
                  { translateY: heroY },
                ],
              },
            ]}
          >
            <Image
              source={equippedGear.source}
              style={[
                styles.heroImage,
                {
                  transform: [
                    { scale: evolution.scale },
                    { scaleX: evolution.widthScale },
                  ],
                },
              ]}
              resizeMode="contain"
              accessibilityLabel={`${characterName} attacking ${boss.name}`}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.allyModels,
              { transform: [{ translateX: allyStrikeX }] },
            ]}
            pointerEvents="none"
          >
            {partyMembers.map((friend) => (
              <View key={friend.id} style={styles.allyModel}>
                <Image
                  source={CLASS_SPRITES[friend.characterClass]}
                  style={styles.allyImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </Animated.View>

          <Animated.Text
            style={[
              styles.partyDamage,
              {
                color: partyFloat.color,
                opacity: partyDamageOpacity,
                transform: [{ translateY: partyDamageY }],
              },
            ]}
          >
            {partyFloat.text}
          </Animated.Text>

          <Animated.Text
            style={[
              styles.heroDamage,
              {
                color: heroFloat.color,
                opacity: heroDamageOpacity,
                transform: [{ translateY: heroDamageY }],
              },
            ]}
          >
            {heroFloat.text}
          </Animated.Text>
        </View>

        <View style={styles.partyAssistCard}>
          <View>
            <Text style={styles.partyAssistLabel}>CO-OP ASSIST</Text>
            <Text style={styles.partyAssistTitle}>
              {partyMembers.length > 0
                ? `${partyMembers.map((friend) => friend.name).join(', ')} are fighting`
                : 'No friends are in your active party'}
            </Text>
          </View>
          <View style={[styles.partyCount, partyMembers.length > 0 && styles.partyCountActive]}>
            <Text style={styles.partyCountText}>{partyMembers.length + 1}/4</Text>
          </View>
        </View>

        <Text style={styles.status}>{status}</Text>

        <View style={styles.playerStats}>
          <View style={styles.hpLabels}>
            <View style={styles.combatantIdentity}>
              <GameIcon token={character.icon} size={28} />
              <Text style={styles.combatantName}>{characterName.toUpperCase()} · LV {level}</Text>
            </View>
            <Text style={styles.hpText}>{playerHp} / {playerMaxHp} HP</Text>
          </View>
          <View style={styles.hpBar}>
            <View style={[styles.playerHp, { width: playerHpPercent }]} />
          </View>
          <View style={styles.energyRow}>
            <Text style={styles.energyLabel}>ENERGY</Text>
            <View style={styles.energyTrack}>
              <View style={[styles.energyFill, { width: `${energy}%` }]} />
            </View>
            <Text style={styles.energyValue}>{energy}</Text>
          </View>
        </View>

        {outcome === 'fighting' ? (
          <View style={styles.actions}>
            <View style={[styles.combatKitCard, { borderColor: `${character.color}70` }]}>
              <View>
                <View style={styles.combatKitTitleRow}>
                  <GameIcon token={character.icon} size={27} />
                  <Text style={[styles.combatKitClass, { color: character.color }]}> 
                    {characterClass.toUpperCase()} COMBAT STYLE
                  </Text>
                </View>
                <Text style={styles.combatKitIdentity}>{combatKit.identity} · {tacticalTrait}</Text>
              </View>
              <Text style={styles.combatKitLevel}>SKILL LINKED</Text>
            </View>
            <View style={styles.actionRow}>
              {combatKit.actions.slice(0, 2).map((action) => (
                <AttackButton
                  key={action.id}
                  icon={action.icon}
                  title={action.name.toUpperCase()}
                  subtitle={getCoreActionSubtitle(action)}
                  mastery={getMasteryNames(action)}
                  color={action.color}
                  cooldown={cooldowns[action.id] ?? 0}
                  disabled={turnLocked || partyLinkLost || energy < action.energyCost || (cooldowns[action.id] ?? 0) > 0}
                  onPress={() => void useCoreAction(action)}
                />
              ))}
            </View>
            {combatKit.actions.slice(2).map((action) => (
              <AttackButton
                key={action.id}
                icon={action.icon}
                title={action.name.toUpperCase()}
                subtitle={getCoreActionSubtitle(action)}
                mastery={getMasteryNames(action)}
                color={action.color}
                cooldown={cooldowns[action.id] ?? 0}
                disabled={turnLocked || partyLinkLost || energy < action.energyCost || (cooldowns[action.id] ?? 0) > 0}
                onPress={() => void useCoreAction(action)}
              />
            ))}
            <View style={styles.abilityHeader}>
              <View style={styles.combatKitTitleRow}>
                <GameIcon token={character.icon} size={25} />
                <Text style={styles.abilityHeaderText}>{characterClass.toUpperCase()} ABILITIES</Text>
              </View>
              <Text style={styles.abilityCount}>
                {activeAbilities.length} EQUIPPED
              </Text>
            </View>
            {activeAbilities.map((skill) => (
              <AttackButton
                key={skill.id}
                icon={skill.icon}
                title={skill.name.toUpperCase()}
                subtitle={skill.effectText}
                mastery={['Skill tree active']}
                color={skill.tier === 3 || skill.tier >= 8 ? '#FFCE6A' : character.color}
                cooldown={cooldowns[skill.id] ?? 0}
                disabled={
                  turnLocked || partyLinkLost || energy < (skill.active?.energyCost ?? 0) || (cooldowns[skill.id] ?? 0) > 0
                }
                onPress={() => void useClassAbility(skill)}
              />
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.resultCard,
              outcome === 'victory' ? styles.victoryCard : styles.defeatCard,
            ]}
          >
            <GameIcon token={outcome === 'victory' ? 'status-victory' : 'status-defeat'} size={72} />
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle}>
                {outcome === 'victory'
                  ? boss.isFinalBoss
                    ? 'DUNGEON CLEARED'
                    : 'ROOM CLEARED'
                  : 'EXPEDITION FAILED'}
              </Text>
              <Text style={styles.resultText}>
                {outcome === 'victory'
                  ? boss.isFinalBoss
                    ? victoryRewardEarned
                      ? `${dungeon.name} is complete. This raid’s daily reward was claimed.`
                      : `${dungeon.name} is complete. This raid’s XP reward was already claimed today.`
                    : `${boss.name} is defeated. Your current HP carries into the next room.`
                  : `The party fell in room ${roomIndex + 1}. Restart the dungeon and choose your shrine boon carefully.`}
              </Text>
            </View>
            <Pressable
              style={styles.retryButton}
              onPress={
                outcome === 'victory'
                  ? boss.isFinalBoss
                    ? leaveDungeon
                    : () => void advanceRoom()
                  : restartDungeon
              }
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>
                {outcome === 'victory'
                  ? boss.isFinalBoss
                    ? 'CHOOSE DUNGEON'
                    : 'CONTINUE DEEPER'
                  : 'RESTART RUN'}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.rewardCard}>
          <GameIcon token="status-trophy" size={58} />
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardTitle}>FINAL BOSS CHEST</Text>
            <Text style={styles.rewardText}>
              {raidRewardAvailable
                ? `${Math.round((getRaidBoss(dungeon.bossId).rewardXp * dungeonAffix.rewardMultiplier) / 5) * 5} XP and +2 to your class stat await at room ${dungeon.rooms.length}.`
                : 'Claimed for this raid today. Other raids still have their own daily rewards.'}
            </Text>
          </View>
        </View>

        <View style={styles.logCard}>
          <Text style={styles.logTitle}>BATTLE LOG</Text>
          {battleLog.map((entry, index) => (
            <Text key={`${entry}-${index}`} style={styles.logEntry}>
              {index === 0 ? '›' : '·'} {entry}
            </Text>
          ))}
        </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RaidLobbyMember({
  name,
  characterClass,
  source,
  online,
  ready,
}: {
  name: string;
  characterClass?: FriendProfile['characterClass'];
  source?: ImageSourcePropType;
  online: boolean;
  ready: boolean;
}) {
  return (
    <View style={styles.raidLobbyMember}>
      <View
        style={[
          styles.raidLobbyPortrait,
          characterClass && {
            borderColor: CHARACTER_CLASSES[characterClass].color,
          },
          !online && styles.raidLobbyPortraitOffline,
        ]}
      >
        {characterClass ? (
          <Image
            source={source ?? CLASS_SPRITES[characterClass]}
            style={styles.raidLobbyPortraitImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.raidLobbyOpenIcon}>+</Text>
        )}
        <View
          style={[
            styles.raidLobbyPresence,
            !online && styles.raidLobbyPresenceOffline,
          ]}
        />
      </View>
      <Text style={styles.raidLobbyMemberName} numberOfLines={1}>{name}</Text>
      <Text
        style={[
          styles.raidLobbyMemberState,
          ready && styles.raidLobbyMemberReady,
        ]}
      >
        {!online ? 'OFFLINE' : ready ? '✓ READY' : 'ONLINE'}
      </Text>
    </View>
  );
}

function DungeonRunHeader({
  dungeon,
  room,
  roomIndex,
  routeX,
  travelScale,
  raidWins,
  onLeave,
  isPartyRaid = false,
  partyMembers = [],
}: {
  dungeon: DungeonDefinition;
  room: DungeonRoom;
  roomIndex: number;
  routeX: Animated.AnimatedInterpolation<number>;
  travelScale: Animated.AnimatedInterpolation<number>;
  raidWins: number;
  onLeave: () => void;
  isPartyRaid?: boolean;
  partyMembers?: readonly FriendProfile[];
}) {
  return (
    <>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.eyebrow, { color: dungeon.accent }]}>
            {isPartyRaid ? 'LIVE 4-PLAYER RAID' : `ACTIVE DUNGEON · RUN ${raidWins + 1}`}
          </Text>
          <Text style={styles.title}>{dungeon.name.toUpperCase()}</Text>
          <Text style={[styles.bossTitle, { color: dungeon.accent }]}>
            ROOM {roomIndex + 1} OF {dungeon.rooms.length} · {room.name}
          </Text>
        </View>
        <Pressable
          style={styles.exitDungeonButton}
          onPress={onLeave}
          accessibilityRole="button"
          accessibilityLabel="Leave dungeon"
        >
          <Text style={styles.exitDungeonIcon}>⌁</Text>
          <Text style={styles.exitDungeonText}>EXIT</Text>
        </Pressable>
      </View>

      <View style={styles.dungeonMapCard}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>{isPartyRaid ? 'SYNCHRONIZED PARTY LINK' : 'DUNGEON PROGRESS'}</Text>
          <Text style={[styles.mapPercent, { color: dungeon.accent }]}>
            {isPartyRaid ? '4 / 4 LIVE' : `${Math.round(((roomIndex + 1) / dungeon.rooms.length) * 100)}%`}
          </Text>
        </View>
        {isPartyRaid ? (
          <View style={styles.livePartyStrip}>
            <View style={[styles.livePartyToken, { borderColor: dungeon.accent }]}>
              <Text style={styles.livePartyTokenText}>YOU</Text>
              <View style={styles.livePartyOnlineDot} />
            </View>
            {partyMembers.map((friend) => (
              <View key={friend.id} style={[styles.livePartyToken, { borderColor: CHARACTER_CLASSES[friend.characterClass].color }]}>
                <Image source={CLASS_SPRITES[friend.characterClass]} style={styles.livePartyTokenImage} resizeMode="contain" />
                <View style={styles.livePartyOnlineDot} />
              </View>
            ))}
            <Text style={styles.livePartyBattleText}>ALL MEMBERS BATTLING</Text>
          </View>
        ) : (
        <>
        <View style={styles.mapTrackWrap}>
          <View style={styles.mapTrack} />
          <View
            style={[
              styles.mapTrackComplete,
              {
                backgroundColor: dungeon.accent,
                width: `${(roomIndex / (dungeon.rooms.length - 1)) * 100}%`,
              },
            ]}
          />
          {dungeon.rooms.map((mapRoom, index) => {
            const completed = index < roomIndex;
            const active = index === roomIndex;
            return (
              <View
                key={mapRoom.id}
                style={[
                  styles.mapNode,
                  completed && { backgroundColor: dungeon.accent, borderColor: dungeon.accent },
                  active && { borderColor: dungeon.accent, backgroundColor: `${dungeon.accent}35` },
                ]}
              >
                <GameIcon token={completed ? 'status-victory' : mapRoom.icon} size={25} />
              </View>
            );
          })}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.mapTraveler,
              {
                backgroundColor: dungeon.accent,
                shadowColor: dungeon.accent,
                transform: [{ translateX: routeX }, { scale: travelScale }],
              },
            ]}
          >
            <GameIcon token="skill-geometry" size={22} />
          </Animated.View>
        </View>
        <View style={styles.mapLabels}>
          {dungeon.rooms.map((mapRoom) => (
            <Text key={`${mapRoom.id}-label`} style={styles.mapLabel} numberOfLines={1}>
              {mapRoom.kind === 'path'
                ? 'ROUTE'
                : mapRoom.kind === 'rest'
                  ? 'SHRINE'
                  : mapRoom.kind === 'boss'
                    ? 'BOSS'
                    : 'FOE'}
            </Text>
          ))}
        </View>
        </>
        )}
      </View>
    </>
  );
}

function AttackButton({
  icon,
  title,
  subtitle,
  mastery = [],
  color,
  cooldown = 0,
  disabled,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  mastery?: readonly string[];
  color: string;
  cooldown?: number;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.attackButton,
        { borderColor: color },
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressedButton,
      ]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={`${title}, ${subtitle}${cooldown > 0 ? `, ready in ${cooldown} turns` : ''}`}
    >
      <View style={styles.attackTitleRow}>
        <GameIcon token={icon} size={34} />
        <Text style={[styles.attackTitle, { color }]}>{title}</Text>
        {cooldown > 0 && (
          <View style={styles.cooldownBadge}>
            <Text style={styles.cooldownText}>{cooldown}T</Text>
          </View>
        )}
      </View>
      <Text style={styles.attackSubtitle}>{subtitle}</Text>
      {mastery.length > 0 && (
        <Text style={[styles.attackMastery, { color }]} numberOfLines={1}>
          MASTERY · {mastery.join(' + ').toUpperCase()}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080A10',
  },
  content: {
    padding: 18,
    paddingBottom: 48,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
  },
  eyebrow: {
    color: '#FF8B5E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  bossTitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 19,
    marginBottom: 9,
  },
  rosterLabel: {
    color: '#A5ABBA',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  rosterCount: {
    color: '#5F6679',
    fontSize: 8,
    fontWeight: '900',
  },
  bossRoster: {
    gap: 9,
    paddingRight: 8,
  },
  bossOption: {
    width: 104,
    height: 122,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#292D3B',
    backgroundColor: '#131620',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingTop: 5,
  },
  bossOptionImage: {
    width: 83,
    height: 80,
  },
  bossOptionName: {
    width: '100%',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  bossOptionLevel: {
    fontSize: 7,
    fontWeight: '900',
    marginTop: 2,
  },
  victoryBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171A25',
    borderWidth: 1,
    borderColor: '#343849',
  },
  victoryValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  victoryLabel: {
    color: '#777F94',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bossStats: {
    marginTop: 16,
  },
  bossDescription: {
    color: '#747B8F',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 7,
  },
  wardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  wardLabel: {
    width: 72,
    color: '#72D4FF',
    fontSize: 8,
    fontWeight: '900',
  },
  wardTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#202938',
    overflow: 'hidden',
  },
  wardFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#72D4FF',
  },
  bossTacticalRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 7,
    marginTop: 10,
  },
  phaseBadge: {
    flex: 1.1,
    borderRadius: 10,
    backgroundColor: '#151824',
    borderWidth: 1,
    borderColor: '#303445',
    padding: 8,
  },
  phaseLabel: {
    color: '#777F93',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  phaseName: {
    fontSize: 8,
    fontWeight: '900',
    marginTop: 3,
  },
  breakReadout: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#151824',
    borderWidth: 1,
    borderColor: '#303445',
    padding: 8,
  },
  breakLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakLabel: {
    color: '#FFB05C',
    fontSize: 7,
    fontWeight: '900',
  },
  breakValue: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
  },
  breakTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#302A24',
    overflow: 'hidden',
    marginTop: 6,
  },
  breakFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFB05C',
  },
  comboBadge: {
    width: 62,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#19152A',
    borderWidth: 1,
    borderColor: '#4D426F',
  },
  comboValue: {
    color: '#B8A3FF',
    fontSize: 12,
    fontWeight: '900',
  },
  comboLabel: {
    color: '#7D7591',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  intentCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    backgroundColor: '#141620',
    padding: 10,
    marginTop: 8,
  },
  intentCopy: {
    flex: 1,
    marginLeft: 8,
  },
  intentEyebrow: {
    color: '#777F93',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  intentName: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  intentDescription: {
    color: '#9299AB',
    fontSize: 8,
    lineHeight: 11,
    marginTop: 3,
  },
  intentThreat: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginLeft: 6,
  },
  combatModifierRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  combatModifier: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#10131C',
    padding: 9,
  },
  combatModifierCopy: {
    flex: 1,
    marginLeft: 7,
  },
  combatModifierName: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  combatModifierText: {
    color: '#858DA0',
    fontSize: 7,
    lineHeight: 10,
    marginTop: 3,
  },
  playerStats: {
    marginTop: 4,
  },
  hpLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  combatantName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  combatantIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hpText: {
    color: '#A0A6B8',
    fontSize: 10,
    fontWeight: '800',
  },
  hpBar: {
    height: 11,
    backgroundColor: '#242735',
    borderRadius: 6,
    overflow: 'hidden',
  },
  bossHp: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#FF5F57',
  },
  playerHp: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#59E398',
  },
  arena: {
    height: 315,
    marginTop: 10,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#11131D',
    borderWidth: 1,
    borderColor: '#292C3B',
  },
  arenaGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    right: -50,
    top: -80,
    backgroundColor: '#822E20',
    opacity: 0.16,
  },
  floorOuter: {
    position: 'absolute',
    width: 370,
    height: 100,
    borderRadius: 185,
    left: -10,
    bottom: -25,
    borderWidth: 2,
    borderColor: '#332F4A',
    backgroundColor: '#171925',
  },
  floorInner: {
    position: 'absolute',
    width: 240,
    height: 55,
    borderRadius: 120,
    left: 55,
    bottom: -2,
    borderWidth: 1,
    borderColor: '#5C4778',
  },
  bossModel: {
    position: 'absolute',
    width: 270,
    height: 220,
    right: -12,
    top: 5,
  },
  bossImage: {
    width: '100%',
    height: '100%',
  },
  heroModel: {
    position: 'absolute',
    width: 145,
    height: 205,
    left: 14,
    bottom: 3,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  allyModels: {
    position: 'absolute',
    left: 116,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    zIndex: 3,
  },
  allyModel: {
    width: 42,
    height: 72,
    marginLeft: -8,
  },
  allyImage: {
    width: '100%',
    height: '100%',
  },
  heroAura: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    left: 20,
    bottom: 27,
  },
  bossDamage: {
    position: 'absolute',
    right: 100,
    top: 55,
    zIndex: 5,
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: '#000000',
    textShadowRadius: 5,
  },
  heroDamage: {
    position: 'absolute',
    left: 68,
    bottom: 112,
    zIndex: 5,
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: '#000000',
    textShadowRadius: 5,
  },
  combatEffect: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    right: 68,
    top: 72,
    zIndex: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  steelEffect: {
    borderWidth: 0,
  },
  arcaneEffect: {
    borderStyle: 'dashed',
  },
  chiEffect: {
    borderWidth: 5,
  },
  arrowEffect: {
    borderWidth: 0,
    width: 145,
    right: 52,
  },
  status: {
    color: '#BFC4D3',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 18,
    marginVertical: 10,
  },
  partyAssistCard: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2F3150',
    backgroundColor: '#151724',
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partyAssistLabel: {
    color: '#8B7CFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  partyAssistTitle: {
    color: '#B7BCCA',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
    maxWidth: 260,
  },
  partyCount: {
    width: 42,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#292C39',
    marginLeft: 8,
  },
  partyCountActive: {
    backgroundColor: '#4D469C',
  },
  partyCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },
  energyLabel: {
    color: '#65C7FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    width: 52,
  },
  energyTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#242735',
  },
  energyFill: {
    height: '100%',
    backgroundColor: '#65C7FF',
  },
  energyValue: {
    width: 30,
    color: '#65C7FF',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
  },
  actions: {
    gap: 9,
    marginTop: 16,
  },
  combatKitCard: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: '#151824',
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  combatKitClass: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  combatKitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  combatKitIdentity: {
    color: '#9299AB',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 3,
  },
  combatKitLevel: {
    color: '#6E7589',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 9,
  },
  abilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 1,
  },
  abilityHeaderText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  abilityCount: {
    color: '#747B8F',
    fontSize: 8,
    fontWeight: '900',
  },
  attackButton: {
    flex: 1,
    minHeight: 67,
    justifyContent: 'center',
    backgroundColor: '#171A25',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
    opacity: 0.88,
  },
  disabledButton: {
    opacity: 0.36,
  },
  attackTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    flex: 1,
  },
  attackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attackSubtitle: {
    color: '#7F8699',
    fontSize: 9,
    marginTop: 4,
  },
  attackMastery: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.55,
    marginTop: 6,
  },
  cooldownBadge: {
    minWidth: 28,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B2E3C',
    borderWidth: 1,
    borderColor: '#4A4F63',
  },
  cooldownText: {
    color: '#C7CCDA',
    fontSize: 8,
    fontWeight: '900',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  victoryCard: {
    backgroundColor: '#17251F',
    borderColor: '#3D765A',
  },
  defeatCard: {
    backgroundColor: '#25191C',
    borderColor: '#744049',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 10,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  resultText: {
    color: '#9299AA',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
  },
  retryButton: {
    backgroundColor: '#635BFF',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginLeft: 9,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  rewardCard: {
    flexDirection: 'row',
    backgroundColor: '#151827',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#373044',
    padding: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  rewardText: {
    color: '#8F96A8',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  logCard: {
    backgroundColor: '#11131C',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  logTitle: {
    color: '#777F94',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  logEntry: {
    color: '#A8ADBC',
    fontSize: 10,
    lineHeight: 17,
  },
  selectionSubtitle: {
    color: '#777F92',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
  },
  expeditionBrief: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    padding: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#37314D',
    backgroundColor: '#151426',
  },
  expeditionBriefIcon: {
    fontSize: 28,
  },
  expeditionBriefCopy: {
    flex: 1,
  },
  expeditionBriefTitle: {
    color: '#C5B9FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  expeditionBriefText: {
    color: '#8D92A4',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  dungeonSectionLabel: {
    color: '#A9AFBE',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: 22,
    marginBottom: 9,
  },
  dungeonCard: {
    minHeight: 142,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#121520',
    marginBottom: 11,
    paddingRight: 13,
  },
  dungeonCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  dungeonCardLocked: {
    backgroundColor: '#10121A',
    borderColor: '#272A36',
  },
  dungeonCardGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    left: -75,
    opacity: 0.12,
  },
  dungeonCardBoss: {
    width: 112,
    height: 130,
    marginLeft: -2,
  },
  dungeonCardBossLocked: {
    opacity: 0.28,
  },
  dungeonCardInfo: {
    flex: 1,
    paddingVertical: 13,
  },
  dungeonCardName: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dungeonCardSubtitle: {
    color: '#8B92A4',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 4,
  },
  dungeonMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 9,
  },
  dungeonMeta: {
    color: '#626A7C',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.65,
  },
  affixPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#10131D',
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginTop: 8,
  },
  affixPillText: {
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  recommendedLevel: {
    color: '#FFB45E',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 8,
  },
  recommendedReady: {
    color: '#54D68A',
  },
  dungeonComplete: {
    position: 'absolute',
    right: 0,
    bottom: 13,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  dungeonArrow: {
    color: '#7A8295',
    fontSize: 28,
    fontWeight: '400',
    marginLeft: 4,
  },
  exitDungeonButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#343949',
    backgroundColor: '#161925',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitDungeonIcon: {
    color: '#A9AFBE',
    fontSize: 17,
    lineHeight: 17,
  },
  exitDungeonText: {
    color: '#747C90',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 2,
  },
  dungeonMapCard: {
    marginTop: 17,
    marginBottom: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2B3040',
    backgroundColor: '#11141E',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapTitle: {
    color: '#8E95A8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  mapPercent: {
    fontSize: 9,
    fontWeight: '900',
  },
  mapTrackWrap: {
    height: 50,
    marginTop: 8,
    paddingHorizontal: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapTrack: {
    position: 'absolute',
    left: 17,
    right: 17,
    top: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#303546',
  },
  mapTrackComplete: {
    position: 'absolute',
    left: 17,
    top: 24,
    height: 3,
    borderRadius: 2,
  },
  mapNode: {
    zIndex: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#40475B',
    backgroundColor: '#171B27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapNodeIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  mapTraveler: {
    position: 'absolute',
    zIndex: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    left: 12,
    top: -2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 7,
  },
  mapTravelerIcon: {
    color: '#FFFFFF',
    fontSize: 7,
  },
  mapLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapLabel: {
    width: 45,
    color: '#596174',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.45,
    textAlign: 'center',
  },
  eventScene: {
    height: 238,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2B3040',
    backgroundColor: '#10131D',
  },
  eventGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    alignSelf: 'center',
    top: -175,
    opacity: 0.18,
  },
  eventStars: {
    position: 'absolute',
    top: 24,
    left: 34,
    right: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventStar: {
    color: '#8B83B7',
    fontSize: 15,
  },
  walkingHero: {
    position: 'absolute',
    width: 132,
    height: 178,
    alignSelf: 'center',
    bottom: 14,
    zIndex: 2,
  },
  walkingHeroImage: {
    width: '100%',
    height: '100%',
  },
  eventFloor: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: -25,
    height: 78,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#393650',
    backgroundColor: '#171A25',
  },
  travelCard: {
    alignItems: 'center',
    padding: 20,
    marginTop: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2C3141',
    backgroundColor: '#121520',
  },
  travelEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  travelTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 5,
  },
  travelDots: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 13,
  },
  travelDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  roomEventCard: {
    alignItems: 'center',
    padding: 19,
    marginTop: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D3242',
    backgroundColor: '#121520',
  },
  roomEventIcon: {
    fontSize: 30,
  },
  roomEventKind: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 7,
  },
  roomEventTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },
  roomEventDescription: {
    maxWidth: 290,
    color: '#8C93A5',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 7,
  },
  primaryDungeonButton: {
    minHeight: 52,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 15,
    paddingHorizontal: 17,
    marginTop: 19,
  },
  primaryDungeonButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  primaryDungeonButtonArrow: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  pathChoiceWrap: {
    alignSelf: 'stretch',
    marginTop: 18,
  },
  pathChoiceLabel: {
    color: '#8E96A9',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  pathBoonChoices: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
  },
  pathBoonButton: {
    flex: 1,
    minHeight: 125,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: '#181C28',
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  boonChoices: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  boonButton: {
    flex: 1,
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#181C28',
    padding: 10,
  },
  boonIcon: {
    fontSize: 24,
  },
  boonTitle: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 7,
  },
  boonText: {
    color: '#777F92',
    fontSize: 8,
    textAlign: 'center',
    marginTop: 4,
  },
  runResourceCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 13,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2B3040',
    backgroundColor: '#10131C',
  },
  runResourceLabel: {
    color: '#687084',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  runResourceValue: {
    color: '#54D68A',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
  raidModeTabs: { flexDirection: 'row', gap: 7, marginTop: 18, padding: 4, borderRadius: 15, backgroundColor: '#11141E', borderWidth: 1, borderColor: '#292E3D' },
  raidModeTab: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  raidModeTabActive: { backgroundColor: '#655BCE' },
  raidModeTabText: { color: '#747C90', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  raidModeTabTextActive: { color: '#FFFFFF' },
  partyRaidRoster: { gap: 9, paddingRight: 10, paddingBottom: 4 },
  partyRaidOption: { width: 132, minHeight: 150, alignItems: 'center', padding: 8, borderRadius: 17, borderWidth: 1, borderColor: '#2C3141', backgroundColor: '#121520' },
  partyRaidOptionLocked: { opacity: 0.42 },
  partyRaidOptionImage: { width: 104, height: 103 },
  partyRaidOptionName: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  partyRaidOptionTier: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5, marginTop: 4 },
  raidLobbyCard: { overflow: 'hidden', marginTop: 14, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: '#403968', backgroundColor: '#141523' },
  raidLobbyGlow: { position: 'absolute', width: 330, height: 330, borderRadius: 165, top: -240, alignSelf: 'center', opacity: 0.16 },
  raidLobbyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  raidLobbyEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  raidLobbyTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 4 },
  raidLobbySubtitle: { maxWidth: 240, color: '#848B9D', fontSize: 9, lineHeight: 14, marginTop: 4 },
  lobbyStatusBadge: { minWidth: 48, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 10, backgroundColor: '#313647', alignItems: 'center' },
  lobbyStatusReady: { backgroundColor: '#267148' },
  lobbyStatusText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  readyRoster: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  raidLobbyMember: { width: '23%', alignItems: 'center' },
  raidLobbyPortrait: { width: 58, height: 58, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4A5165', backgroundColor: '#1B1F2C' },
  raidLobbyPortraitOffline: { opacity: 0.42, borderColor: '#343949' },
  raidLobbyPortraitImage: { width: '100%', height: '100%' },
  raidLobbyOpenIcon: { color: '#535B6F', fontSize: 22 },
  raidLobbyPresence: { position: 'absolute', right: 4, bottom: 4, width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: '#141523', backgroundColor: '#54D68A' },
  raidLobbyPresenceOffline: { backgroundColor: '#596174' },
  raidLobbyMemberName: { maxWidth: 72, color: '#B7BDCA', fontSize: 8, fontWeight: '900', textAlign: 'center', marginTop: 6 },
  raidLobbyMemberState: { color: '#54D68A', fontSize: 6, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
  raidLobbyMemberReady: { color: '#FFCE6A' },
  raidGateWarning: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 16, padding: 11, borderRadius: 13, borderWidth: 1, borderColor: '#64414A', backgroundColor: '#24191E' },
  raidGateWarningIcon: { fontSize: 17 },
  raidGateWarningText: { flex: 1, color: '#D8A6B0', fontSize: 9, lineHeight: 14 },
  lobbyActions: { gap: 9, marginTop: 16 },
  rallyButton: { minHeight: 47, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: '#514A93', backgroundColor: '#24233B' },
  rallyButtonText: { color: '#C9C2FF', fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  launchRaidButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, paddingHorizontal: 16 },
  launchRaidButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  launchRaidArrow: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  lobbyButtonDisabled: { opacity: 0.3 },
  partyLinkLostCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#794653', backgroundColor: '#291A20' },
  partyLinkLostIcon: { fontSize: 21 },
  partyLinkLostCopy: { flex: 1 },
  partyLinkLostTitle: { color: '#FF9EAD', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  partyLinkLostText: { color: '#B68B94', fontSize: 8, lineHeight: 12, marginTop: 3 },
  partyDamage: { position: 'absolute', left: 112, bottom: 91, zIndex: 7, fontSize: 14, fontWeight: '900', textShadowColor: '#000000', textShadowRadius: 5 },
  livePartyStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13 },
  livePartyToken: { width: 45, height: 45, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, backgroundColor: '#1A1E2A' },
  livePartyTokenText: { color: '#FFFFFF', fontSize: 7, fontWeight: '900' },
  livePartyTokenImage: { width: '100%', height: '100%' },
  livePartyOnlineDot: { position: 'absolute', right: 3, bottom: 3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#54D68A', borderWidth: 1, borderColor: '#11141E' },
  livePartyBattleText: { flex: 1, color: '#54D68A', fontSize: 8, fontWeight: '900', letterSpacing: 0.7, textAlign: 'right' },
});
