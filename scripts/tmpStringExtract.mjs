import { readFileSync } from 'node:fs';

const files = [
  'scripts/probe-sigeduc2-root-main-NK2EVZES.js',
  'scripts/probe-sigeduc2-root-chunk-5MB4FIST.js',
  'scripts/probe-sigeduc2-root-chunk-RFVMV34L.js',
  'scripts/probe-sigeduc2-root-chunk-P6PKWI32.js',
  'scripts/probe-sigeduc2-root-chunk-R4JFTICU.js',
  'scripts/probe-sigeduc2-main-NK2EVZES.js'
];

const keep = /(matricula|cpf|consult|conta|captcha|recaptcha|servidor|api|login|logout|token|gsuite|pape|aluno|educacao\.ba\.gov\.br)/i;

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const strings = [];
  const re = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    let raw = m[0];
    if (raw.length < 3) continue;
    let val = raw.slice(1, -1);
    if (!keep.test(val)) continue;
    if (val.length > 240) continue;
    strings.push(val);
  }
  const uniq = [...new Set(strings)].sort((a, b) => a.length - b.length || a.localeCompare(b));
  console.log('\n=== ' + file + ' ===');
  console.log('matches:', uniq.length);
  uniq.slice(0, 220).forEach((s) => console.log(s));
}
