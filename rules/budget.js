'use strict';

function issue(rule_id, severity, location, description) {
  return { rule_id, severity, location, description };
}

const BUDGET_MINIMUM = 500;

function run(caseData) {
  const issues = [];

  if (typeof caseData.budget !== 'number') return issues; // structural.js catches type errors

  if (caseData.budget < BUDGET_MINIMUM) {
    issues.push(issue('BUDGET_MINIMUM', 'error', 'budget',
      `Budget is ${caseData.budget} — minimum allowed is ${BUDGET_MINIMUM}`));
  }

  return issues;
}

module.exports = { run };
