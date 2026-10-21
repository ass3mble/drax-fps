# DRAX FPS

> **Development snapshot:** The current local multiplayer/UI refactor is in progress.
> This uploaded snapshot is preserved as-is; it does not yet pass `npm run build`
> because `app/game/engine.ts` was removed in the working tree while several
> modules still import it. The existing verification scripts referenced by
> `npm test` are also currently missing. See [development status](docs/DEVELOPMENT_STATUS.md).

DRAX FPS is an open-source browser tactical FPS built with Three.js, React, TypeScript, and a self-hosted WebSocket multiplayer server.

The current build supports local/LAN play and public browser access through a reverse tunnel such as Cloudflare Tunnel. Friends only need a modern desktop browser; no game client installation is required.

## Multiplayer features

- Player nickname saved per browser/device
- Named public rooms with live room browser
- Direct join by room code
- Up to 8 players per room
- 20 Hz player pose synchronization
- Server-authoritative hit, damage, kill, death, and team score handling
- Server-side fire-rate, shot-origin, direction, and movement sanity checks
- Respawn flow and scoreboard state
- Ping display and heartbeat handling
- Automatic reconnect and same-room session resume
- Host migration when the current host leaves
- Multiple maps and weapon loadouts

## Gameplay

- First-person movement, sprinting, jumping, aiming, firing, reloading, and leaning
- Multiple weapons including Ranger, Specter, Sentinel, and Breaker
- Crosshair, scoped aiming, recoil, hit feedback, health, ammo, radar, and scoreboard HUD
- Procedural/assembled 3D environments with imported third-party assets where noted

## Controls

| Action | Control |
| --- | --- |
| Move | WASD |
| Look | Mouse |
| Fire | Left mouse button |
| Aim | Right mouse button |
| Lean | Q / E |
| Sprint | Left Shift |
| Jump | Space |
| Reload | R |
| Scoreboard | Tab |
| Pause | Escape |

A desktop browser with WebGL, keyboard, and mouse is recommended.

## Requirements

- Node.js 22.13+ (Node.js 24 recommended)
- npm

## Run locally

```sh
npm ci
npm run dev
```

## Self-host multiplayer

Build the production client and start the HTTP + WebSocket server on port `8787`:

```sh
npm run host
```

Then open:

- Same PC: `http://127.0.0.1:8787`
- Same LAN: use one of the `LAN:` addresses printed by the server

The server binds to `0.0.0.0`. If Windows Firewall prompts, allow Node.js on the appropriate private network.

## Public browser link with Cloudflare Tunnel

With the DRAX server running, expose it without port forwarding:

```sh
cloudflared tunnel --url http://localhost:8787
```

Cloudflare Quick Tunnel returns a temporary `https://*.trycloudflare.com` URL. Share that URL with friends and they can open DRAX directly in Chrome/Edge. For a stable custom hostname, use a named Cloudflare Tunnel and your own domain.

## Test and build

```sh
npm test
npm run test:multiplayer
npm run build
npm run lint
```

The multiplayer verification covers handshake, room/lobby behavior, two-player pose sync, ping, authoritative hit/kill/score, respawn, reconnect/session resume, leave, and cleanup.

## Project structure

- `app/game/` — rendering, maps, weapons, combat, physics, audio, bots, and gameplay systems
- `app/multiplayer/` — browser multiplayer client and protocol state
- `app/fps-interface.tsx` — deployment, lobby, HUD, settings, and scoreboard UI
- `app/combat-ui.css` — DRAX combat/lobby interface styling
- `server/index.mjs` — HTTP server, WebSocket rooms, authoritative combat, respawn, score, heartbeat, and reconnect state
- `verify-multiplayer.mjs` — end-to-end protocol verification
- `public/models/` and `public/textures/` — runtime assets

## License and third-party assets

Original DRAX FPS code is released under the [MIT License](LICENSE). Third-party libraries and assets retain their respective licenses and attribution requirements; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `public/third-party-notices.txt`.

This GitHub snapshot was prepared from the local worktree originally linked to
[`Hiraeth010/blackwater`](https://github.com/Hiraeth010/blackwater).
The existing MIT copyright notice for Hiraeth010 is intentionally preserved.
