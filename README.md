# Lumen Tide — a lantern-skiff starlight harvest

An original 2D canvas arcade game, built for the make.fun bounty
["Make the best game"](https://make.fun/bounty/best-game-01) (`best-game-01`).

## The game

You steer a little lantern-skiff across a night sea under an aurora sky.
Starlight motes fall from the sky — gather them to build a combo multiplier.
Void wisps drift down too: one touch burns a hull, but a well-timed **dash**
(Space or click) banishes them. Gold shards buy upgrades in the shop between
waves. Every 5th wave the **Storm Herald** rises — dash through it three
times to banish it. Survive all **10 waves** and bring the Dawn.

- **Goal:** survive 10 waves; **Lose:** hull reaches 0.
- **Controls:** mouse or WASD / arrow keys to steer · Space / click to dash ·
  P pause · M mute · R restart.
- **Systems:** combo multiplier (up to x4), shard shop (hull, magnet, dash,
  lantern, score), boss fights, best score saved locally, pause, victory and
  game-over screens, restart.
- **Art & sound:** everything is original and made in code — canvas-drawn
  aurora, parallax stars, moonlit sea, glowing particles; music and effects
  synthesised live with WebAudio. No image, font or audio files, no network
  requests, no libraries.

## Play it

```sh
node serve.ts        # serves game/ at http://localhost:8080
```

or open `game/index.html` from any static file server. Desktop browser.

Deterministic screenshot scenes (used for `screenshots/`):

- `?shot=start&seed=1` — title screen
- `?shot=play&seed=1` — mid-wave action with the Storm Herald
- `?shot=end&seed=1` — victory screen

## Handing it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored `vendor/makefun-game.ts` library
(kit's copy, unchanged).

## License

MIT — see `LICENSE`.
