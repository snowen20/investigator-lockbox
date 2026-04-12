'use strict';

function issue(rule_id, severity, location, description) {
  return { rule_id, severity, location, description };
}

function run(caseData) {
  const issues = [];

  const evidenceIds = new Set(
    Array.isArray(caseData.evidence)  ? caseData.evidence.map(e => e.id).filter(Boolean)  : []
  );
  const documentIds = new Set(
    Array.isArray(caseData.documents) ? caseData.documents.map(d => d.id).filter(Boolean) : []
  );

  // Build reachable sets from v2 discovery mechanisms
  const reachableEvidence  = new Set();
  const reachableDocuments = new Set();

  // From locations[].contains_evidence / contains_documents
  if (Array.isArray(caseData.locations)) {
    caseData.locations.forEach(loc => {
      if (Array.isArray(loc.contains_evidence)) {
        loc.contains_evidence.forEach(id => { if (evidenceIds.has(id))  reachableEvidence.add(id); });
      }
      if (Array.isArray(loc.contains_documents)) {
        loc.contains_documents.forEach(id => { if (documentIds.has(id)) reachableDocuments.add(id); });
      }
    });
  }

  // From action_contexts[].reveals
  if (Array.isArray(caseData.action_contexts)) {
    caseData.action_contexts.forEach(ctx => {
      if (Array.isArray(ctx.reveals)) {
        ctx.reveals.forEach(id => {
          if (evidenceIds.has(id))  reachableEvidence.add(id);
          if (documentIds.has(id)) reachableDocuments.add(id);
        });
      }
    });
  }

  // From verifiable_claims — evidence/document IDs mentioned in ground_truth or claim text
  if (Array.isArray(caseData.verifiable_claims)) {
    caseData.verifiable_claims.forEach(vc => {
      const text = (vc.ground_truth || '') + ' ' + (vc.claim || '');
      evidenceIds.forEach(id  => { if (text.includes(id)) reachableEvidence.add(id); });
      documentIds.forEach(id => { if (text.includes(id)) reachableDocuments.add(id); });
    });
  }

  // EVIDENCE_REACHABLE — warn if evidence has no path to the player
  evidenceIds.forEach(id => {
    if (!reachableEvidence.has(id)) {
      issues.push(issue('EVIDENCE_REACHABLE', 'warning', `evidence.${id}`,
        `Evidence "${id}" is not linked to any location, verifiable claim, or action context — player may not be able to discover it`));
    }
  });

  // DOCUMENT_REACHABLE — warn if document has no path to the player
  documentIds.forEach(id => {
    if (!reachableDocuments.has(id)) {
      issues.push(issue('DOCUMENT_REACHABLE', 'warning', `documents.${id}`,
        `Document "${id}" is not linked to any location, verifiable claim, or action context — player may not be able to discover it`));
    }
  });

  return issues;
}

module.exports = { run };
