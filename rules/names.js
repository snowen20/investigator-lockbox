'use strict';

const { getSuspectNames, getGuiltyName, getVictimName, getAllSearchableText, nameAppearsIn } = require('../utils/extract-names');

function issue(rule_id, severity, location, description) {
  return { rule_id, severity, location, description };
}

function run(caseData) {
  const issues = [];

  const guiltyName  = getGuiltyName(caseData);
  const victimName  = getVictimName(caseData);
  const suspectNames = getSuspectNames(caseData);
  const allText     = getAllSearchableText(caseData);

  // NAME_IN_SOLUTION — guilty suspect's name must appear in the solution string
  if (guiltyName) {
    const solution = typeof caseData.solution === 'string' ? caseData.solution : '';
    if (!solution.toLowerCase().includes(guiltyName.toLowerCase())) {
      issues.push(issue('NAME_IN_SOLUTION', 'error', 'solution',
        `Guilty suspect "${guiltyName}" is not named in the solution field`));
    }
  }

  // VICTIM_NAME_CONSISTENT — victim name must appear in at least one document or timeline entry
  if (victimName) {
    const docAndTimelineText = [];

    if (Array.isArray(caseData.documents)) {
      caseData.documents.forEach(d => { if (d.content) docAndTimelineText.push(d.content); });
    }
    if (Array.isArray(caseData.timeline)) {
      caseData.timeline.forEach(t => {
        if (t.event)    docAndTimelineText.push(t.event);
        if (t.location) docAndTimelineText.push(t.location);
        if (t.source)   docAndTimelineText.push(t.source);
      });
    }

    // Accept full name OR any individual name part (cases use first names throughout)
    const nameParts = victimName.split(/\s+/).filter(Boolean);
    const nameFound = nameParts.some(part => nameAppearsIn(part, docAndTimelineText));
    if (!nameFound) {
      issues.push(issue('VICTIM_NAME_CONSISTENT', 'error', 'victim.name',
        `Victim name "${victimName}" (or any part of it) does not appear in any document or timeline entry`));
    }
  }

  // SUSPECT_MENTIONED — every suspect must appear in at least one document, timeline entry, or evidence item
  suspectNames.forEach(name => {
    if (!nameAppearsIn(name, allText)) {
      issues.push(issue('SUSPECT_MENTIONED', 'warning', 'suspects',
        `Suspect "${name}" is not mentioned in any document, timeline entry, or evidence description`));
    }
  });

  return issues;
}

module.exports = { run };
