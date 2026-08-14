# Ascend prototype privacy notes

This document describes the current codebase. It is an engineering disclosure,
not a final store privacy policy or legal advice.

## Data stored on the device

- Character identity, appearance, XP, quests, skills, equipment, raid progress,
  and activity history.
- Guided quest progress and up to 100 journal entries.

Local game data uses AsyncStorage and should not be described as encrypted
application storage. Ascend does not read or store phone health or screen-time
measurements.

## Data stored by optional online services

When a player explicitly enables online play, Supabase stores an account ID,
optional email, display name, handle, class and appearance, friend requests and
friendships, party membership and invites, party chat, presence/heartbeat state,
and raid lobby/result metadata. Row-level security limits social data to the
authenticated users and party members defined by the migration.

The current app has no analytics or advertising SDK. A public release still
needs an in-app account/data deletion flow and a defined retention policy for
online records.

## Platform access

- The app does not request Apple Health, Health Connect, Apple Screen Time,
  Android Usage Access, or notification-policy access.
- Fitness and digital-balance quests rely on player-entered progress and guided
  in-app activities.

Before store submission, publish a user-facing privacy policy at a stable URL,
complete Apple and Google privacy disclosures, document retention/deletion
behavior for any future account backend, and obtain appropriate review for
account and journal-data handling.
