const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function log(stage, message, data = {}) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${stage}] ${message}`, data)
}

async function processJob(job) {
  const { orderId, idempotencyKey } = job.payload
  log('WORKER', `Processando job #${job.id}`, { orderId, idempotencyKey, attempt: job.attempts + 1 })

  try {

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } }
    })

    if (!order) {
      log('ERROR', `Pedido #${orderId} não encontrado`, {})
      throw new Error('Order not found')
    }

    // simulate ERP
    log('ERP', `Simulando chamada ERP para pedido #${orderId}...`)
    const delay = 2000
    await new Promise((res) => setTimeout(res, delay))
    
    // randomly fail to simulate transient errors
    const rnd = Math.random()
    if (rnd < 0.40) {
      log('ERP', `❌ Falha temporária (chance de 40%)`, { random: rnd.toFixed(4) })
      throw Object.assign(new Error('ERP temporary failure'), { temporary: true })
    }
    if (rnd < 0.50) {
      log('ERP', `❌ Falha permanente (chance de 10%)`, { random: rnd.toFixed(4) })
      throw new Error('ERP permanent failure')
    }
    
    log('ERP', `✅ Sucesso ERP`, { random: rnd.toFixed(4) })

    // mark order confirmed
    log('DB', `Atualizando status do pedido #${orderId} para CONFIRMADO`)
    await prisma.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED', idempotencyKey } })
    
    if (idempotencyKey) {
      log('DB', `Atualizando status da chave de idempotência para SUCESSO`, { key: idempotencyKey })
      await prisma.idempotency.update({ where: { key: idempotencyKey }, data: { status: 'SUCCESS', response: { orderId, status: 'confirmed' } } })
    }
    
    log('DB', `Marcando job #${job.id} como concluído`)
    await prisma.job.update({ where: { id: job.id }, data: { status: 'done' } })
    
    log('SUCCESS', `✅ Pedido #${orderId} confirmado com sucesso`, { jobId: job.id })
  } catch (e) {
    const attempts = job.attempts + 1
    log('ERROR', `❌ Processamento falhou: ${e.message}`, { orderId, attempts, temporary: e.temporary || false })
    
    log('DB', `Atualizando status do pedido #${orderId} para CANCELADO`)
    await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } })
    
    if (idempotencyKey) {
      log('DB', `Atualizando status da chave de idempotência para FALHA`, { key: idempotencyKey })
      await prisma.idempotency.update({ where: { key: idempotencyKey }, data: { status: 'FAILED', response: { message: 'ERP error' } } })
    }

    const updates = { attempts }
    if (e.temporary && attempts < 3) {
      // requeue with backoff
      updates.status = 'pending'
      log('RETRY', `⚠️  Erro temporário - reenfileirando job #${job.id}`, { attempts, maxAttempts: 3, backoffMs: 1000 })
      await prisma.job.update({ where: { id: job.id }, data: updates })
    } else {
      updates.status = 'failed'
      const reason = e.temporary ? 'máximo de tentativas excedido' : 'falha permanente'
      log('FAILED', `🛑 Job #${job.id} falhou permanentemente (${reason})`, { attempts })
      await prisma.job.update({ where: { id: job.id }, data: updates })
    }
  }
}

async function runOnce() {
 const job = await prisma.$transaction(async (tx) => {
  const candidate = await tx.job.findFirst({
    where: {
      status: 'pending'
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  if (!candidate) {
    return null
  }

  await tx.job.update({
    where: {
      id: candidate.id
    },
    data: {
      status: 'processing'
    }
  })

  return candidate
})

  if (!job) {
    log('QUEUE', '⏳ Sem jobs pendentes, aguardando...')
    return false
  }
  
  log('QUEUE', `Job pendente encontrado #${job.id}`, { orderId: job.payload.orderId, attempts: job.attempts })
  
  log('STATE', `Marcando job #${job.id} como processando`)
  await prisma.job.update({ where: { id: job.id }, data: { status: 'processing' } })
  
  await processJob(job)
  return true
}

async function main() {
  const once = process.argv.includes('--once')
  
  if (once) {
    log('START', '🚀 Worker iniciado em modo UMA-ÚNICA-VEZ')
    try {
      await runOnce()
      log('SHUTDOWN', '✅ Modo uma-única-vez concluído, saindo')
      process.exit(0)
    } catch (e) {
      log('FATAL', `❌ Erro fatal: ${e.message}`)
      process.exit(1)
    }
  }
  
  log('START', '🚀 Worker iniciado em modo DAEMON (polling contínuo)')
  let iteration = 0
  while (true) {
    try {
      iteration++
      log('CYCLE', `Iniciando ciclo de polling #${iteration}`)
      const worked = await runOnce()
      if (!worked) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    } catch (e) {
      log('ERROR', `💥 Erro inesperado no loop principal: ${e.message}`)
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
}

main().catch((e) => { 
  log('FATAL', `❌ Worker travou: ${e.message}`, { stack: e.stack })
  process.exit(1) 
})
