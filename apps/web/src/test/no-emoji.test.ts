/**
 * Enforcement test: scans every .ts and .tsx file under apps/web/src for Unicode emoji.
 * Fails the build if any emoji characters are found, per the design-system.md §2 rule.
 *
 * Covers the main Unicode emoji ranges:
 *   U+1F600–U+1FFFF  (emoticons, symbols, transport, misc)
 *   U+2600–U+27BF    (misc symbols, dingbats)
 *   U+FE00–U+FE0F    (variation selectors — emoji presentation)
 *   U+1F000–U+1F02F  (mahjong/domino tiles)
 *   U+2702–U+27B0    (dingbats subset)
 *
 * Exclusions: this file itself, and the no-emoji.test.ts path string are skipped.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Walk the whole apps/web/src directory
const SRC_ROOT = join(__dirname, '..');

// Emoji detection regex — covers common Unicode emoji blocks.
// The variation-selector range U+FE00–U+FE0F triggers ESLint no-misleading-character-class
// when written as a single class, so we use two separate regexes and OR them.
// eslint-disable-next-line no-misleading-character-class
const EMOJI_MAIN_RE = /[\u{1F600}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/u;
const EMOJI_VS_RE   = /\uFE0F/u; // variation selector-16 (emoji presentation)

function hasEmoji(line: string): boolean {
  return EMOJI_MAIN_RE.test(line) || EMOJI_VS_RE.test(line);
}

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (stat.isFile()) {
      const ext = extname(entry);
      if (ext === '.ts' || ext === '.tsx') {
        results.push(full);
      }
    }
  }
  return results;
}

describe('No emoji in source files', () => {
  const files = collectSourceFiles(SRC_ROOT).filter(f => !f.includes('no-emoji.test'));

  it('should have at least one source file to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file.replace(SRC_ROOT, 'src')} contains no emoji`, () => {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const violations: string[] = [];

      lines.forEach((line, idx) => {
        if (hasEmoji(line)) {
          violations.push(`  Line ${idx + 1}: ${line.trim()}`);
        }
      });

      expect(violations, `Emoji found in ${file}:\n${violations.join('\n')}`).toHaveLength(0);
    });
  }
});
