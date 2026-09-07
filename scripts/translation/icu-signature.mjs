import {parse} from '@formatjs/icu-messageformat-parser';
// Compare variable/tag types recursively; allow language-specific plural categories.
export function signature(text) {
  const tokens = new Set();
  function visit(nodes) {
    for (const n of nodes) {
      if ([1,2,3,4,5,6,8].includes(n.type)) tokens.add(`${n.type}:${n.value}`);
      if (n.children) visit(n.children);
      if (n.type === 5) tokens.add(`select:${n.value}:${Object.keys(n.options).sort().join(',')}`);
      if (n.type === 6) tokens.add(`plural:${n.value}:${n.pluralType}:${n.offset}`);
      if (n.options) for (const [key, option] of Object.entries(n.options)) {
        if (key.startsWith('=')) tokens.add(`exact:${n.value}:${key}`);
        visit(option.value);
      }
    }
  }
  visit(parse(text));
  return JSON.stringify([...tokens].sort());
}
