import { CharacterClassName } from '../game/gameData';

export type FriendProfile = {
  id: string;
  handle?: string;
  name: string;
  characterClass: CharacterClassName;
  level: number;
  status: string;
  isOnline: boolean;
  weeklyXp: number;
  raidContribution: number;
};

// Profiles must come from the authenticated multiplayer service. Production
// builds intentionally ship with no seeded people or fabricated presence.
export const FRIENDS: readonly FriendProfile[] = [];
export const FRIEND_SUGGESTIONS: readonly FriendProfile[] = [];
export const ALL_FRIENDS: readonly FriendProfile[] = [];
export const FRIEND_PROFILE_IDS: readonly string[] = [];

export function getFriendProfile(id: string) {
  return ALL_FRIENDS.find((friend) => friend.id === id);
}
