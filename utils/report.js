'use strict';

const fs = require('fs');
const path = require('path');

// status is "pass" if zero errors — warnings do not affect it
function deriveStatus(issues) {
  return issues.some(i => i.severity === 'error') ? 'fail' : 'pass';
}

function buildReport(issues) {
  return {
    status: deriveStatus(issues),
    issues
  };
}

function printJSON(report) {
  console.log(JSON.stringify(report, null, 2));
}

function writeCSV(report, caseFilePath) {
  const dir = path.dirname(caseFilePath);
  const base = path.basename(caseFilePath, '.json');
  const outPath = path.join(dir, `${base}-report.csv`);

  const header = 'rule_id,severity,location,description';
  const rows = report.issues.map(i => {
    const desc = `"${i.description.replace(/"/g, '""')}"`;
    return `${i.rule_id},${i.severity},${i.location},${desc}`;
  });

  fs.writeFileSync(outPath, [header, ...rows].join('\n'), 'utf8');
  console.error(`CSV written to: ${outPath}`);
}

module.exports = { buildReport, printJSON, writeCSV };
