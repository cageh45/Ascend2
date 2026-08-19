# Ascend service setup

The repository contains the client integrations, database migrations, and
account-deletion Edge Function. It does
not contain cloud credentials, signing identities, or store approvals.

## 1. Create and link Supabase

Create a Supabase project, then enable anonymous sign-ins and manual account
linking in Authentication settings. Add `ascend://auth/callback` to the allowed
redirect URLs. Before a public launch, enable CAPTCHA/bot protection and review
the project's email, rate-limit, backup, and retention settings.

Configure a custom SMTP provider for production email delivery. Supabase's
default hosted sender is restricted and may only deliver to project-team
addresses. The checked-in magic-link and email-change templates use
`{{ .Token }}` so Ascend can verify codes in-app without depending on a mail
client opening a deep link.

Install or run the Supabase CLI, authenticate it, and apply the migration:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase config push
npx supabase functions deploy delete-account
```

The checked-in `supabase/config.toml` keeps anonymous sign-in, manual account
linking, the Ascend callback URL, email confirmation safeguards, and TOTP
settings consistent with the hosted project. Review the CLI diff before
confirming any future config push.

Copy `.env.example` to `.env` and enter the project's public URL and publishable
key. Never put a secret or service-role key in an `EXPO_PUBLIC_` variable.

For EAS builds, set `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in each intended EAS environment. Rebuild
after changing them because Expo embeds public variables in the client bundle.

The migrations create synced player profiles, searchable handles, friend
requests and cancellations, friendships, four-member parties, invites,
persistent chat, online heartbeats, raid sessions, ready state, RLS, private
party presence authorization, player blocking/reporting, server-authoritative
raid actions, and one verified reward per dungeon per day. The delete-account
function must remain JWT-protected and must never expose its service-role key to
the client. Generate fresh database types from the linked project after every
schema change:

```sh
npx supabase gen types typescript --linked > services/database.types.ts
```

## 2. Build the standalone app

The app does not integrate with Apple Health, Health Connect, Apple Screen Time,
or Android Usage Access. Daily quests use in-app timers, manual counters,
checklists, and journals. The iOS development profile is configured for a
physical device and includes `expo-dev-client`. For the first build on a
workstation, authenticate and link this repository to an Expo project:

```sh
npx eas-cli login
npx eas-cli init
npx eas-cli device:create
eas build --platform ios --profile development
```

`eas init` is only needed until `extra.eas.projectId` has been written to the
Expo config. `eas device:create` registers the physical iPhone for the internal
development provisioning profile. The build requires an Expo account and an
Apple Developer Program team that can create or reuse signing credentials.

No HealthKit capability, health usage description, Health Connect permission,
usage-access module, or notification-policy permission is required. The Android
build targets API 36.

## 3. Verify

```sh
npm run check
npm run verify:release
```

Test account-link callback handling, two-way friend requests, party capacity
races, private chat/presence, disconnect/reconnect behavior, and four-device raid
ready checks and synchronized actions against a staging project. Confirm that
blocking removes social access, reports are retained for review, account deletion
cascades social data, and each dungeon reward can be claimed only once per UTC
day. Exercise every timer, counter, checklist, and journal quest on real iOS and
Android builds.
