/**
 * Dev script — manually enqueue an alert-evaluation job.
 * Usage: npx ts-node scripts/trigger-alert.ts AAPL 200
 *
 * This simulates what FinnhubClient.processTick() does when a live price tick arrives.
 * Useful for testing the full alert → notification → email flow without waiting for market hours.
 */
import { Queue } from 'bullmq'

const [, , symbol = 'AAPL', priceArg = '200'] = process.argv
const price = parseFloat(priceArg)

if (!symbol || isNaN(price)) {
  console.error('Usage: npx ts-node scripts/trigger-alert.ts <SYMBOL> <PRICE>')
  process.exit(1)
}

async function main() {
  const queue = new Queue('alert-evaluation', {
    connection: { url: process.env['BULLMQ_REDIS_URL'] ?? 'redis://localhost:6379' },
  })

  const job = await queue.add('evaluate', { symbol, price })
  console.log(`✓ Enqueued job ${job.id}: ${symbol} @ $${price}`)
  console.log('  → Watch backend logs for "Alert fired"')
  console.log('  → Check http://localhost:8025 for the alert email')
  console.log('  → Check the notification bell in the UI')

  await queue.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
