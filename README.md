# Ascend

Ascend is an Expo SDK 54 fitness RPG. It combines a self-contained, on-device
progression loop with an optional Supabase social backend for accounts, friends,
four-player parties, chat, presence, and raid lobbies.
It also ships with a 30-track original adaptive soundtrack with scene-aware
crossfades and persistent playback controls.

## Run locally

```sh
npm install
npm run check
npm start
```

Quests never request phone health or screen-time data. They are completed with
in-app timers, counters, checklists, and private journal entries, so the core
game works without platform health permissions or usage-access privileges.

## Configure services

Copy `.env.example` to `.env`, connect a Supabase project, apply the checked-in
migration, and create a development build. The app remains usable
offline and hides its Friends tab when the public Supabase variables are absent.

See [SERVICES_SETUP.md](./SERVICES_SETUP.md) for the exact setup and the release
work that still requires Expo, Apple, Google, and Supabase project ownership.

## Build

```sh
npm run build:preview
npm run build:production
```

EAS account ownership, signing credentials, and final store identifiers must be
configured before those commands can produce distributable store artifacts.
See [RELEASE_READINESS.md](./RELEASE_READINESS.md).
