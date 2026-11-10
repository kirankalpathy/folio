#!/usr/bin/env node
/**
 * Increments the internal Folio build number stored in package.json.
 *
 * Format: <yymmdd>.<increment> (e.g. 261110.0).
 * - Same calendar day: increment the suffix (261110.0 -> 261110.1).
 * - New calendar day: reset the suffix to 0 (261111.0).
 *
 * This is intentionally independent of Git tags and GitHub releases.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const now = new Date();
const yy = String(now.getFullYear()).slice(-2);
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const today = `${yy}${mm}${dd}`;

const current = typeof pkg.build === 'string' ? pkg.build : '';
const [currentDate, currentIncrement] = current.split('.');
const parsedIncrement = Number.parseInt(currentIncrement ?? '0', 10);
const nextIncrement =
  currentDate === today && Number.isFinite(parsedIncrement) ? parsedIncrement + 1 : 0;

const next = `${today}.${nextIncrement}`;
pkg.build = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`Build number: ${next}`);
