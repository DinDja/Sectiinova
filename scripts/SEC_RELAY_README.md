# SEC Residential Relay (No VPS)

Use este relay quando a SEC funcionar na sua internet local, mas falhar em runtimes de datacenter.

## Como funciona

- O relay roda localmente na sua maquina e consulta a SEC usando seu IP residencial.
- Voce publica o relay por tunel HTTPS gratuito (ex.: cloudflared).
- O app principal usa `SEC_EXTERNAL_PROXY_URL` para chamar esse relay.

## 1. Subir relay local

No projeto principal:

```powershell
$env:SEC_RELAY_PORT="8787"
$env:SEC_RELAY_TOKEN="troque-por-um-token-forte"
$env:SEC_MATRICULA_GUARD_TIMEOUT_MS="22000"
$env:SEC_MATRICULA_ATTEMPT_TIMEOUT_MS="12000"
npm run sec:relay
```

Endpoint local:

`http://localhost:8787/api/sec-escola/servidores`

## 2. Abrir tunel HTTPS (sem VPS)

Com cloudflared instalado:

```powershell
cloudflared tunnel --url http://localhost:8787
```

Ele gera uma URL publica `https://<random>.trycloudflare.com`.

## 3. Configurar app principal (Netlify)

No deploy do app principal:

- `SEC_EXTERNAL_PROXY_URL=https://<random>.trycloudflare.com/api/sec-escola/servidores`
- `SEC_EXTERNAL_PROXY_TOKEN=troque-por-um-token-forte`
- `SEC_EXTERNAL_PROXY_TIMEOUT_MS=12000`
- `SEC_MATRICULA_GUARD_TIMEOUT_MS=22000`
- `SEC_MATRICULA_ATTEMPT_TIMEOUT_MS=12000`

## 4. Teste rapido do relay

```powershell
curl -X POST "http://localhost:8787/api/sec-escola/servidores" \
  -H "Content-Type: application/json" \
  -H "x-relay-token: troque-por-um-token-forte" \
  -d "{\"codigoMec\":\"29199387\",\"codigoSec\":\"1103778\",\"anexo\":\"00\",\"matricula\":\"12345678\",\"nomeEscola\":\"CENTRO TERRITORIAL DE EDUCACAO PROFISSIONAL DO LITORAL NORTE E AGRESTE BAIANO\",\"municipio\":\"ALAGOINHAS\"}"
```

## Observacao

Sem VPS, o relay depende da sua maquina ligada e do tunel ativo.
