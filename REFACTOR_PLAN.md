# Refactor Plan: Split `ui/game.html`

## Goal

Split the 5,931-line `ui/game.html` into three files: HTML, CSS, JS. Move-only. No logic changes. No cleanup.

## Non-goals (do not do these in this refactor)

- Do not break `G` into modules.
- Do not split `game.js` into multiple JS files.
- Do not delete the LEGACY ALIASES CSS section.
- Do not remove the ~162 inline scaffolding comments.
- Do not rename variables, functions, or CSS classes.
- Do not reorder code within a block. Cut from HTML, paste into the new file in the same order.
- Do not refactor `resolveAction`, `processActionResult`, or `callClaude`, even though they violate the 50-line rule.

Each of those is a separate project with its own plan.

## Sequence

### Stage 0: Add CLAUDE.md and baseline

1. Commit `CLAUDE.md` to repo root.
2. Tag the current working main: `git tag pre-refactor-v1 && git push --tags`.
3. This tag is the rollback point.

### Stage 1: Extract CSS

Risk: Low. The CSS is already in a single `<style>` block (lines ~10–2170).

Steps:

1. Create `ui/game.css`.
2. Cut the full contents of the `<style>` block in `game.html` and paste into `ui/game.css`. Do not reorder, rename, or remove anything.
3. Replace the `<style>...</style>` block in `game.html` with `<link rel="stylesheet" href="game.css">`.
4. Commit: `refactor: extract CSS to game.css (move-only)`.

Verification (Cameron plays through):

- Case selection screen renders identically.
- In-game layout renders identically.
- Modals, buttons, Delivery Format toggle, Advisor toggle all look correct.
- Run through one full case. No visual regressions.

Rollback if broken: `git reset --hard pre-refactor-v1`.

### Stage 2: Extract JS

Risk: Medium. The JS is self-contained in a `<script>` block, but `G` is window-global and other code may rely on that.

Steps:

1. Create `ui/game.js`.
2. Cut the full contents of the `<script>` block (lines ~2171–5931) and paste into `ui/game.js`. Do not reorder, rename, or wrap in an IIFE/module.
3. Replace the `<script>...</script>` block in `game.html` with `<script src="game.js"></script>`.
4. Confirm `G` is still declared at the top of `game.js` at the top scope (stays window-global; this preserves any `onclick="..."` style inline handlers in HTML).
5. Commit: `refactor: extract JS to game.js (move-only)`.

Verification (Cameron plays through):

- Load the game. No console errors.
- Case selection: pick a case, load it.
- Interview a character: full flow, AI response comes back.
- Toggle Delivery Format. Toggle Advisor.
- Make an accusation. Contradiction detection fires.
- Replay at least one full case start-to-finish.

Rollback if broken: `git reset --hard pre-refactor-v1` (or revert the single commit).

### Stage 3: Stop

After Stages 1–2, the split is done. `game.html` is markup, `game.css` is styles, `game.js` is logic. That is the entire scope of this plan.

## Known state after this refactor

- `ui/game.js` will be ~3,761 lines, which exceeds the 2,000-line cap in `CLAUDE.md`. This is expected. The next refactor (separate plan, not in this one) will split `game.js` into logical modules. Until then, Claude Code should flag the violation at the start of any session and not add to the file without explicit approval.
- The 230-line `resolveAction`, 139-line `processActionResult`, and 96-line `callClaude` functions remain. They all violate the 50-line cap. Same treatment: flag, do not add to them, refactor before extending.
- The LEGACY ALIASES CSS block remains. Cleanup is a separate task.

## Rules for Claude Code during execution

- One stage per session. Do not chain Stages 1 and 2 in a single session without Cameron confirming Stage 1 verified cleanly.
- Do not "while I'm here" clean anything up. If you notice debt, note it in a comment to Cameron, do not fix it in the refactor commit.
- If anything does not move cleanly (e.g., an inline `<script>` you missed, a `style="..."` attribute), stop and ask. Do not interpret or guess.
