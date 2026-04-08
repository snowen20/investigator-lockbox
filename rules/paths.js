'use strict';

const { getGuiltyName } = require('../utils/extract-names');

function issue(rule_id, severity, location, description) {
  return { rule_id, severity, location, description };
}

function buildPhaseMap(caseData) {
  // Returns a map of ID -> phase number for all evidence and documents
  const map = new Map();
  if (Array.isArray(caseData.evidence)) {
    caseData.evidence.forEach(e => {
      if (e.id && e.available_at_phase !== undefined) map.set(e.id, e.available_at_phase);
    });
  }
  if (Array.isArray(caseData.documents)) {
    caseData.documents.forEach(d => {
      if (d.id && d.phase !== undefined) map.set(d.id, d.phase);
    });
  }
  return map;
}

function run(caseData) {
  const issues = [];
  const dps = Array.isArray(caseData.decision_points) ? caseData.decision_points : [];
  const phaseMap = buildPhaseMap(caseData);

  // PHASE_REACHABLE — at least one DP must lead to content in each of phases 1, 2, 3
  const reachablePhases = new Set();
  dps.forEach(dp => {
    if (!Array.isArray(dp.options)) return;
    dp.options.forEach(opt => {
      if (!Array.isArray(opt.leads_to)) return;
      opt.leads_to.forEach(target => {
        if (phaseMap.has(target)) reachablePhases.add(phaseMap.get(target));
      });
    });
  });

  [1, 2, 3].forEach(phase => {
    if (!reachablePhases.has(phase)) {
      issues.push(issue('PHASE_REACHABLE', 'error', 'decision_points',
        `Phase ${phase} is not reachable — no decision point leads to any phase ${phase} evidence or document`));
    }
  });

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

  // DEAD_END_PATH — a DP that leads exclusively to phase 3 content is a dead end
  // because players would hit phase 3 without establishing phases 1 and 2 first
  dps.forEach(dp => {
    if (!dp.id || !Array.isArray(dp.options) || dp.options.length === 0) return;
    const allTargets = dp.options
      .filter(opt => Array.isArray(opt.leads_to))
      .flatMap(opt => opt.leads_to);

    const targetPhases = allTargets.filter(t => phaseMap.has(t)).map(t => phaseMap.get(t));

    if (targetPhases.length > 0 && targetPhases.every(p => p === 3)) {
      issues.push(issue('DEAD_END_PATH', 'error', `decision_points.${dp.id}`,
        `${dp.id} leads only to phase 3 content — phases 1 and 2 would be unreachable from this path`));
    }
  });

  return issues;
}

module.exports = { run };
