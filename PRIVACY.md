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
raid actions and rewards, blocked-player records, and player-submitted content
reports. Row-level security limits social data to the authenticated users and
party members defined by the migrations. Chat messages are visible only to the
party that created them. Reports are visible only to the reporting player and
backend operators.

The current app has no analytics or advertising SDK. A public release still
needs a published retention policy for moderation records. Players can delete
their online account from Profile > Settings; the authenticated delete-account
service removes the Supabase Auth user and cascading social records. Local game
progress remains until the player separately chooses Reset Local Data.

## Platform access

- The app does not request Apple Health, Health Connect, Apple Screen Time,
  Android Usage Access, or notification-policy access.
- Fitness and digital-balance quests rely on player-entered progress and guided
  in-app activities.

Before store submission, publish a user-facing privacy policy at a stable URL,
complete Apple and Google privacy disclosures, document retention/deletion
behavior for any future account backend, and obtain appropriate review for
account and journal-data handling.
