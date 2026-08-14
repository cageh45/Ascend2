# Ascend release readiness

## Ready in this repository

- Expo SDK 54 app configuration, Android/iOS application identifiers, version
  fields, runtime versioning, icons, splash art, and EAS build profiles.
- On-device onboarding, character customization, progression, guided quests,
  class skill trees, equipment, dungeons, bosses, combat, and persistence.
- Thirty original synthesized music cues, adaptive scene selection, crossfades,
  and persistent mute/volume preferences with no microphone permission.
- Self-contained quest completion through persistent timers, manual counters,
  checklists, and private journal entries, with no health or screen-time access.
- Optional Supabase authentication, relational schema, row-level security,
  realtime subscriptions, private party presence, persistent party chat,
  friend/party RPCs, and four-player raid ready checks.
- Runtime error recovery and visible local-storage failure states.
- No generated health metrics, seeded friend identities, scripted chat replies,
  or scripted party-ready events.
- Online surfaces are feature-gated until valid Supabase public variables are
  present; the offline game remains functional without them.

## External work required before public store submission

1. **Confirm app identity.** Verify that `com.ascendfitness.mobile` is owned and
   final. Configure the Expo/EAS project owner and project ID, Apple team,
   Android keystore, and store records.
2. **Provision the backend.** Create the production Supabase project, push the
   migration, configure redirect URLs, anonymous-auth abuse protection, backups,
   email delivery, rate limits, and the two public EAS environment variables.
3. **Make progression server-authoritative.** Online raid lobbies and unanimous
   clear reporting are supported, but combat actions and quest rewards still run
   on clients. Online raid XP is deliberately zero until a trusted server action
   processor validates attacks, boss HP, quest evidence, and rewards.
4. **Add production operations.** Configure crash reporting, support/contact
   routes, in-app account/data deletion, privacy-policy and terms URLs, release
   signing, moderation/reporting, and recovery procedures.
5. **Complete device QA.** Test timers through app background/foreground cycles,
   counters, journals, accessibility, small/large-screen, offline, upgrade,
   interruption, battery, and store-review flows on real devices.

## Known dependency finding

`npm audit --omit=dev` currently reports 22 advisories (10 moderate, 12 high),
mostly through the Expo SDK 54/React Native build toolchain (`metro`, `postcss`,
`image-size`, and `xcode`/`uuid`). The audit's automated remediation upgrades
Expo to SDK 57, which is outside this
project's required SDK and is not safe to force. Recheck the supported Expo 54
patch line before submission and plan a tested SDK upgrade; do not run
`npm audit fix --force` on this branch.

## Required verification commands

```sh
npm run check
npm run verify:release
npx expo prebuild --clean --no-install
```

Do not commit generated native projects unless the project intentionally moves
away from continuous native generation. Produce signed preview builds for real
device QA before production submission.
