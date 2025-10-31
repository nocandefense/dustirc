#!/usr/bin/env node
const { execSync } = require('child_process');

try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const forbidden = ['main', 'master'];
    if (forbidden.includes(branch)) {
        console.error(`Direct pushes to '${branch}' are blocked. Create a feature branch (use 'npm run branch:start <name>') and open a PR.`);
        process.exit(1);
    }

    const allowedPrefixes = ['feature', 'fix', 'chore', 'hotfix', 'docs', 'release'];
    const ok = allowedPrefixes.some(p => branch.startsWith(`${p}/`)) || branch.startsWith('dependabot/');
    if (!ok) {
        console.error(`Branch name '${branch}' does not follow the required naming convention.\nAllowed prefixes: ${allowedPrefixes.join(', ')}.\nExamples: feature/my-feature, fix/typo`);
        process.exit(1);
    }

    process.exit(0);
} catch (err) {
    console.error('Failed to validate branch name:', err && err.message ? err.message : err);
    process.exit(1);
}
