
# CaseCellShop — Mini checkout demo (Docker-first)

Projeto de demonstração para um fluxo mínimo de checkout de capinhas de celular. Este repositório foi preparado para rodar via Docker (desenvolvimento com `docker-compose`). As instruções abaixo privilegiam um fluxo "Docker-first" — usar Docker é o caminho recomendado para reproduzir o ambiente de desenvolvimento e evitar problemas de dependências.

Visão geral
- **Stack:** Next.js (App Router), React, TypeScript, Prisma, PostgreSQL, Tailwind, Docker
- **APIs:** listar produtos, pedidos e criar checkout e retry
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

### Tela de Produtos e Paginação

A página inicial (`/`) exibe a listagem de produtos disponíveis para compra com suporte a paginação server-side.

#### Funcionalidades

* Exibição dos produtos em layout responsivo utilizando Tailwind CSS.
* Paginação baseada em parâmetros `page` e `pageSize`.
* Navegação entre páginas através dos botões **Anterior** e **Próxima**.
* Seleção dinâmica da quantidade de itens por página (4, 8, 12, 24 ou 48 produtos).
* Atualização automática da listagem sem recarregar a página utilizando React Query.
* Indicadores de página atual, total de páginas e quantidade total de produtos cadastrados.

#### API de Produtos

A rota `GET /api/products` suporta os seguintes parâmetros:

```http
GET /api/products?page=1&pageSize=8
```

Parâmetros:

| Parâmetro  | Descrição                      | Padrão |
| ---------- | ------------------------------ | ------ |
| `page`     | Página atual                   | `1`    |
| `pageSize` | Quantidade de itens por página | `8`    |

Exemplo de resposta:

```json
{
  "items": [...],
  "page": 1,
  "pageSize": 8,
  "total": 25,
  "totalPages": 4
}
```

A paginação é realizada no banco de dados utilizando `skip` e `take` do Prisma, evitando carregar todos os produtos em memória e tornando a solução mais escalável para grandes volumes de dados.

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

## Tecnologias Utilizadas e Justificativas

A escolha da stack priorizou produtividade, simplicidade operacional e aderência aos problemas apresentados no desafio, mantendo uma arquitetura que possa evoluir gradualmente para cenários de maior escala.

### Frontend

#### Next.js 15 + React 19

O Next.js foi escolhido por oferecer uma estrutura moderna para aplicações Fullstack, permitindo desenvolver frontend e APIs no mesmo projeto.

Principais benefícios:

* Estrutura organizada baseada em rotas.
* API Routes nativas para o backend do desafio.
* Excelente experiência de desenvolvimento.
* Facilidade para futura evolução para SSR, SSG e cache de dados.
* Redução da complexidade operacional ao concentrar frontend e backend em uma única aplicação.

#### TypeScript

Utilizado para aumentar a segurança do código e reduzir erros em tempo de desenvolvimento.

Benefícios:

* Tipagem forte entre frontend, backend e banco de dados.
* Melhor manutenção e refatoração.
* Maior legibilidade e confiabilidade do código.

#### Tailwind CSS 4

Escolhido para acelerar o desenvolvimento da interface sem necessidade de criar uma grande quantidade de CSS customizado.

Benefícios:

* Desenvolvimento rápido de interfaces responsivas.
* Padronização visual.
* Menor manutenção de estilos.
* Excelente integração com componentes React.

#### React Query

Responsável pelo gerenciamento de estado assíncrono e comunicação com APIs.

Benefícios:

* Cache automático.
* Controle de loading e tratamento de erros.
* Refetch automático quando necessário.
* Simplificação da lógica de requisições.

Foi utilizado principalmente nas telas de produtos e histórico de pedidos.

#### React Hook Form + Zod

Utilizados para construção e validação dos formulários.

Benefícios:

* Validação declarativa.
* Menor quantidade de código.
* Feedback rápido ao usuário.
* Reutilização das regras de validação.

### Backend

#### API Routes do Next.js

Para o escopo do desafio, a utilização das API Routes foi suficiente para implementar o backend sem necessidade de criar um serviço separado.

Benefícios:

* Menor complexidade arquitetural.
* Compartilhamento de tipos com o frontend.
* Facilidade de manutenção.

---

### Persistência de Dados

#### PostgreSQL

Banco de dados relacional escolhido para armazenar:

* Produtos
* Pedidos
* Itens dos pedidos
* Chaves de idempotência
* Jobs de processamento

Motivos da escolha:

* Confiabilidade.
* Suporte a transações.
* Excelente integração com Prisma.
* Adequado para cenários de controle de estoque e pedidos.

A escolha também segue a recomendação apresentada no enunciado do desafio.

#### Prisma ORM

Responsável pelo acesso aos dados.

Benefícios:

* Tipagem automática.
* Migrations versionadas.
* Produtividade elevada.
* Facilidade para modelar relacionamentos.

---

### Processamento Assíncrono

#### Worker em Node.js

Foi implementado um worker dedicado para simular o processamento assíncrono do ERP.

Objetivos:

* Evitar que o checkout dependa diretamente da disponibilidade do ERP.
* Simular falhas temporárias e permanentes.
* Implementar retentativas automáticas.
* Demonstrar resiliência do fluxo de pedidos.

O worker processa jobs armazenados em banco e atualiza o estado dos pedidos conforme o resultado do processamento.

#### Fila Persistida em PostgreSQL

Para manter o escopo controlado, foi utilizada uma fila baseada em tabela de banco de dados.

Benefícios:

* Persistência dos jobs.
* Simplicidade operacional.
* Fácil entendimento para avaliação técnica.
* Suporte a retry e reprocessamento.

Em um ambiente de produção, uma evolução natural seria a adoção de BullMQ + Redis ou RabbitMQ.

---

### Infraestrutura

#### Docker + Docker Compose

Toda a aplicação foi preparada para execução via containers.

Benefícios:

* Ambiente reproduzível.
* Facilidade de configuração.
* Eliminação de diferenças entre máquinas de desenvolvimento.
* Simplificação da execução do PostgreSQL e da aplicação.

---

### Bibliotecas Auxiliares

#### UUID

Utilizado para geração de chaves de idempotência e identificadores únicos.

#### Lucide React

Biblioteca de ícones utilizada na interface por possuir:

* Boa performance.
* API simples.
* Compatibilidade com React.
* Visual moderno e consistente.

#### Radix UI

Utilizado para componentes acessíveis e reutilizáveis.

Benefícios:

* Acessibilidade nativa.
* Componentes desacoplados de estilo.
* Integração simples com Tailwind CSS.

---

### Considerações Arquiteturais

O foco da solução foi demonstrar os principais conceitos exigidos pelo desafio:

* Controle de estoque consistente.
* Idempotência.
* Processamento assíncrono.
* Resiliência diante de falhas do ERP.
* Separação entre jornada do cliente e processamento interno.
* Evolução incremental da arquitetura sem necessidade de reescrever o ERP.

A implementação prioriza clareza, simplicidade e possibilidade de evolução futura para arquiteturas distribuídas de maior escala.


