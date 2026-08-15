# Mövee — historical product case study

> **Status:** Historical case study for a private real-time nightlife coordination product. This repository documents the product and engineering approach; it is not a live release tracker or an open-source copy of the application.

## Product problem

Planning a night out across a group chat creates fragmented decisions: where to go, when plans change, who has joined, and where the group is now. Discovery products can suggest venues, but they do not own the coordination workflow.

## Product direction

Mövee explored a shared “Move”: a multi-venue plan friends could join and update together.

- Build and revise a group itinerary
- Coordinate through real-time messages and presence
- Share intentionally imprecise location state
- Surface venue activity without requiring exact-location exposure

## Engineering surface

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo |
| Data | Supabase Postgres, PostGIS |
| Realtime | Supabase Realtime and Presence |
| Client state | TanStack Query, Zustand |
| Operations | Sentry, PostHog |

## Decisions highlighted

### Shared state under change

Plans, membership, chat, and presence can all change concurrently. The product required explicit ownership of server state, optimistic client behavior, and recovery when a participant reconnects.

### Location as a privacy boundary

The design treated location as approximate coordination data rather than a precise tracking feed. Stored and displayed location needed bounded precision, clear user control, and expiration behavior.

### Spatial queries as product infrastructure

PostGIS supported nearby-venue and distance queries while keeping spatial rules in one data layer instead of scattering calculations across clients.

### Operable real-time features

Realtime behavior was paired with monitoring, permission boundaries, and fallback paths. A working demo connection was not treated as proof that group coordination would recover cleanly in production.

## Architecture

```text
Expo app
  ├─ Moves and membership
  ├─ Chat and presence
  └─ Venue and approximate-location views
          │
          ▼
TanStack Query + Zustand
          │
          ▼
Supabase
  ├─ Postgres + PostGIS
  ├─ Realtime + Presence
  └─ Edge Functions
```

## What this case study demonstrates

Mövee is included as a retrospective on product architecture across mobile UX, shared state, spatial data, privacy, and production operations. Exact commit counts, migration counts, and release-stage labels are intentionally omitted because they age faster than the engineering decisions.
