'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const structural = require('./rules/structural');
const references = require('./rules/references');
const timeline   = require('./rules/timeline');
const budget     = require('./rules/budget');
const paths      = require('./rules/paths');
const names      = require('./rules/names');
const { buildReport } = require('./utils/report');

const PORT    = 3000;
const UI_FILE = path.join(__dirname, 'ui', 'index.html');

function runPrescreener(caseData) {
  const issues = [
    ...structural.run(caseData),
    ...references.run(caseData),
    ...timeline.run(caseData),
    ...budget.run(caseData),
    ...paths.run(caseData),
    ...names.run(caseData),
  ];
  return buildReport(issues);
}

const server = http.createServer((req, res) => {

  // Serve the UI
  if (req.method === 'GET' && req.url === '/') {
    fs.readFile(UI_FILE, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Could not load UI');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // Run the prescreener
  if (req.method === 'POST' && req.url === '/check') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });

      let caseData;
      try {
        caseData = JSON.parse(body);
      } catch (err) {
        res.end(JSON.stringify({ error: 'Invalid JSON — ' + err.message }));
        return;
      }

      try {
        const report = runPrescreener(caseData);
        res.end(JSON.stringify(report));
      } catch (err) {
        res.end(JSON.stringify({ error: 'Prescreener crashed — ' + err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Prescreener running at http://localhost:${PORT}`);
});
