# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

`ddao` — dashboard da vida pessoal. API REST versionada em `/api/v1` sobre Postgres.
Ainda **não há entidades de domínio**: `infra/migrations/` está vazio e os endpoints
existentes (`/api/v1/status` e `/api/v1/migrations`) são ambos de infraestrutura.
`bcryptjs` ainda não é dependência — entra junto com a primeira entidade que tiver senha.

## Stack

JavaScript puro, sem TypeScript. Next.js 15.5 (**Pages Router**, não App Router) + React 19,
PostgreSQL 17 em Docker, driver `pg`, migrations com `node-pg-migrate`, roteamento de API com
`next-connect`, testes com Jest 30.

Arquivos da aplicação usam ESM (`import`/`export`). `jest.config.js`, `commitlint.config.js`
e `infra/scripts/*` são CommonJS — não converter, são carregados fora do pipeline do Next.

## Comandos

| Comando                                                   | O que faz                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`                                             | Sobe Postgres, espera aceitar conexões, roda migrations, sobe `next dev` em :3000     |
| `npm test`                                                | Sobe Postgres + migrations, sobe `next dev` e o Jest em paralelo, derruba tudo no fim |
| `npm run test:watch`                                      | Jest em watch. **Exige `npm run dev` em outro terminal** — não sobe servidor          |
| `npm run lint` / `lint:fix`                               | ESLint                                                                                |
| `npm run format` / `format:check`                         | Prettier                                                                              |
| `npm run migrations:create -- nome-da-migration`          | Cria arquivo em `infra/migrations/`                                                   |
| `npm run migrations:up` / `migrations:down`               | Aplica / reverte migrations                                                           |
| `npm run services:up` / `services:stop` / `services:down` | Docker Compose (`down` apaga o container, não o volume)                               |
| `npm run commit`                                          | Commitizen (Conventional Commits)                                                     |

**Rodar um teste só:** com `npm run dev` ativo em outro terminal,
`npx jest tests/integration/api/v1/status/get.test.js`. O `npm test` não aceita filtro de
arquivo porque o argumento não atravessa o `concurrently`.

## Arquitetura

Fluxo de uma request, uma camada por vez:

```
pages/api/v1/<recurso>/index.js   HTTP: lê request, chama model, devolve response
models/<recurso>.js               regra de negócio
infra/database.js                 ÚNICO ponto de acesso ao banco
```

Um handler HTTP nunca monta SQL e nunca importa `pg`. Um model nunca toca em `request`/`response`.

**Exceção deliberada:** `pages/api/v1/status/index.js` chama `infra/database.js` direto. O
recurso `status` é diagnóstico da própria infraestrutura — não existe regra de negócio ali, e
criar um `models/status.js` seria só um repasse. Todo recurso de domínio passa por `models/`.

`/api/v1/migrations` já segue o caminho completo: a rota só decide status HTTP, e
`models/migrator.js` é quem envolve o `node-pg-migrate`.

### Endpoints

| Endpoint                  | Comportamento                                                             |
| ------------------------- | ------------------------------------------------------------------------- |
| `GET /api/v1/status`      | Versão do Postgres, `max_connections` e conexões abertas                  |
| `GET /api/v1/migrations`  | **Dry run**: lista as migrations pendentes sem aplicar. Sempre 200        |
| `POST /api/v1/migrations` | Aplica as pendentes. **201** se aplicou alguma, **200** se não havia nada |

Nos dois métodos de `/migrations` o corpo é um array de `{ path, name, timestamp }` —
é o retorno cru do `runner` do node-pg-migrate, incluindo o caminho absoluto no servidor.

**`POST /api/v1/migrations` não tem autenticação e altera o esquema do banco.** Enquanto o
projeto só roda local isso é aceitável; antes de qualquer deploy, é o primeiro endpoint que
precisa de proteção.

### models/migrator.js

Envolve o `runner` do `node-pg-migrate` (named export, não default — mudou no v9). Os dois
métodos diferem só no `dryRun`, e o `dir` é resolvido a partir de `process.cwd()`, então o
runner lê em produção o mesmo diretório que lê nos testes.

Migrations usam uma conexão **dedicada e persistente** (`database.getNewClient()`), não o
`database.query()` — o runner precisa segurar o mesmo client durante toda a execução, e é o
`migrator` que fecha esse client no `finally`. Corrida entre dois POST simultâneos é resolvida
pelo advisory lock do próprio node-pg-migrate.

### Contrato de erro

Todo erro que chega ao cliente é serializado por `toJSON()` das classes de `infra/errors.js`,
sempre no mesmo formato:

```json
{ "name": "...", "message": "...", "action": "...", "status_code": 0 }
```

`infra/controller.js` exporta `controller.errorHandlers`, passado para `router.handler(...)` do
next-connect em **toda** rota. É ele que traduz exceção em resposta: `ServiceError` (503) vaza
com sua própria mensagem; qualquer outra exceção vira `InternalServerError` (500) genérico —
a causa real só vai para o `console.error`, nunca para o cliente. Método não mapeado cai em
`MethodNotAllowedError` (405) via `onNoMatch`.

Ao criar uma rota nova, o esqueleto é sempre: `createRouter()` → `router.get/post(...)` →
`export default router.handler(controller.errorHandlers)`.

### Acesso ao banco

`infra/database.js` abre **um `Client` novo por query** e o fecha no `finally`. É deliberado:
garante que nenhum handle fique aberto ao fim da suíte do Jest, o que evita testes que passam
mas não encerram. O custo é um handshake TCP + auth por query. Quando isso virar gargalo, trocar
por `pg.Pool` — e nesse momento o teardown dos testes precisa fechar o pool explicitamente,
senão o Jest trava.

Erro de conexão ou de query é embrulhado em `ServiceError`, nunca propagado cru.

### Variáveis de ambiente

`.env.development` **é versionado de propósito** — são credenciais do Postgres local do Docker,
não têm valor fora da máquina. Ele é lido por três caminhos independentes, e os três precisam
continuar existindo:

- `next dev` carrega automaticamente;
- `jest.config.js` carrega explicitamente via `dotenv` (o Jest roda com `NODE_ENV=test` e não
  pegaria `.env.development` sozinho);
- `node-pg-migrate` recebe `--envPath .env.development` nos scripts.

Segredo de verdade vai em `.env.local` ou `.env.*.local`, que estão no `.gitignore`.

### Resolução de módulos

`jsconfig.json` define `baseUrl: "."`, então imports são absolutos a partir da raiz:
`import database from "infra/database"`, `import orchestrator from "tests/orchestrator"`.
`jest.config.js` espelha isso com `moduleDirectories: ["node_modules", "<rootDir>"]` — mexer
em um exige mexer no outro.

## Testes

Só teste de integração, contra servidor e banco reais (ver preferências globais). O que é
específico daqui:

- `tests/orchestrator.js` também expõe `clearDatabase()`, que faz
  `DROP SCHEMA public CASCADE; CREATE SCHEMA public`. Teste que dependa do estado do banco
  chama isso no `beforeAll`. **`npm test` usa o mesmo banco do `npm run dev`** — quem sujar o
  esquema limpa no `afterAll`.
- `tests/fixtures/migrations.js` escreve uma migration descartável de verdade em
  `infra/migrations/` e a remove depois. Sem ela o endpoint de migrations não teria nada
  pendente para provar que funciona, e mockar o runner violaria a regra de só usar integração.
  Quando existir a primeira migration real, avaliar se a fixture ainda é necessária.
- `tests/orchestrator.js` faz a barreira de largada: `waitForAllServices()` fica batendo em
  `GET /api/v1/status` até responder 200. Todo arquivo de teste chama isso no `beforeAll`.
  Como o status só responde 200 com o banco de pé, essa espera cobre servidor **e** banco.
- `--runInBand` é obrigatório: os testes compartilham um único banco, rodar em paralelo gera
  interferência entre suítes.
- `testTimeout` é 60s porque o primeiro teste espera o `next dev` compilar.
- Asserção de versão do Postgres usa regex (`/^17\./`), não string exata — a imagem
  `postgres:17-alpine` sobe de patch sozinha.

## Docker Compose

`infra/compose.yaml` declara `name: ddao` na primeira linha. **Não remover.** Sem isso o
Compose deriva o nome do projeto do diretório do arquivo (`infra`), que é genérico o bastante
para colidir com outros repositórios da máquina e fazer o `up` destruir containers alheios.
