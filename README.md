# Mövee - Nightlife Coordination Platform

> The "Nightlife OS" for planning, coordinating, and remembering nights out.

<!-- Add screenshot here: ![Movee App Screenshot](assets/movee-hero.png) -->

## The Problem

Coordinating a night out with friends is chaos. Group chats get buried, plans change, and nobody knows where everyone actually is. Existing apps solve discovery but not coordination.

## The Solution

**Mövee** is an iOS app that lets you create "Moves" - multi-venue itineraries that your friends can join. It combines:

- **Planning** - Build bar crawls with venue details and timing
- **Coordination** - Real-time chat, location sharing, activity streams
- **Discovery** - Community-powered venue activity intelligence

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React Native 0.81 (New Architecture), Expo SDK 54 |
| Styling | NativeWind 4.2 (Tailwind for RN) |
| Backend | Supabase (Postgres, Realtime, Edge Functions) |
| Spatial | PostGIS for venue/location queries |
| State | TanStack Query, Zustand |
| Monitoring | Sentry, PostHog |

## Engineering Highlights

### React Native New Architecture
One of the first apps to ship with Fabric renderer and TurboModules enabled:

```json
// app.json
{
  "expo": {
    "newArchEnabled": true
  }
}
```

### Real-Time Chat with Typing Indicators
Supabase Realtime powers live messaging:

```typescript
supabase.channel(`chat:${moveId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages'
  }, handleNewMessage)
  .on('presence', { event: 'sync' }, handleTypingIndicators)
  .subscribe();
```

### Privacy-First Location
GPS coordinates are fuzzed (100-400m) before storage:

```sql
CREATE FUNCTION fuzz_location(lat DOUBLE, lng DOUBLE)
RETURNS geometry AS $$
  SELECT ST_Translate(
    ST_MakePoint(lng, lat),
    (random() - 0.5) * 0.006,  -- ~300m longitude
    (random() - 0.5) * 0.004   -- ~300m latitude
  );
$$ LANGUAGE sql;
```

### Edge Function Consolidation
Reduced API surface from 88 functions to 31 (65% reduction) using router pattern:

```typescript
// supabase/functions/moves/index.ts
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  switch (path) {
    case 'create': return handleCreate(req);
    case 'join': return handleJoin(req);
    case 'leave': return handleLeave(req);
    // ... consolidated from 12 separate functions
  }
});
```

### PostGIS Venue Queries
Find nearby venues with activity scoring:

```sql
SELECT v.*,
  ST_Distance(v.location, ST_MakePoint($lng, $lat)) as distance,
  calculate_activity_score(v.id) as activity_score
FROM venues v
WHERE ST_DWithin(v.location, ST_MakePoint($lng, $lat), 5000)
ORDER BY activity_score DESC, distance ASC
LIMIT 20;
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Expo App                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  Moves   │  │   Chat   │  │  Venues  │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │             │             │                 │
│       └─────────────┼─────────────┘                 │
│                     ▼                               │
│            TanStack Query + Zustand                 │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                  Supabase                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Postgres │  │ Realtime │  │  Edge    │          │
│  │ + PostGIS│  │ + Presence│ │ Functions│          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

## Stats

- **552 commits** in private repository
- **44 database migrations**
- **31 Edge Functions** (consolidated from 88)
- **17 feature modules**
- **TestFlight-ready** beta

---

*This is a case study for a private repository. Code available upon request.*
