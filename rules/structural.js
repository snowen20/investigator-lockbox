'use strict';

const EVIDENCE_ID = /^E-\d{2}$/;
const DOCUMENT_ID = /^D-\d{2}$/;

function issue(rule_id, severity, location, description) {
  return { rule_id, severity, location, description };
}

// Top-level required fields and their expected types
const TOP_LEVEL = [
  ['title',     'string'],
  ['solution',  'string'],
  ['victim',    'object'],
  ['suspects',  'array'],
  ['timeline',  'array'],
  ['evidence',  'array'],
  ['documents', 'array'],
  ['budget',    'number'],
];

const VICTIM_FIELDS   = ['name', 'age', 'occupation'];
const SUSPECT_FIELDS  = ['name', 'relationship_to_victim', 'guilty', 'alibi', 'alibi_verifiable', 'motive', 'what_they_know', 'what_they_lie_about'];
const TIMELINE_FIELDS = ['datetime', 'event', 'location', 'source'];
const EVIDENCE_FIELDS = ['id', 'type', 'description', 'points_to'];
const DOCUMENT_FIELDS = ['id', 'type', 'content'];

// v2 optional array required fields
const LOCATION_REQUIRED  = ['id', 'name', 'description', 'searchable'];
const CLAIM_REQUIRED     = ['claim_id', 'source_suspect', 'claim', 'verification_method', 'ground_truth', 'discovery_action_keywords'];
const CONTEXT_REQUIRED   = ['context_id', 'keywords', 'response_template', 'reveals', 'cost'];
const CHARACTER_REQUIRED = ['name', 'role', 'location', 'what_they_know'];

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
}

function checkIDUniqueness(c, issues) {
  const groups = [
    { label: 'evidence',  items: c.evidence },
    { label: 'documents', items: c.documents },
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

// ── v2 optional array validators ─────────────────────────────────────────────

function checkLocations(c, issues) {
  if (!Array.isArray(c.locations) || c.locations.length === 0) return;
  const evidenceIds = new Set(Array.isArray(c.evidence)  ? c.evidence.map(e => e.id).filter(Boolean)  : []);
  const documentIds = new Set(Array.isArray(c.documents) ? c.documents.map(d => d.id).filter(Boolean) : []);

  c.locations.forEach((loc, i) => {
    for (const f of LOCATION_REQUIRED) {
      if (!(f in loc)) {
        issues.push(issue('SCHEMA_MISSING_FIELD', 'error', `locations[${i}].${f}`,
          `Location at index ${i} is missing required field "${f}"`));
      }
    }
    if (Array.isArray(loc.contains_evidence)) {
      loc.contains_evidence.forEach(id => {
        if (!evidenceIds.has(id)) {
          issues.push(issue('LOCATION_EVIDENCE_REF', 'error', `locations[${i}].contains_evidence`,
            `Location "${loc.id || i}" references evidence "${id}" which does not exist`));
        }
      });
    }
    if (Array.isArray(loc.contains_documents)) {
      loc.contains_documents.forEach(id => {
        if (!documentIds.has(id)) {
          issues.push(issue('LOCATION_DOCUMENT_REF', 'error', `locations[${i}].contains_documents`,
            `Location "${loc.id || i}" references document "${id}" which does not exist`));
        }
      });
    }
  });
}

function checkVerifiableClaims(c, issues) {
  if (!Array.isArray(c.verifiable_claims) || c.verifiable_claims.length === 0) return;
  const suspectNames = new Set(Array.isArray(c.suspects) ? c.suspects.map(s => s.name).filter(Boolean) : []);

  c.verifiable_claims.forEach((vc, i) => {
    for (const f of CLAIM_REQUIRED) {
      if (!(f in vc)) {
        issues.push(issue('SCHEMA_MISSING_FIELD', 'error', `verifiable_claims[${i}].${f}`,
          `Verifiable claim at index ${i} is missing required field "${f}"`));
      }
    }
    if (vc.source_suspect && !suspectNames.has(vc.source_suspect)) {
      issues.push(issue('CLAIM_SUSPECT_REF', 'error', `verifiable_claims[${i}].source_suspect`,
        `Verifiable claim "${vc.claim_id || i}" references source_suspect "${vc.source_suspect}" who is not in suspects[]`));
    }
  });
}

function checkActionContexts(c, issues) {
  if (!Array.isArray(c.action_contexts) || c.action_contexts.length === 0) return;
  const evidenceIds = new Set(Array.isArray(c.evidence)  ? c.evidence.map(e => e.id).filter(Boolean)  : []);
  const documentIds = new Set(Array.isArray(c.documents) ? c.documents.map(d => d.id).filter(Boolean) : []);
  const validIds    = new Set([...evidenceIds, ...documentIds]);

  c.action_contexts.forEach((ctx, i) => {
    for (const f of CONTEXT_REQUIRED) {
      if (!(f in ctx)) {
        issues.push(issue('SCHEMA_MISSING_FIELD', 'error', `action_contexts[${i}].${f}`,
          `Action context at index ${i} is missing required field "${f}"`));
      }
    }
    if (Array.isArray(ctx.reveals)) {
      ctx.reveals.forEach(id => {
        if (!validIds.has(id)) {
          issues.push(issue('CONTEXT_REVEALS_REF', 'error', `action_contexts[${i}].reveals`,
            `Action context "${ctx.context_id || i}" reveals "${id}" which does not exist in evidence or documents`));
        }
      });
    }
  });
}

function checkCharacters(c, issues) {
  if (!Array.isArray(c.characters) || c.characters.length === 0) return;
  c.characters.forEach((ch, i) => {
    for (const f of CHARACTER_REQUIRED) {
      if (!(f in ch)) {
        issues.push(issue('SCHEMA_MISSING_FIELD', 'error', `characters[${i}].${f}`,
          `Character at index ${i} is missing required field "${f}"`));
      }
    }
  });
}

function run(caseData) {
  const issues = [];
  checkTopLevel(caseData, issues);
  checkVictim(caseData, issues);
  checkSuspects(caseData, issues);
  checkTimeline(caseData, issues);
  checkEvidence(caseData, issues);
  checkDocuments(caseData, issues);
  checkExactlyOneGuilty(caseData, issues);
  checkIDFormats(caseData, issues);
  checkIDUniqueness(caseData, issues);
  checkLocations(caseData, issues);
  checkVerifiableClaims(caseData, issues);
  checkActionContexts(caseData, issues);
  checkCharacters(caseData, issues);
  return issues;
}

module.exports = { run };
