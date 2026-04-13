import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'scripts';
const files = readdirSync(dir).filter((f) => /^probe-sigeduc2-root-(chunk|main)-.*\.js$/.test(f));
for (const f of files) {
  const p = join(dir, f);
  const text = readFileSync(p, 'utf8');
  const imp = text.match(/import\{([^}]*)\}from"\.\/chunk-P6PKWI32\.js"/);
  if (!imp) continue;
  const impSpec = imp[1];
  const aliasMatch = impSpec.match(/\bn\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
  const alias = aliasMatch ? aliasMatch[1] : null;
  if (!alias) continue;

  const re = new RegExp(`\\b${alias}\\.([A-Za-z0-9_]+)`, 'g');
  const vals = new Set();
  let m;
  while ((m = re.exec(text)) !== null) vals.add(m[1]);
  const arr = [...vals].sort();
  const filtered = arr.filter((s) => /(GSUITE|EMAIL|CONSULTA|RECUPERAR|ROTINA|LIXEIRA|DASHBOARD|PAPE|ALUNO|SERVIDOR|AUTH|LOGIN|LOGOUT|SESSION|USER|USUARIO)/i.test(s));

  console.log('\n=== ' + f + ' ===');
  console.log('alias for n:', alias, 'total props:', arr.length, 'filtered:', filtered.length);
  if (filtered.length) filtered.forEach((x) => console.log(x));
}
