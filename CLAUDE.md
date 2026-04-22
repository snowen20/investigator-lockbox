# Standing Orders for Claude Code

This file is your operating manual for this repo. Read it at the start of every session. These rules are not suggestions.

## Repo context

Investigator Lockbox is a browser-based detective game. Vanilla HTML/CSS/JS. No framework. Single-page app with a manifest-based case loader and JSON case files.

- Cameron is the architect. He approves decisions. You execute them.
- Cameron does not read code. He verifies by behavior and visuals.
- No automated tests exist. Assume every change is unverified until Cameron plays through it.

## Hard limits

### File size

- `ui/game.html` — 500 lines max (markup only)
- `ui/game.css` — 1,500 lines max
- `ui/game.js` — 2,000 lines max (warn Cameron at 1,500)
- Any other file — 500 lines max

If a change would push a file over its limit, STOP and ask Cameron before continuing. Do not silently split files on your own.

### Function size

- 50 lines max per function.
- If a function is already over 50 lines, do not add to it. Refactor it first, in a separate commit, then add.

## File ownership

- `ui/game.html` — markup only. No `<style>` block. No inline `<script>` block beyond `<script src="game.js">`.
- `ui/game.css` — all styles. No `style="..."` attributes in HTML unless the value is set dynamically by JS.
- `ui/game.js` — all JavaScript. No inline `<script>` blocks in HTML.
- `cases/*.json` — case data. Fixed truth. Never mutate at runtime.
- `rules/*.js` — validation/rules engine. Keep separated. Do not merge into `game.js`.

## The God Object (`G`)

There is a single global object named `G` holding game state (~40 properties). This is acknowledged technical debt. It is also the load-bearing wall of the game. Treat its shape as frozen.

Rules:

- Do not add new top-level properties to `G` without Cameron's explicit approval.
- Do not rename existing properties on `G`.
- Do not change the shape or type of any existing `G` property.
- If you need new state, ask Cameron: does it belong on `G`, on an existing sub-object, or as module-local state?

## Pre-change checklist

Before editing any file, run this check:

1. **Line count.** Run `wc -l` on every file you will touch. If any is over the limit, flag it and ask before proceeding.
2. **Function size.** If the function you will touch is over 50 lines, refactor it first in its own commit before adding to it.
3. **Scope check.** HTML, CSS, or JS? Make sure your change lives in the correct file.
4. **G check.** Will your change add, rename, or reshape a property on `G`? If yes, stop and ask.

## Commit discipline

- One logical change per commit.
- Refactor commits contain zero logic changes. Move-only means move-only. No "while I'm here" cleanup.
- If a commit mixes moves and logic changes, split it.

## Manual verification

Every change must be paired with a verification checklist for Cameron:

- What changed.
- What Cameron should click or do to verify it still works.
- What he should look for to confirm nothing regressed.

## When in doubt

Stop. Ask Cameron. Do not guess, do not improvise, do not "while I'm here" refactor.
