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
  friend/party RPCs, player blocking/reporting, four-player raid ready checks,
  server-authoritative boss damage, and verified per-dungeon daily rewards.
- In-app online-account deletion backed by a JWT-protected Edge Function; local
  progress has a separate destructive reset.
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
3. **Choose quest trust policy.** Co-op boss damage and raid rewards are
   server-authoritative. Daily fitness quests intentionally use player-entered
   evidence because this edition has no HealthKit or screen-time access; decide
   whether that honor-system model is acceptable for future competitive modes.
4. **Add production operations.** Configure crash reporting, a staffed
   support/contact route, privacy-policy and terms URLs, release signing,
   moderation review procedures, retention rules, and recovery playbooks.
5. **Complete device QA.** Test timers through app background/foreground cycles,
   counters, journals, accessibility, small/large-screen, offline, upgrade,
   interruption, battery, and store-review flows on real devices.

## Known dependency finding

Re-run `npm audit --omit=dev` before submission. Do not use
`npm audit fix --force` when its remediation crosses the project’s required Expo
SDK 54 compatibility boundary; plan and device-test an SDK upgrade instead.

## Required verification commands

```sh
npm run check
npm run verify:release
npx expo prebuild --clean --no-install
```

Do not commit generated native projects unless the project intentionally moves
away from continuous native generation. Produce signed preview builds for real
device QA before production submission.
