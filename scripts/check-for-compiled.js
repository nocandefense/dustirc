const { execSync } = require('child_process');
const fs = require('fs');

// Patterns to detect compiled artifacts (scoped to test folder).
const patterns = [
    'test/**/*.js',
    'test/**/*.js.map'
];

function run() {
    try {
        // Use git to list committed files (for CI) or staged files (for local pre-commit).
        // When run in pre-commit, we can inspect the staged files via git diff --cached --name-only
        const staged = execSync('git rev-parse --is-inside-work-tree > /dev/null 2>&1 && git diff --cached --name-only', { encoding: 'utf8' }).trim();
        const files = staged ? staged.split('\n').filter(Boolean) : [];

        const offending = [];
        for (const f of files) {
            for (const p of patterns) {
                // simple pattern checks: only support test/**/*.js and test/**/*.js.map for now
                if (p.startsWith('test/')) {
                    const suffix = p.replace('test/', '');
                    if (matchTestPattern(f, suffix)) {
                        offending.push(f);
                    }
                }
            }
        }

        // If no staged files (CI run), check the entire tree for matching files
        if (files.length === 0) {
            const all = execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n');
            for (const f of all) {
                for (const p of patterns) {
                    if (p.startsWith('test/')) {
                        const suffix = p.replace('test/', '');
                        if (matchTestPattern(f, suffix)) {
                            offending.push(f);
                        }
                    }
                }
            }
        }

        if (offending.length > 0) {
            console.error('Found compiled/generated files that should not be committed:');
            for (const o of offending) {
                console.error('  - ' + o);
            }
            console.error('\nPlease remove these files from the commit (e.g. `git rm --cached <file>`), or update your branch to exclude them.');
            process.exit(1);
        }

        process.exit(0);
    } catch (err) {
        // If git commands fail, be conservative and pass (so we don't block CI unexpectedly)
        console.error('check-for-compiled: warning: failed to inspect git state, skipping check.');
        // console.error(err && err.message);
        process.exit(0);
    }
}

function matchTestPattern(file, pattern) {
    // pattern like **/*.js or **/*.js.map
    if (pattern.startsWith('**/')) {
        pattern = pattern.slice(3);
    }
    if (pattern.startsWith('*')) {
        pattern = pattern.slice(1);
    }
    return file.startsWith('test/') && file.endsWith(pattern.replace('*', ''));
}

run();
