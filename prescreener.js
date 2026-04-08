'use strict';

const fs   = require('fs');
const path = require('path');

const structural = require('./rules/structural');
const references = require('./rules/references');
const timeline   = require('./rules/timeline');
const budget     = require('./rules/budget');
const paths      = require('./rules/paths');
const names      = require('./rules/names');

const { buildReport, printJSON, writeCSV } = require('./utils/report');

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node prescreener.js <case-file.json> [--csv]');
    process.exit(1);
  }

  const caseFilePath = args[0];
  const csvFlag      = args.includes('--csv');

  // Read and parse the case file
  let raw;
  try {
    raw = fs.readFileSync(path.resolve(caseFilePath), 'utf8');
  } catch (err) {
    console.error(`Cannot read file: ${caseFilePath}\n${err.message}`);
    process.exit(1);
  }

  let caseData;
  try {
    caseData = JSON.parse(raw);
  } catch (err) {
    console.error(`Invalid JSON in: ${caseFilePath}\n${err.message}`);
    process.exit(1);
  }

  // Run all rule modules and collect issues
  const issues = [
    ...structural.run(caseData),
    ...references.run(caseData),
    ...timeline.run(caseData),
    ...budget.run(caseData),
    ...paths.run(caseData),
    ...names.run(caseData),
  ];

  const report = buildReport(issues);

  printJSON(report);

  if (csvFlag) {
    writeCSV(report, caseFilePath);
  }

  // Exit 0 on pass, 1 on fail — useful for CI pipelines
  process.exit(report.status === 'pass' ? 0 : 1);
}

main();
