'use strict';

function issue(rule_id, severity, location, description) {
  return { rule_id, severity, location, description };
}

function run(caseData) {
  const issues = [];

  const evidenceIds = new Set(
    Array.isArray(caseData.evidence) ? caseData.evidence.map(e => e.id).filter(Boolean) : []
  );
  const documentIds = new Set(
    Array.isArray(caseData.documents) ? caseData.documents.map(d => d.id).filter(Boolean) : []
  );
  const validTargets = new Set([...evidenceIds, ...documentIds]);

  const referencedEvidence = new Set();
  const referencedDocuments = new Set();

  if (Array.isArray(caseData.decision_points)) {
    caseData.decision_points.forEach(dp => {
      if (!dp.id) return;

      // DECISION_LEADS_TO_VALID — every option's leads_to values must resolve to known IDs
      if (Array.isArray(dp.options)) {
        dp.options.forEach(opt => {
          if (!Array.isArray(opt.leads_to)) return;
          opt.leads_to.forEach(target => {
            if (!validTargets.has(target)) {
              issues.push(issue('DECISION_LEADS_TO_VALID', 'error', `decision_points.${dp.id}`,
                `${dp.id} leads_to "${target}" which does not match any evidence or document ID`));
            } else {
              if (evidenceIds.has(target)) referencedEvidence.add(target);
              if (documentIds.has(target)) referencedDocuments.add(target);
            }
          });
        });
      }
    });
  }

  // ORPHAN_EVIDENCE — warning: evidence not reachable through any decision point
  evidenceIds.forEach(id => {
    if (!referencedEvidence.has(id)) {
      issues.push(issue('ORPHAN_EVIDENCE', 'warning', `evidence.${id}`,
        `Evidence "${id}" is not referenced by any decision point — players cannot reach it through decisions`));
    }
  });

  // ORPHAN_DOCUMENT — warning: document not reachable through any decision point
  documentIds.forEach(id => {
    if (!referencedDocuments.has(id)) {
      issues.push(issue('ORPHAN_DOCUMENT', 'warning', `documents.${id}`,
        `Document "${id}" is not referenced by any decision point — players cannot reach it through decisions`));
    }
  });

  return issues;
}

module.exports = { run };
