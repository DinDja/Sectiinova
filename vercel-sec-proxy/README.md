# Vercel SEC Proxy

Serverless function para consultar SEC em tempo real (fallback de transporte `node-only` + `fetch-first`).

## 1. Instalar CLI da Vercel

```powershell
npm i -g vercel
```

Ou usar sem instalar globalmente:

```powershell
npx vercel --version
```

## 2. Fazer login e publicar

No terminal, na raiz deste repositorio:

```powershell
cd vercel-sec-proxy
vercel login
vercel --prod
```

A URL final da function fica no formato:

`https://<seu-projeto>.vercel.app/api/sec-escola-servidores`

## 3. Variaveis recomendadas no projeto da Vercel

- `SEC_MATRICULA_GUARD_TIMEOUT_MS=22000`
- `SEC_MATRICULA_ATTEMPT_TIMEOUT_MS=12000`

## 4. Ligar no app principal (Netlify/Next)

No app principal, configure:

- `SEC_EXTERNAL_PROXY_URL=https://<seu-projeto>.vercel.app/api/sec-escola-servidores`
- `SEC_EXTERNAL_PROXY_TIMEOUT_MS=12000`

Depois, faca redeploy do app principal.

## 5. Teste rapido

```powershell
curl -X POST "https://<seu-projeto>.vercel.app/api/sec-escola-servidores" \
  -H "Content-Type: application/json" \
  -d "{\"codigoMec\":\"29199387\",\"codigoSec\":\"1103778\",\"anexo\":\"00\",\"matricula\":\"12345678\",\"nomeEscola\":\"CENTRO TERRITORIAL DE EDUCACAO PROFISSIONAL DO LITORAL NORTE E AGRESTE BAIANO\",\"municipio\":\"ALAGOINHAS\"}"
```

Se estiver tudo certo, retorna `status 200` com payload JSON.
