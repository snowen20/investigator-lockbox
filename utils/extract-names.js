'use strict';

// Returns all suspect names as an array of strings
function getSuspectNames(caseData) {
  if (!Array.isArray(caseData.suspects)) return [];
  return caseData.suspects.map(s => s.name).filter(Boolean);
}

// Returns the guilty suspect's name, or null if none found
function getGuiltyName(caseData) {
  if (!Array.isArray(caseData.suspects)) return null;
  const guilty = caseData.suspects.find(s => s.guilty === true);
  return guilty ? guilty.name : null;
}

// Returns the victim's name, or null if not present
function getVictimName(caseData) {
  return (caseData.victim && caseData.victim.name) ? caseData.victim.name : null;
}

// Returns a flat array of all searchable text strings from documents,
// timeline entries, and evidence — used to check if a name is mentioned
function getAllSearchableText(caseData) {
  const texts = [];

  if (Array.isArray(caseData.documents)) {
    caseData.documents.forEach(d => {
      if (d.content) texts.push(d.content);
    });
  }

  if (Array.isArray(caseData.timeline)) {
    caseData.timeline.forEach(t => {
      if (t.event) texts.push(t.event);
      if (t.location) texts.push(t.location);
      if (t.source) texts.push(t.source);
    });
  }

  if (Array.isArray(caseData.evidence)) {
    caseData.evidence.forEach(e => {
      if (e.description) texts.push(e.description);
      if (e.points_to) texts.push(e.points_to);
    });
  }

  return texts;
}

// Returns true if the given name appears (case-insensitive) in any of the text strings
function nameAppearsIn(name, texts) {
  const lower = name.toLowerCase();
  return texts.some(t => t.toLowerCase().includes(lower));
}

module.exports = { getSuspectNames, getGuiltyName, getVictimName, getAllSearchableText, nameAppearsIn };
