'use strict';

const { getGuiltyName } = require('../utils/extract-names');

function issue(rule_id, severity, location, description) {
  return { rule_id, severity, location, description };
}

function run(caseData) {
  const issues = [];

  // GUILTY_EVIDENCE_EXISTS — at least one evidence item must point_to the guilty suspect by name
  const guiltyName = getGuiltyName(caseData);
  if (guiltyName) {
    const evidence = Array.isArray(caseData.evidence) ? caseData.evidence : [];
    const hasGuiltyEvidence = evidence.some(e =>
      e.points_to && e.points_to.toLowerCase().includes(guiltyName.toLowerCase())
    );
    if (!hasGuiltyEvidence) {
      issues.push(issue('GUILTY_EVIDENCE_EXISTS', 'error', 'evidence',
        `No evidence item has points_to containing the guilty suspect's name ("${guiltyName}")`));
    }
  }

  return issues;
}

module.exports = { run };
