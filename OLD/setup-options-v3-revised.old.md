# Investigator Lockbox — Feature Handoff: Setup Options v3 (Revised)

**Date:** April 9, 2026
**Scope:** Delivery Format, Advisor Toggle
**Roles:** Cameron = Architect | Claude (chat) = Prompt Engineer | Claude Code = Construction Crew

---

## Overview

Two player-facing options added to case setup. These modify **presentation and system prompt behavior** — not core case data. The canonical case object is never forked. One case, many shells.

---

## 1. Delivery Format

### Principle
Delivery format changes the **entry vector** only. The underlying case truth, suspects, evidence, decision points, and timeline do not change. Only the opening presentation layer varies.

### Options
| Format | Description |
|--------|-------------|
| Dossier | Case file style. Organized summary: incident, names, dates, locations, evidence notes, known facts. For structured thinkers. |
| Narrative | Scene-based opening. Player is dropped into events as they unfold. For immersion. |
| Mysterious Message | Begins with something incomplete — anonymous text, voicemail, cryptic note. Player must figure out what the case even is. For discovery. |
| Briefing | Direct mission-style. Situation, role, objective, limits. Compressed and operational. |
| Email Chains | Information fragmented across email threads, replies, forwards, contradictions. For white-collar, institutional, conspiracy cases. |
| Text Messages | Opens through texts or chat logs. Informal, immediate. For disappearances, interpersonal conflict, modern feel. |
| Mix | Multiple formats combined in sequence. For realism and variety. |

### Schema Addition

Add a `format_templates` object to the case schema:

```json
"format_templates": {
  "dossier": {
    "header": "CASE FILE — [title]",
    "sections": [
      { "label": "Incident Summary", "source_field": "briefing" },
      { "label": "Victim", "source_field": "victim" },
      { "label": "Known Suspects", "source_field": "suspects", "render": "name_and_relationship_list" },
      { "label": "Initial Evidence", "source_field": "evidence", "filter": { "field": "available_at_phase", "value": 1 } },
      { "label": "Budget Allocation", "source_field": "budget" }
    ]
  },
  "narrative": {
    "opening_scene": "A string written per case. 2-4 sentences. Drops the player into the moment the case breaks open.",
    "reveal_fields": ["victim", "briefing"],
    "withheld_until_play": ["suspects", "evidence"]
  },
  "mysterious_message": {
    "message_type": "text|voicemail|email|note",
    "message_content": "A short cryptic string written per case. The only thing the player sees at start.",
    "reveal_fields": [],
    "withheld_until_play": ["victim", "suspects", "briefing", "evidence"]
  },
  "briefing": {
    "source_field": "briefing"
  },
  "email_chains": {
    "threads": [
      {
        "from": "string",
        "to": "string",
        "subject": "string",
        "body": "string",
        "timestamp": "ISO datetime"
      }
    ]
  },
  "text_messages": {
    "messages": [
      {
        "sender": "string",
        "body": "string",
        "timestamp": "ISO datetime"
      }
    ]
  },
  "mix": {
    "sequence": [
      { "format": "briefing", "scope": "opening_only" },
      { "format": "text_messages", "scope": "all" }
    ]
  }
}
```

### Mix Format Scope Enum

| Scope | Definition |
|-------|-----------|
| `opening_only` | First section or element only of that format's template |
| `first_clue_only` | First evidence item, message, or thread item only |
| `summary_only` | Section headers and first sentence of each section, no full content |
| `all` | Complete template as defined |

### Per-Format Render-Unit Definitions

| Format | opening_only | first_clue_only | summary_only | all |
|--------|-------------|-----------------|-------------|-----|
| Dossier | Incident Summary section only | First evidence item from filtered list | All section headers + first sentence each | Full template |
| Narrative | opening_scene string only | opening_scene + first reveal_field | opening_scene truncated to first sentence | Full template |
| Briefing | briefing text only | Same as opening_only | First sentence of briefing | Full template |
| Email Chains | First thread only | First email in first thread | Sender/subject/timestamp of all threads, no body | All threads, all emails |
| Text Messages | First message only | Same as opening_only | Sender/timestamp of all messages, no body | All messages |
| Mysterious Message | N/A — format is already minimal by design | Same as all | Same as all | message_content string |

### Authoring Notes
- `briefing`, `dossier`, and `mix` can be rendered entirely from existing case fields with no additional writing.
- `narrative`, `mysterious_message`, `email_chains`, and `text_messages` require a small amount of per-case authored content (1-5 short strings each).
- The renderer reads the selected format key, pulls the matching template, and builds the opening screen from it.
- Downstream gameplay is identical regardless of format.

---

## 2. Advisor Toggle

### Principle
The advisor is the difficulty mechanic. When the advisor is on, the player gets a thinking partner who can help them make sense of what they're seeing. When the advisor is off, the player is on their own. That's genuine difficulty — not artificial friction, not evasiveness sliders, not budget penalties.

### Options

| Setting | Player-Facing Description |
|---------|--------------------------|
| Advisor ON | An investigative partner helps you think through the case. After key moments, you can ask for their take before deciding your next move. |
| Advisor OFF | You're on your own. No one to bounce ideas off of. Every call is yours. |

### Advisor Interaction Flow

1. An event occurs (suspect exchange, evidence reveal, or decision point selection)
2. Game engine evaluates trigger rules for that event type
3. If triggered AND advisor is ON, a single button appears: **"Consult Advisor"** plus a **"Continue without advisor"** option
4. **Only if the player selects Consult Advisor** does the API call fire
5. If no trigger condition is met, no button appears
6. If advisor is OFF, no button ever appears

### Trigger Rules by Event Type

#### Suspect Exchange Triggers
Advisor option appears when ANY of these are true in the suspect's response:

- Suspect references a piece of evidence by name or description (keyword overlap against `discoveredInfo.evidence_ids` and evidence `description` fields)
- Suspect states a time, location, or named fact that conflicts with a previously discovered structured case value for the same event or subject (deterministic field comparison — see Contradiction Detection below)
- Suspect introduces a new name, location, or time not yet in the `discoveredInfo` registry
- Player explicitly asks the suspect about a specific evidence item or document
- Player makes an accusation or directly accuses the suspect

Advisor option does NOT appear for:

- Greetings, small talk, or rapport-building exchanges
- Suspect responses that are purely evasive with no new information
- Repeat questions that cover already-discussed ground

#### Evidence Reveal Triggers
Advisor option appears when ANY of these are true:

- Newly revealed evidence contains a name, location, or time that keyword-matches a suspect's prior raw statement in `discoveredInfo.raw_statements`
- Evidence contains a name, location, or time not yet in the `discoveredInfo` registry
- Two or more viewed evidence items now share the same `points_to` value as an exact string match

#### Decision Point Triggers
Advisor option appears when ANY of these are true:

- The decision point contains an option with legal or procedural implications (warrants, re-interviews, formal accusations)
- The decision point option costs exceed 50% of remaining budget

### Connection Detection vs. Contradiction Detection

**Connection detection** uses keyword overlap. When a suspect's response contains keywords that match evidence `description` or `points_to` fields, or match entries in `discoveredInfo`, that is treated as a connection — the suspect is referencing something the player already knows about. This triggers the advisor option.

**Contradiction detection** is NOT keyword overlap. A contradiction is flagged only when the suspect states a time, location, or named fact that conflicts with a previously discovered structured case value for the same event or subject. This is a deterministic field-level comparison. Example: evidence says the victim's car was at Location A at 9pm. Suspect says they saw the victim's car at Location B at 9pm. Same subject (victim's car), same time (9pm), different location — that's a contradiction. Keyword overlap alone (e.g., "yard" + "Tuesday" appearing in both) is treated as connection, not contradiction.

### Discovered Information Registry

The game engine maintains a `discoveredInfo` state object:

```json
{
  "names": [],
  "locations": [],
  "times": [],
  "evidence_ids": [],
  "document_ids": [],
  "raw_statements": {}
}
```

**Update rules:**

- `names` — added when a name appears in any evidence `description`, document `content`, or suspect response that the player has viewed or received. Stored as exact string match from case data fields. Not extracted from free-text AI responses.
- `locations` — same rule, pulled from evidence/document fields only.
- `times` — same rule.
- `evidence_ids` — added when player opens/views an evidence item.
- `document_ids` — added when player opens/views a document.
- `raw_statements` — keyed by suspect name, value is an array of raw suspect response strings. Added after each interview exchange. Stored as the suspect's full raw response text, not parsed or normalized.

**"New information" for trigger purposes** means: a name, location, or time appears in the suspect's response that does not exist in `discoveredInfo.names`, `discoveredInfo.locations`, or `discoveredInfo.times`. The check is keyword match against the known lists, not NLP or semantic matching.

### Advisor System Prompt

`You are an investigative partner supporting a lead investigator. You may comment on evidence, suspect behavior, legal risk, or logistics — whatever is most relevant to what just happened. Be concise. One to three sentences. Prioritize the single most useful observation.`

### Advisor API Call

When the player selects "Consult Advisor," a single API call is made with:

- The current context (last suspect exchange, evidence just revealed, or decision point being evaluated)
- The advisor system prompt above
- The case data relevant to the current situation

Response is rendered below the triggering content:

```
[ADVISOR] The orange clay trace is consistent with salvage yard soil — worth confirming with a site sample.
```

---

## Setup Screen UI

Add a setup screen between case selection and case briefing. Two selections:

1. **Delivery Format** — radio buttons, one selection (default: Briefing)
2. **Advisor** — on/off toggle (default: ON)
   - ON description: "An investigative partner helps you think through the case. After key moments, you can ask for their take before deciding your next move."
   - OFF description: "You're on your own. No one to bounce ideas off of. Every call is yours."

A "Begin Case" button proceeds to the case opening rendered per the selected format.

---

## File Changes Required

| File | Change |
|------|--------|
| `cases/ash-creek-route.js` | Add `format_templates` with authored content for narrative, mysterious_message, email_chains, text_messages. Tag any red herring evidence items with `min_difficulty` field. |
| `cases/ash-creek-route.json` | Same additions (keep JS and JSON copies in sync) |
| `ui/game.html` | Add setup screen UI, format renderer, advisor button system with trigger rules, advisor API call logic, post-event render step for advisor response, `discoveredInfo` state object and update logic |
| `cases/index.js` | No change |
| `prescreener/` | **DO NOT TOUCH** |

---

## Architecture Decisions

| Decision | Ruling | Reason |
|----------|--------|--------|
| Difficulty mechanic | Advisor on/off | Absence of advisor removes reasoning support — genuine difficulty, not artificial friction |
| Investigator structure | Removed | Advisor toggle covers this; no need for Lone Wolf / team distinction |
| Multi-role advisors | Removed | Single general-purpose advisor is simpler and sufficient |
| Advisor invocation | Player-triggered, not auto-fired | Button surfaces on trigger conditions; API call only fires if player selects it |
| Connection detection | Keyword overlap against discoveredInfo and evidence fields | Deterministic, prevents drift |
| Contradiction detection | Deterministic field-level comparison only | Suspect's stated time/location/fact vs. structured case value for same event/subject. Keyword overlap alone is connection, not contradiction. |
| Discovered info tracking | `discoveredInfo` state object with names, locations, times, evidence_ids, document_ids, raw_statements | Source of truth for trigger evaluation |
| Advisor API cost | One extra call per player-invoked consult | Acceptable; player controls frequency |
| Delivery format | One case, many shells | Case truth never forks; only opening presentation varies |
| Format authoring | Hybrid — template + light per-case authored content | Briefing/dossier auto-render from fields; narrative/mysterious_message/email/text need short authored strings |
| Mix scope | Defined enum with per-format render-unit definitions | Prevents Claude Code from guessing what partial rendering means |
| Raw statements | Stored as full raw suspect response strings, not summaries | No normalization, no parsing, no terminology mismatch |
| Evidence convergence | "Two or more items point to same suspect" means matching `points_to` value as exact string match | Deterministic check |

---

## Rules for Claude Code

- Cameron is the architect. This document is the spec.
- Do not improvise mechanics beyond what is specified here.
- If something is ambiguous, flag it and ask — do not guess.
- Do not modify the prescreener.
- Test that existing gameplay still works after changes.
- Advisor button is player-invoked. Never auto-generate advisor commentary.
- Delivery format rendering must work from existing case fields where specified. Do not call the API to dynamically generate openings unless the format template explicitly requires it (none currently do).
- Connection detection uses keyword matching against `discoveredInfo` lists. Do not implement semantic matching, NLP, or fuzzy logic.
- Contradiction detection uses deterministic field-level comparison only. Keyword overlap is connection, not contradiction.
- `raw_statements` are stored as-is. Do not summarize, normalize, or parse them.
