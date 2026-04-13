const urls = [
  'https://servidores.rhbahia.ba.gov.br/sites/default/files/js/js_VtafjXmRvoUgAzqzYTA3Wrjkx9wcWhjP0G4ZnnqRamA.js',
  'https://servidores.rhbahia.ba.gov.br/sites/default/files/js/js_lpxQ8l4uKTUtKFKGFKJCfKaRRRRKv7-mMjPV2gcUulM.js',
  'https://servidores.rhbahia.ba.gov.br/sites/default/files/js/js_5xsJ7bkgEUnsSDs0gOjA7iT6vgkdcr56QZ05MfT05oo.js',
  'https://servidores.rhbahia.ba.gov.br/sites/default/files/js/js_II9MDUESOsR1yvNaZJliwkPJKvx5QsXgQbkf8LCdcks.js'
];
const probes = ['matricula','cpf','api','consulta','buscar','login','token','servidor','funcional','dados-funcionais'];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' } });
      const t = await r.text();
      console.log('\n=== ' + u + ' ===');
      console.log('status', r.status, 'len', t.length);
      for (const p of probes) {
        if (t.toLowerCase().includes(p)) console.log('HAS_' + p.toUpperCase() + ':YES');
      }
      const lines = t.split(/\r?\n/);
      let count = 0;
      for (const line of lines) {
        const l = line.toLowerCase();
        if (
          l.includes('matricula') ||
          l.includes('cpf') ||
          l.includes('/api') ||
          l.includes('api.') ||
          l.includes('consulta') ||
          l.includes('dados-funcionais') ||
          l.includes('token') ||
          l.includes('auth') ||
          l.includes('ajax')
        ) {
          console.log(line.slice(0, 380));
          count += 1;
          if (count >= 80) break;
        }
      }
      const urlsFound = [...new Set([...t.matchAll(/https?:\/\/[^\"'\s)]+/g)].map((m) => m[0]))];
      const apiHints = urlsFound.filter((x) => /api|consulta|servidor|dados|auth|token|login/i.test(x));
      console.log('URL_HINTS', apiHints.length);
      apiHints.slice(0, 30).forEach((x) => console.log(x));
    } catch (e) {
      console.log('ERR', u, e.message);
    }
  }
})();
