#!/usr/bin/env bash
set -euo pipefail

# Defaults
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"
DB_NAME="${DB_NAME:-casecellshop}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
RUN_SEED="${RUN_SEED:-true}"

export PGPASSWORD="$DB_PASSWORD"

echo "Entrypoint: esperando Postgres em $DB_HOST:$DB_PORT (timeout=${WAIT_TIMEOUT}s)..."

elapsed=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
  sleep 1
  elapsed=$((elapsed+1))
  if [ "$elapsed" -ge "$WAIT_TIMEOUT" ]; then
    echo "Timeout aguardando Postgres" >&2
    exit 1
  fi
done

echo "Postgres disponível."

# Se node_modules estiver faltando (por exemplo bind-mount em dev), instalar dependências
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null || true)" ]; then
  echo "Instalando dependências (fallback) usando npm ci..."
  npm ci --legacy-peer-deps
fi

if [ -f "prisma/schema.prisma" ] || [ -d prisma ]; then
  echo "Gerando Prisma Client..."
  npx prisma generate || true

  if [ "$RUN_MIGRATIONS" = "true" ]; then
    if [ -d prisma/migrations ] && [ "$(ls -A prisma/migrations 2>/dev/null || true)" ]; then
      echo "Aplicando migrations (prisma migrate deploy)..."
      npx prisma migrate deploy || true
    else
      echo "Sem migrations; executando prisma db push para sincronizar schema..."
      npx prisma db push || true
    fi
  else
    echo "Pular migrações (RUN_MIGRATIONS=false)."
  fi

  if [ "$RUN_SEED" = "true" ]; then
    if [ -f prisma/seed.js ] || [ -f prisma/seed.ts ]; then
      echo "Rodando seed..."
      # Preferir seed CommonJS se disponível (evita problemas com loaders ESM em runtime)
      if [ -f prisma/seed.js ]; then
        node prisma/seed.js || true
      elif [ -f prisma/seed.ts ]; then
        # Executar seed TypeScript em modo ESM com ts-node loader (fallback)
        TS_NODE_TRANSPILE_ONLY=true node --loader ts-node/esm prisma/seed.ts || true
      else
        echo "Seed script não encontrado; pulando seed."
      fi
    else
      echo "Nenhum seed detectado; pulando."
    fi
  else
    echo "Pular seed (RUN_SEED=false)."
  fi
fi

echo "Iniciando comando: $@"
exec "$@"
