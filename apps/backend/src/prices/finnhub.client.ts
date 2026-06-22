import { Injectable, OnModuleInit, OnModuleDestroy, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import WebSocket from 'ws'
import type Redis from 'ioredis'
import { REDIS_PUB } from '../redis/redis.constants'
import { ALERT_EVALUATION_QUEUE } from '../alerts/alerts.constants'

interface TradeTick {
  s: string // symbol
  p: number // price
  t: number // timestamp (ms)
  v: number // volume
}

interface FinnhubTradeMessage {
  type: 'trade'
  data: TradeTick[]
}

@Injectable()
export class FinnhubClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinnhubClient.name)
  private ws: WebSocket | null = null
  private readonly apiKey: string
  private reconnectDelay = 2000
  private destroyed = false
  private pendingSubscriptions = new Set<string>()

  // Finnhub streams every trade, but we only persist/broadcast the latest price
  // per symbol once per FLUSH_INTERVAL_MS. Ticks are coalesced in memory so a
  // burst of trades costs a fixed handful of Redis commands per minute instead
  // of ~8 per tick — keeps us well under the Upstash free-tier monthly quota.
  private static readonly FLUSH_INTERVAL_MS = 60_000
  private readonly latestTicks = new Map<string, TradeTick>()
  private readonly lastFlushedPrice = new Map<string, number>()
  private flushInterval?: ReturnType<typeof setInterval>
  private flushing = false

  constructor(
    config: ConfigService,
    @Inject(REDIS_PUB) private readonly redisPub: Redis,
    @InjectQueue(ALERT_EVALUATION_QUEUE) private readonly alertQueue: Queue,
  ) {
    this.apiKey = config.get<string>('FINNHUB_API_KEY') ?? ''
  }

  onModuleInit() {
    if (!this.apiKey) {
      this.logger.warn('FINNHUB_API_KEY not set — FinnhubClient disabled')
      return
    }
    this.connect()
    this.flushInterval = setInterval(() => void this.flush(), FinnhubClient.FLUSH_INTERVAL_MS)
  }

  onModuleDestroy() {
    this.destroyed = true
    if (this.flushInterval) clearInterval(this.flushInterval)
    this.ws?.close()
  }

  subscribe(symbol: string) {
    if (!this.apiKey) return
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol }))
    } else {
      this.pendingSubscriptions.add(symbol)
    }
  }

  unsubscribe(symbol: string) {
    if (!this.apiKey) return
    this.pendingSubscriptions.delete(symbol)
    this.latestTicks.delete(symbol)
    this.lastFlushedPrice.delete(symbol)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }))
    }
  }

  private connect() {
    this.logger.log('Connecting to Finnhub WebSocket…')
    this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`)

    this.ws.on('open', () => {
      this.logger.log('Finnhub WebSocket connected')
      this.reconnectDelay = 1000
      void this.publishStatus(true)
      // Replay any subscriptions that were requested before connect
      for (const sym of this.pendingSubscriptions) {
        this.ws!.send(JSON.stringify({ type: 'subscribe', symbol: sym }))
      }
      this.pendingSubscriptions.clear()
    })

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse((data as Buffer).toString()) as FinnhubTradeMessage
        if (msg.type === 'trade' && Array.isArray(msg.data)) {
          for (const tick of msg.data) {
            this.processTick(tick)
          }
        }
      } catch {
        // ignore malformed frames
      }
    })

    this.ws.on('close', () => {
      this.logger.warn('Finnhub WebSocket closed')
      void this.publishStatus(false)
      if (!this.destroyed) this.scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      this.logger.error('Finnhub WebSocket error', err.message)
      if (err.message.includes('429')) {
        // Rate limited — back off for 60s before next attempt
        this.reconnectDelay = 60_000
      }
    })
  }

  // Coalesce ticks in memory — no Redis traffic on the hot path. The newest
  // tick per symbol wins; flush() persists/broadcasts it on the interval.
  private processTick(tick: TradeTick) {
    this.latestTicks.set(tick.s, tick)
  }

  // Persist + broadcast the latest tick for every symbol seen since the last
  // flush. Runs once per FLUSH_INTERVAL_MS. Snapshot-then-clear so ticks that
  // arrive during the async writes are picked up on the next flush.
  private async flush() {
    if (this.flushing || this.latestTicks.size === 0) return
    this.flushing = true
    const ticks = [...this.latestTicks.values()]
    this.latestTicks.clear()
    try {
      for (const tick of ticks) {
        await this.flushSymbol(tick)
      }
    } finally {
      this.flushing = false
    }
  }

  private async flushSymbol(tick: TradeTick) {
    const symbol = tick.s
    const price = tick.p
    const timestamp = tick.t

    // Previous price comes from memory (the last flushed value), so we no
    // longer round-trip Redis to compute change.
    const prevPrice = this.lastFlushedPrice.get(symbol) ?? price
    const change = price - prevPrice
    const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0
    this.lastFlushedPrice.set(symbol, price)

    try {
      await this.redisPub.hset(`prices:${symbol}`, {
        price: price.toString(),
        change: change.toString(),
        changePercent: changePercent.toString(),
        timestamp: timestamp.toString(),
      })
      await this.redisPub.publish(
        `prices:${symbol}`,
        JSON.stringify({ symbol, price, change, changePercent, timestamp }),
      )
    } catch (err) {
      // Redis down or over quota — skip this flush rather than crash the stream.
      this.logger.warn(`Failed to flush price for ${symbol}: ${(err as Error).message}`)
    }

    // Enqueue alert evaluation (fire-and-forget; also Redis-backed via BullMQ)
    void this.alertQueue
      .add('evaluate', { symbol, price })
      .catch((err: Error) => this.logger.warn(`Failed to enqueue alert eval: ${err.message}`))
  }

  private async publishStatus(connected: boolean) {
    await this.redisPub.publish('finnhub:status', JSON.stringify({ finnhubConnected: connected }))
  }

  private scheduleReconnect() {
    this.logger.log(`Reconnecting in ${this.reconnectDelay}ms…`)
    setTimeout(() => {
      if (!this.destroyed) this.connect()
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000)
  }
}
