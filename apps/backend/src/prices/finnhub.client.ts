import { Injectable, OnModuleInit, OnModuleDestroy, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import WebSocket from 'ws'
import type Redis from 'ioredis'
import { REDIS_PUB } from '../redis/redis.constants'

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
  private reconnectDelay = 1000
  private destroyed = false
  private pendingSubscriptions = new Set<string>()

  // statusPublisher is the redis pub client, used to broadcast connection status
  constructor(
    config: ConfigService,
    @Inject(REDIS_PUB) private readonly redisPub: Redis,
  ) {
    this.apiKey = config.get<string>('FINNHUB_API_KEY') ?? ''
  }

  onModuleInit() {
    if (!this.apiKey) {
      this.logger.warn('FINNHUB_API_KEY not set — FinnhubClient disabled')
      return
    }
    this.connect()
  }

  onModuleDestroy() {
    this.destroyed = true
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
            void this.processTick(tick)
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
    })
  }

  private async processTick(tick: TradeTick) {
    const symbol = tick.s
    const price = tick.p
    const timestamp = tick.t

    // Fetch previous price from Redis to compute change
    const prev = await this.redisPub.hget(`prices:${symbol}`, 'price')
    const prevPrice = prev ? parseFloat(prev) : price
    const change = price - prevPrice
    const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0

    // Cache latest price
    await this.redisPub.hset(`prices:${symbol}`, {
      price: price.toString(),
      change: change.toString(),
      changePercent: changePercent.toString(),
      timestamp: timestamp.toString(),
    })

    // Publish to subscribers
    await this.redisPub.publish(
      `prices:${symbol}`,
      JSON.stringify({ symbol, price, change, changePercent, timestamp }),
    )
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
