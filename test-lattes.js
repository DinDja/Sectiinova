import { handler } from "./netlify/functions/lattes-extract.js";

const htmlNormal = `
<html>
<body>
    <h2 class="nome">Nome do Pesquisador</h2>
    <div class="resumo">Este é um resumo de teste para o pesquisador em questão que deve ter mais de sessenta caracteres para testar o truncamento.</div>
    <div class="atuacao">Área 1; Área 2; Área 3</div>
    <div class="formacao">Doutorado em Ciência; Mestrado em Tecnologia</div>
</body>
</html>
`;

const htmlEscaped = `
&lt;html&gt;
&lt;body&gt;
    &lt;h2 class="nome"&gt;Nome Escapado&lt;/h2&gt;
    &lt;div class="resumo"&gt;Este é um resumo escapado para testar se a função lida com entidades HTML corretamente e extrai o texto.&lt;/div&gt;
    &lt;div class="atuacao"&gt;Área A; Área B&lt;/div&gt;
    &lt;div class="formacao"&gt;Graduação em Engenharia&lt;/div&gt;
&lt;/body&gt;
&lt;/html&gt;
`;

async function test() {
    const events = [
        { httpMethod: 'POST', body: JSON.stringify({ html: htmlNormal }) },
        { httpMethod: 'POST', body: JSON.stringify({ html: htmlEscaped }) }
    ];

    for (const event of events) {
        try {
            const result = await handler(event);
            const data = JSON.parse(result.body);
            console.log(`Success: ${data.success}`);
            console.log(`RequiresCaptcha: ${data.requiresCaptcha}`);
            console.log(`Nome: ${data.nome}`);
            console.log(`Resumo: ${data.resumo ? data.resumo.substring(0, 60) : "N/A"}`);
            console.log(`Areas: ${data.areas_atuacao ? data.areas_atuacao.length : 0}`);
            console.log(`Formacao: ${data.formacao_academica ? data.formacao_academica.length : 0}`);
            console.log("---");
        } catch (err) {
            console.error("Erro ao processar:", err);
        }
    }
}

test();
