const url = 'https://siadiante.educacao.ba.gov.br/consultarMatricula';
const response = await fetch(url, {
  redirect: 'follow',
  headers: { 'user-agent': 'Mozilla/5.0' }
});
const html = await response.text();
console.log('status', response.status);
console.log('final', response.url);
console.log('len', html.length);

const scripts = [...html.matchAll(/<script[^>]+src=\"([^\"]+)\"/gi)].map((m) => m[1]);
const forms = [...html.matchAll(/<form[^>]+action=\"([^\"]*)\"/gi)].map((m) => m[1]);
const inputs = [...html.matchAll(/name=\"([^\"]+)\"/gi)].map((m) => m[1]);

console.log('scripts', scripts.length);
for (const s of scripts.slice(0, 40)) console.log('script', s);

console.log('forms', forms.length);
for (const f of forms.slice(0, 20)) console.log('form', f);

const uniqInputs = [...new Set(inputs)];
console.log('inputs', uniqInputs.length);
for (const i of uniqInputs.slice(0, 120)) console.log('input', i);

const urlHints = [...new Set([...html.matchAll(/https?:\/\/[^\"'\s)]+/g)].map((m) => m[0]))]
  .filter((x) => /api|matric|consult|captcha|cpf|aluno|servidor|educacao/i.test(x));
console.log('urlHints', urlHints.length);
for (const h of urlHints.slice(0, 60)) console.log('hint', h);
