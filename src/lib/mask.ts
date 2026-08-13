// Masks an id for display only — the first 4 non-dash characters stay
// visible, everything else becomes 'X'. Dashes are structural (grouping in
// ids like UUIDs) and are never masked or counted toward the 4.
export function maskId(value: string): string {
  let shown = 0;
  let out = '';
  for (const ch of value) {
    if (ch === '-') {
      out += ch;
      continue;
    }
    if (shown < 4) {
      out += ch;
      shown += 1;
    } else {
      out += 'X';
    }
  }
  return out;
}
