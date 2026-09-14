# ddao

Dashboard da vida pessoal.

## Requisitos

- Node.js 22+
- Docker e Docker Compose

## Rodando localmente

```bash
npm install
npm run dev
```

O comando sobe o Postgres no Docker, espera o banco aceitar conexões, aplica as migrations e
inicia o servidor em http://localhost:3000.

Verificação rápida: http://localhost:3000/api/v1/status

## Testes

```bash
npm test
```

Somente testes de integração, contra servidor e banco reais.

## Licença

MIT
