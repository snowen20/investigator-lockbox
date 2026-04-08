'use strict';

const EVIDENCE_ID = /^E-\d{2}$/;
const DOCUMENT_ID = /^D-\d{2}$/;
const DECISION_ID = /^DP-\d{2}$/;
const VALID_PHASES = new Set([1, 2, 3]);

function issue(rule_id, severity, location, description) {
  return { rule_id, severity, location, description };
}

// Top-level required fields and their expected types
const TOP_LEVEL = [
  ['title',          'string'],
  ['solution',       'string'],
  ['victim',         'object'],
  ['suspect_count',  'number'],
  ['suspects',       'array'],
  ['timeline',       'array'],
  ['evidence',       'array'],
  ['documents',      'array'],
  ['decision_points','array'],
  ['budget',         'number'],
];

const VICTIM_FIELDS    = ['name', 'age', 'occupation'];
const SUSPECT_FIELDS   = ['name', 'relationship_to_victim', 'guilty', 'alibi', 'alibi_verifiable', 'motive', 'what_they_know', 'what_they_lie_about'];
const TIMELINE_FIELDS  = ['datetime', 'event', 'location', 'source'];
const EVIDENCE_FIELDS  = ['id', 'type', 'description', 'points_to', 'available_at_phase'];
const DOCUMENT_FIELDS  = ['id', 'type', 'content', 'phase'];
const DP_FIELDS        = ['id', 'options'];

function checkTopLevel(c, issues) {
  for (const [field, expectedType] of TOP_LEVEL) {
    if (!(field in c)) {
      issues.push(issue('SCHEMA_MISSING_FIELD', 'error', field, `Required field "${field}" is missing`));
      continue;
    }
    const val = c[field];
    const actualType = Array.isArray(val) ? 'array' : typeof val;
    if (actualType !== expectedType) {
      issues.push(issue('SCHEMA_MISSING_FIELD', 'error', field,
        `Field "${field}" must be ${expectedType}, got ${actualType}`));
    }
  }
}

function checkVictim(c, issues) {
  if (!c.victim || typeof c.victim !== 'object') return;
  for (const f of VICTIM_FIELDS) {
    if (!(f in c.victim)) {
      issues.push(issue('SCHEMA_MISSING_FIELD', 'error', `victim.${f}`,
        `Victim is missing required field "${f}"`));
    }
  }
}

function checkSuspects(c, issues) {
  if (!Array.isArray(c.suspects)) return;
  c.suspects.forEach((s, i) => {
    for (const f of SUSPECT_FIELDS) {
      if (!(f in s)) {
        issues.push(issue('SCHEMA_MISSING_FIELD', 'error', `suspects[${i}].${f}`,
          `Suspect at index ${i} is missing required field "${f}"`));
      }
    }
  });
}

function checkTimeline(c, issues) {
  if (!Array.isArray(c.timeline)) return;
  c.timeline.forEach((t, i) => {
    for (const f of TIMELINE_FIELDS) {
      if (!(f in t)) {
        issues.push(issue('SCHEMA_MISSING_FIELD', 'error', `timeline[${i}].${f}`,
          `Timeline entry at index ${i} is missing required field "${f}"`));
      }
    }
  });
}

function checkEvidence(c, issues) {
  if (!Array.isArray(c.evidence)) return;
  c.evidence.forEach((e, i) => {
    for (const f of EVIDENCE_FIELDS) {
      if (!(f in e)) {
        issues.push(issue('SCHEMA_MISSING_FIELD', 'error', `evidence[${i}].${f}`,
          `Evidence at index ${i} is missing required field "${f}"`));
      }
    }
  });
}

function checkDocuments(c, issues) {
  if (!Array.isArray(c.documents)) return;
  c.documents.forEach((d, i) => {
    for (const f of DOCUMENT_FIELDS) {
      if (!(f in d)) {
        issues.push(issue('SCHEMA_MISSING_FIELD', 'error', `documents[${i}].${f}`,
          `Document at index ${i} is missing required field "${f}"`));
      }
    }
  });
}

function checkDecisionPoints(c, issues) {
  if (!Array.isArray(c.decision_points)) return;
  c.decision_points.forEach((dp, i) => {
    for (const f of DP_FIELDS) {
      if (!(f in dp)) {
        issues.push(issue('SCHEMA_MISSING_FIELD', 'error', `decision_points[${i}].${f}`,
          `Decision point at index ${i} is missing required field "${f}"`));
      }
    }

    // OPTION_SCHEMA — each option must be an object with label (string), cost (number), leads_to (array)
    if (Array.isArray(dp.options)) {
      dp.options.forEach((opt, j) => {
        if (typeof opt !== 'object' || opt === null || Array.isArray(opt)) {
          issues.push(issue('OPTION_SCHEMA', 'error', `decision_points[${i}].options[${j}]`,
            `${dp.id || `DP[${i}]`} option ${j} must be an object with label, cost, and leads_to`));
          return;
        }
        if (typeof opt.label !== 'string') {
          issues.push(issue('OPTION_SCHEMA', 'error', `decision_points[${i}].options[${j}].label`,
            `${dp.id || `DP[${i}]`} option ${j} is missing required string field "label"`));
        }
        if (typeof opt.cost !== 'number') {
          issues.push(issue('OPTION_SCHEMA', 'error', `decision_points[${i}].options[${j}].cost`,
            `${dp.id || `DP[${i}]`} option ${j} is missing required number field "cost"`));
        }
        if (!Array.isArray(opt.leads_to)) {
          issues.push(issue('OPTION_SCHEMA', 'error', `decision_points[${i}].options[${j}].leads_to`,
            `${dp.id || `DP[${i}]`} option ${j} is missing required array field "leads_to"`));
        }
      });
    }
  });
}

function checkSuspectCount(c, issues) {
  if (typeof c.suspect_count !== 'number' || !Array.isArray(c.suspects)) return;
  if (c.suspect_count !== c.suspects.length) {
    issues.push(issue('SUSPECT_COUNT_MISMATCH', 'error', 'suspect_count',
      `suspect_count is ${c.suspect_count} but suspects array has ${c.suspects.length} entries`));
  }
}

function checkExactlyOneGuilty(c, issues) {
  if (!Array.isArray(c.suspects)) return;
  const guiltyCount = c.suspects.filter(s => s.guilty === true).length;
  if (guiltyCount !== 1) {
    issues.push(issue('EXACTLY_ONE_GUILTY', 'error', 'suspects',
      `Exactly one suspect must be guilty — found ${guiltyCount}`));
  }
}

function checkIDFormats(c, issues) {
  if (Array.isArray(c.evidence)) {
    c.evidence.forEach(e => {
      if (e.id && !EVIDENCE_ID.test(e.id)) {
        issues.push(issue('ID_FORMAT', 'error', `evidence.${e.id}`,
          `Evidence ID "${e.id}" does not match required format E-XX`));
      }
    });
  }
  if (Array.isArray(c.documents)) {
    c.documents.forEach(d => {
      if (d.id && !DOCUMENT_ID.test(d.id)) {
        issues.push(issue('ID_FORMAT', 'error', `documents.${d.id}`,
          `Document ID "${d.id}" does not match required format D-XX`));
      }
    });
  }
  if (Array.isArray(c.decision_points)) {
    c.decision_points.forEach(dp => {
      if (dp.id && !DECISION_ID.test(dp.id)) {
        issues.push(issue('ID_FORMAT', 'error', `decision_points.${dp.id}`,
          `Decision point ID "${dp.id}" does not match required format DP-XX`));
      }
    });
  }
}

function checkIDUniqueness(c, issues) {
  const groups = [
    { label: 'evidence',        items: c.evidence },
    { label: 'documents',       items: c.documents },
    { label: 'decision_points', items: c.decision_points },
  ];
  for (const { label, items } of groups) {
    if (!Array.isArray(items)) continue;
    const seen = new Set();
    items.forEach(item => {
      if (!item.id) return;
      if (seen.has(item.id)) {
        issues.push(issue('ID_UNIQUE', 'error', `${label}.${item.id}`,
          `Duplicate ID "${item.id}" found in ${label}`));
      }
      seen.add(item.id);
    });
  }
}

function checkPhaseRange(c, issues) {
  if (Array.isArray(c.evidence)) {
    c.evidence.forEach(e => {
      if (e.id && e.available_at_phase !== undefined && !VALID_PHASES.has(e.available_at_phase)) {
        issues.push(issue('PHASE_RANGE', 'error', `evidence.${e.id}`,
          `Evidence "${e.id}" has available_at_phase ${e.available_at_phase} — must be 1, 2, or 3`));
      }
    });
  }
  if (Array.isArray(c.documents)) {
    c.documents.forEach(d => {
      if (d.id && d.phase !== undefined && !VALID_PHASES.has(d.phase)) {
        issues.push(issue('PHASE_RANGE', 'error', `documents.${d.id}`,
          `Document "${d.id}" has phase ${d.phase} — must be 1, 2, or 3`));
      }
    });
  }
}

function run(caseData) {
  const issues = [];
  checkTopLevel(caseData, issues);
  checkVictim(caseData, issues);
  checkSuspects(caseData, issues);
  checkTimeline(caseData, issues);
  checkEvidence(caseData, issues);
  checkDocuments(caseData, issues);
  checkDecisionPoints(caseData, issues);
  checkSuspectCount(caseData, issues);
  checkExactlyOneGuilty(caseData, issues);
  checkIDFormats(caseData, issues);
  checkIDUniqueness(caseData, issues);
  checkPhaseRange(caseData, issues);
  return issues;
}

module.exports = { run };
