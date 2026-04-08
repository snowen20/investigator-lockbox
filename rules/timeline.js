'use strict';

const { getSuspectNames, getVictimName } = require('../utils/extract-names');

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

function issue(rule_id, severity, location, description) {
  return { rule_id, severity, location, description };
}

function parseDate(datetime) {
  if (!datetime || typeof datetime !== 'string') return NaN;
  const ts = Date.parse(datetime);
  return ts; // NaN if unparseable
}

function run(caseData) {
  const issues = [];
  const entries = Array.isArray(caseData.timeline) ? caseData.timeline : [];

  if (entries.length === 0) return issues;

  // Collect all known person names for bilocation checks
  const knownNames = [
    ...getSuspectNames(caseData),
    getVictimName(caseData)
  ].filter(Boolean);

  const parsed = []; // { index, datetime, ts, location, event }

  // TIMELINE_PARSE — each datetime must be a valid ISO 8601 string
  entries.forEach((t, i) => {
    const ts = parseDate(t.datetime);
    if (isNaN(ts)) {
      issues.push(issue('TIMELINE_PARSE', 'error', `timeline[${i}]`,
        `Timeline entry at index ${i} has unparseable datetime: "${t.datetime}"`));
    } else {
      parsed.push({ index: i, datetime: t.datetime, ts, location: t.location, event: t.event || '' });
    }
  });

  // TIMELINE_ORDER — entries must be in non-descending chronological order
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].ts < parsed[i - 1].ts) {
      issues.push(issue('TIMELINE_ORDER', 'error',
        `timeline[${parsed[i].index}]`,
        `Timeline entry at index ${parsed[i].index} ("${parsed[i].datetime}") is before the previous entry ("${parsed[i - 1].datetime}")`));
    }
  }

  // TIMELINE_DUPLICATE — no two entries share the same datetime + location + event
  const seen = new Map();
  entries.forEach((t, i) => {
    const key = `${t.datetime}||${t.location}||${t.event}`;
    if (seen.has(key)) {
      issues.push(issue('TIMELINE_DUPLICATE', 'error', `timeline[${i}]`,
        `Timeline entry at index ${i} is an exact duplicate of entry at index ${seen.get(key)}`));
    } else {
      seen.set(key, i);
    }
  });

  // PERSON_BILOCATE — same person at two different locations within 30 minutes (warning)
  // Build a map of name -> list of {ts, location, index} from entries where the name appears
  const nameEntries = new Map();
  knownNames.forEach(name => nameEntries.set(name, []));

  parsed.forEach(p => {
    const text = (p.event + ' ' + p.location).toLowerCase();
    knownNames.forEach(name => {
      if (text.includes(name.toLowerCase())) {
        nameEntries.get(name).push({ ts: p.ts, location: p.location, index: p.index });
      }
    });
  });

  nameEntries.forEach((appearances, name) => {
    // Compare every pair
    for (let i = 0; i < appearances.length; i++) {
      for (let j = i + 1; j < appearances.length; j++) {
        const a = appearances[i];
        const b = appearances[j];
        const diff = Math.abs(a.ts - b.ts);
        if (diff <= THIRTY_MINUTES_MS && a.location !== b.location) {
          issues.push(issue('PERSON_BILOCATE', 'warning',
            `timeline[${a.index}] and timeline[${b.index}]`,
            `"${name}" appears at "${a.location}" and "${b.location}" within 30 minutes — verify this is intentional`));
        }
      }
    }
  });

  return issues;
}

module.exports = { run };
