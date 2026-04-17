const url = 'https://lattes.cnpq.br/1234567890123456';
const headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent': 'SECTI-Lattes-Extractor/1.0',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
};

async function testFetch() {
  try {
    const response = await fetch(url, { method: 'GET', headers, redirect: 'follow' });
    const html = await response.text();
    
    console.log('Status HTTP:', response.status);
    console.log('Tamanho do HTML:', html.length);
    console.log('--- Início do HTML (1200 chars) ---');
    process.stdout.write(html.substring(0, 1200));
    console.log('\n--- Fim do HTML ---');

    const captchaKeywords = ['captcha', 'g-recaptcha', 'codigo de seguranca', 'cloudflare', 'access denied'];
    const found = captchaKeywords.filter(kw => html.toLowerCase().includes(kw));
    
    if (found.length > 0) {
      console.log('\nRestrições detectadas:', found.join(', '));
    } else {
      console.log('\nNenhuma restrição óbvia detectada.');
    }
  } catch (error) {
    console.error('Erro no fetch:', error.message);
  }
}

testFetch();
