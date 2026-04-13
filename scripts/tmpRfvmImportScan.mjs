import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const files = readdirSync('scripts').filter((f) => /^probe-sigeduc2-root-.*\.js$/.test(f));
for (const f of files) {
  const text = readFileSync(join('scripts', f), 'utf8');
  const imp = text.match(/import\{([^}]*)\}from"\.\/chunk-RFVMV34L\.js"/);
  if (!imp) continue;
  const spec = imp[1];
  const aliasT = spec.match(/\bt\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
  const aliasW = spec.match(/\bw\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
  const aliasPA = spec.match(/\bpa\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/); // filtros maybe
  console.log('\n=== ' + f + ' ===');
  console.log('alias for export t (CONSULTAR EMAIL action):', aliasT ? aliasT[1] : '(none)');
  console.log('alias for export w (RECUPERAR SENHA action):', aliasW ? aliasW[1] : '(none)');
  console.log('alias for export pa (select filtros):', aliasPA ? aliasPA[1] : '(none)');
}
