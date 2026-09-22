# Sound Effects Architecture

This document describes the sound system in the current game.

## Modules

- `src/sound-engine.ts` owns one Web Audio context and plays one sound effect
  at a time. A new effect stops the effect that is playing.
- `src/audio-loader.ts` fetches, decodes, and caches audio buffers.
- `src/audio-file-discovery.ts` reads `sound/index.json`. It can also use the
  development asset endpoint or a directory listing.
- `src/sound-manager.ts` selects the files for tile flips, matches,
  mismatches, new games, and wins. It preloads the files at startup.
- `src/audio-ui-controller.ts` connects the mute button to `SoundManager`.
- `src/win-sequence-controller.ts` starts the win sound and passes its duration
  to the win animation.

The game has one sound effect layer. The mute state is stored under
`memoryblox-sound-muted` in local storage. The project has no music layer or
`config/sound.cfg` file.

## Sound Files

The `sound/` directory contains the WAV files and `index.json`. Run
`npm run audio:index` after you add or remove a sound file. Run
`npm run validate` before commit or push. The validation command also
updates the generated audio index.

`SoundManager` selects files by these name prefixes:

| Game event | File prefix |
| --- | --- |
| Tile flip | `flip` |
| Match | `match` |
| Mismatch | `mismatch` |
| New game | `newgame` |
| Win | `win` |

The supported file extensions are `.mp3`, `.wav`, `.ogg`, and `.m4a`.
Use relative asset paths so the game works at the Pages path `/mb/`.

## Checks

- Run `npm run test -- tests/sound-engine.test.ts tests/sound-manager.test.ts
  tests/audio-loader.test.ts` after sound logic changes.
- Run `npm run validate` after sound code or documentation changes.
- Test the mute button and win sound in a browser when you change the audio UI
  or the win sequence.
