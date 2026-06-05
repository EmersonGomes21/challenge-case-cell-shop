
# CaseCellShop — Mini checkout demo (Docker-first)

Projeto de demonstração para um fluxo mínimo de checkout de capinhas de celular. Este repositório foi preparado para rodar via Docker (desenvolvimento com `docker-compose`). As instruções abaixo privilegiam um fluxo "Docker-first" — usar Docker é o caminho recomendado para reproduzir o ambiente de desenvolvimento e evitar problemas de dependências.

Visão geral
- **Stack:** Next.js (App Router), React, TypeScript, Prisma, PostgreSQL, Tailwind, Docker
- **APIs:** listar produtos e criar checkout
- **Banco:** Postgres (orquestrado via `docker-compose`)

Pré-requisitos
- Docker (ex.: Docker Desktop)
- Docker Compose (geralmente incluso no Docker Desktop)

Configuração rápida (Docker - recomendado)

1. Copie o template de variáveis de ambiente e ajuste conforme necessário:

```bash
cp .env.example .env
# edite .env e verifique DATABASE_URL, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
```

2. Suba os containers (dev):

```bash
docker-compose up -d --build
```

- **Worker (processamento de jobs) — instruções rápidas**
O worker processa a fila de jobs em background. Comandos rápidos para iniciar o worker:

```bash
# Em Docker (recomendado, se o serviço estiver definido no docker-compose):
docker-compose up -d

# Localmente (modo daemon):
node scripts/worker.js

# Localmente (processa 1 job e sai):
node scripts/worker.js --once
```

- O serviço `web` possui um entrypoint que aguarda o Postgres e executa os passos necessários (gera o client do Prisma, aplica migrations ou `db push` e roda o seed) quando as variáveis `RUN_MIGRATIONS` e `RUN_SEED` estiverem habilitadas (padrão: `true`).

3. Verifique logs e acesse a aplicação:

```bash
docker-compose logs -f web
# abra http://localhost:3000
```

Comandos úteis (migrations / seed / shell)

- Rodar migração manualmente (se necessário):

```bash
docker-compose run --rm web npx prisma migrate dev --name init
```

- Rodar seed manualmente (fallback):

```bash
docker-compose run --rm web npm run prisma:seed
```

- Entrar no shell do container `web`:

```bash
docker-compose exec web sh
```
- Exibir os logs do container `web`:

```bash
docker compose logs -f web
```
- Verificar readiness do Postgres a partir do container `web`:

```bash
docker-compose exec web pg_isready -h db -p 5432 -U postgres
```

Rebuild / forçar rebuild da imagem (dev):

```bash
docker-compose build --no-cache web
docker-compose up -d web
```

Executar localmente sem Docker (opcional)

Este fluxo é opcional e pode apresentar diferenças de ambiente. Se preferir rodar localmente sem Docker, use estes passos:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run worker
npm run dev
```

Produção (build da imagem)

```bash
docker build -t casecellshop .
# Exemplo de execução (substitua DATABASE_URL):
docker run -e DATABASE_URL="postgres://postgres:password@host:5432/casecellshop" -p 3000:3000 casecellshop
```

Arquitetura e componentes

### Fluxo de checkout

1. **Frontend** → usuário visualiza produtos, seleciona quantidade e clica em "Comprar"
2. **API `/api/checkout`** → valida entrada, reserva estoque (transação atômica), cria pedido com status `PENDING`
3. **Response imediata** → `202 PENDING` é retornado ao cliente **imediatamente** (não bloqueia)
4. **Background Job** → um job `PROCESS_ERP` é enfileirado para processamento assíncrono
5. **Worker (`scripts/worker.js`)** → processa jobs em background, comunica com ERP simulado
6. **Resultado final** → pedido transiciona para `CONFIRMED` (sucesso) ou `CANCELLED` (erro)

### Service Worker: Processamento Assíncrono

O `scripts/worker.js` é um processador de jobs em background que:

- **Busca jobs pendentes** da fila (`Job` table com `status: 'pending'`)
- **Processa ERP** com:
  - Latência simulada (2s)
  - Falha temporária aleatória (40% chance) → retry automático (máx 3 tentativas)
  - Falha permanente aleatória (10% chance) → cancela pedido
  
- **Atualiza estado do pedido**:
  - ✅ Sucesso → `CONFIRMED`
  - ❌ Falha permanente → `CANCELLED`
  - ⚠️ Falha temporária → requeue com backoff
- **Mantém idempotência** → idempotency key é marcada como `SUCCESS` ou `FAILED`

Nota sobre o mecanismo de fila: Para manter o escopo controlado, foi implementada uma fila persistida em PostgreSQL utilizando Prisma. Em produção, a evolução natural seria substituir esse mecanismo por BullMQ + Redis ou RabbitMQ, mantendo a mesma interface de processamento assíncrono.

#### Como rodar o worker

**Em Docker** (automático via `docker-compose`):
```bash
docker-compose up -d
# Worker roda automaticamente em container separado
```

**Localmente** (modo daemon contínuo):
```bash
node scripts/worker.js
```

**Localmente** (processar 1 job e sair):
```bash
node scripts/worker.js --once
```

### Tela de Histórico de Pedidos

Acesse `/orders` para visualizar:
- **Lista de todos os pedidos** criados (ordenados por data descendente)
- **Status do pedido** com badge visual (PENDING, CONFIRMED, CANCELLED)
- **Detalhes de cada pedido**:
  - ID e data de criação
  - Itens comprados (quantidade, valor unitário, subtotal por linha)
  - **Total do pedido** em reais
  - Status atual de processamento

- **Re-tentativa de compra:** pedidos que ficaram **Recusado / Cancelado** podem ser tentados novamente. Na Tela de Pedidos, abra o cartão do pedido e clique em **"Comprar Novamente"** para reenfileirar o processamento (isso cria uma nova chave de idempotência e reenvia o job ao worker).

A tela faz **polling automático** a cada segundo enquanto o pedido está em `PENDING`, permitindo acompanhamento em tempo real da transição para `CONFIRMED` ou `CANCELLED`.

Observações e troubleshooting

- O entrypoint do `web` tenta executar o `prisma/seed.ts` automaticamente, portanto os dados de seed normalmente são carregados no container sem necessidade de comando manual.
- Se ver erros relacionados a peer-dependencies durante o build, um workaround rápido é adicionar `--legacy-peer-deps` ao `npm install`. A solução mais sustentável é ajustar as versões no `package.json` e usar o lockfile.

Contato / contribuição

Se quiser, eu posso:
- gerar e commitar o `package-lock.json` e ajustar o `Dockerfile` para `npm ci`;
- transformar `node_modules` bind-mount em volume nomeado para evitar colisões entre host e container.

Boa sorte e feliz desenvolvimento!

