# LOCKGATE / CỬA ÂU

Date: 2026-09-05

Lockgate is a 48 x 68 m team deathmatch map for the existing DRAX FPS 4v4 mode. The map keeps the current Viper/Raven teams, 25 point score limit, weapon set, movement, lean, crouch, jump, pulse device, bot combat and local browser runtime.

## Design Intent

Lockgate is a coastal cargo port pump station after rain. The playable space is a maintenance zone around a lock gate, with water outside the east perimeter only.

The map has three north-south lanes:

- Workshop, west, X about -22 to -10: close fights, semi-enclosed sightlines, repair benches and equipment cabinets.
- Pump, center, X about -8 to +8: medium fights around two large pump housings and a yellow overhead gantry.
- Quay, east, X about +10 to +22: longer duels with railings, bollards, winch cover and water beyond the wall.

The two horizontal connector bands sit around Z=-12 and Z=+12. They are offset by solid cover so one player cannot hold a straight east-west line across the whole map.

## Layout Notes

Final bounds remain compatible with the rest of the engine:

- X: -24 to +24
- Z: -34 to +34
- Viper: south, positive Z
- Raven: north, negative Z

The central pump footprint blocks spawn-to-spawn sightlines and splits the medium lane into multiple peeks. The quay has longer sightlines for Sentinel, but mid-lane blockers and spawn-side L cover stop direct spawn angles. Workshop uses tighter 3-4 m passages and cover heights around crouch/chest level for Breaker and Specter pressure.

## Spawn And Navigation

Each team now has 6 Lockgate spawn candidates. They are placed across the rear of the three lanes and protected by staggered concrete and steel shields.

`safestSpawn` was upgraded from distance-only scoring. It now:

- prefers spawn points hidden from enemy line of sight;
- still accounts for nearest enemy distance;
- avoids crowding live allies at the same point;
- keeps a fallback when every point is contested.

Lockgate defines 36 cover/navigation candidates before collision filtering. The verifier confirms 29 usable bot cover nodes after removing points that overlap colliders.

## Art Pass

The environment is procedural and local to the project. No proprietary game assets were imported.

Main identifiers:

- yellow industrial gantry above the pump lane;
- two pump cylinders and rust pipe details in center;
- sawtooth workshop roof and maintenance bays on west;
- quay railings, bollards, winch cover and dark water outside east bounds;
- N-01/S-01 team signs and lane callouts.

The art pass follows the readability principles from Riot's map and shader writeups: large landmark shapes for orientation, clean target-height zones, details pushed low or high, and no reliance on dynamic shadows for tactical information.

References:

- https://playvalorant.com/en-gb/news/dev/the-birth-of-ascent/
- https://www.riotgames.com/en/news/valorant-shaders-and-gameplay-clarity

## Minimap And Menu

The menu now lists Lockgate beside Iron Divide and Sun Relay:

- LOCKGATE
- Vietnamese: `Cửa âu · xưởng, trạm bơm và đường bến`
- English: `Lock station - workshop, pumps and quay`

The HUD radar now draws per-map major colliders from world coordinates instead of showing only a fixed grid. Lockgate also labels Workshop, Pump and Quay on the minimap.

## Verification

Commands run:

- `npm test`
- `npm run build`
- `npm run lint`

World verifier output for Lockgate:

- reachable cells: 2478
- colliders: 65
- cover nodes: 29
- instanced meshes: 12
- scene objects: 61

The world verifier checks:

- map metadata registration;
- clear spawn points;
- exact mirrored Viper/Raven spawn positions;
- no direct line of sight between opposing Lockgate spawn candidates;
- connected route from spawn into the battlefield;
- all remaining cover nodes are reachable;
- Lockgate lane and connector reachability;
- workshop, pump and quay collider presence;
- quality scaling path;
- instanced repeated geometry.

Combat verifier still passes after the spawn update, including hit zones, Sentinel range, weapon roles, reload state, lean controls, safe spawn hooks and bot flank hooks.

## Current Limits

I did not run browser-controlled playtest, 60 second FPS capture or gameplay screenshots in this pass because the active user instruction says not to occupy the mouse while working. Build/test/lint and headless world simulation are complete. Real-feel tuning still needs manual play on the user's machine, especially Sentinel sightline comfort on Quay and bot flow between Workshop and Pump.
