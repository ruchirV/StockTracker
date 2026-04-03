import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets'
import { Inject, Logger, OnModuleInit } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { WebSocketServer } from '@nestjs/websockets'
import { Server, WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import type Redis from 'ioredis'
import { REDIS_PUB, REDIS_SUB } from '../redis/redis.constants'
import { SubscriptionManager } from './subscription.manager'

interface TaggedSocket extends WebSocket {
  connId: string
  userId: string
  isAlive: boolean
}

interface WsClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'pong'
  symbols?: string[]
}

@WebSocketGateway({ path: '/ws', transports: ['websocket'] })
export class PricesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(PricesGateway.name)

  @WebSocketServer()
  server!: Server

  private readonly connMap = new Map<string, TaggedSocket>()
  private pingInterval?: ReturnType<typeof setInterval>
  // Track which Redis channels this gateway instance is subscribed to
  private readonly subscribedChannels = new Set<string>()

  constructor(
    private readonly subManager: SubscriptionManager,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_PUB) private readonly redisPub: Redis,
    @Inject(REDIS_SUB) private readonly redisSub: Redis,
  ) {}

  onModuleInit() {
    // Subscribe to Finnhub status channel
    void this.ensureRedisChannel('finnhub:status')
  }

  afterInit(server: Server) {
    // Ping all clients every 30s to detect dead connections
    this.pingInterval = setInterval(() => {
      server.clients.forEach((raw) => {
        const ws = raw as TaggedSocket
        if (!ws.isAlive) {
          ws.terminate()
          return
        }
        ws.isAlive = false
        this.send(ws, { type: 'ping' })
      })
    }, 30_000)
  }

  handleConnection(raw: WebSocket, req: import('http').IncomingMessage) {
    const ws = raw as TaggedSocket
    ws.isAlive = true

    // Extract and validate JWT from query string
    const url = new URL(req.url ?? '/', `http://localhost`)
    const token = url.searchParams.get('token')

    try {
      if (!token) throw new Error('no token')
      const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET') ?? ''
      const payload = this.jwtService.verify<{ sub: string }>(token, { secret: accessSecret })
      ws.userId = payload.sub
    } catch {
      ws.close(4001, 'Unauthorized')
      return
    }

    ws.connId = randomUUID()
    this.connMap.set(ws.connId, ws)

    ws.on('message', (data) => this.handleMessage(ws, (data as Buffer).toString()))
    ws.on('pong', () => {
      ws.isAlive = true
    })
    ws.on('close', () => this.handleDisconnect(ws))

    this.send(ws, { type: 'connected' })
    this.logger.debug(`Client connected: ${ws.connId} (user ${ws.userId})`)
  }

  handleDisconnect(ws: TaggedSocket) {
    if (!ws.connId) return
    this.subManager.removeSubscriber(ws.connId)
    this.connMap.delete(ws.connId)
    this.logger.debug(`Client disconnected: ${ws.connId}`)
  }

  private handleMessage(ws: TaggedSocket, raw: string) {
    let msg: WsClientMessage
    try {
      msg = JSON.parse(raw) as WsClientMessage
    } catch {
      return
    }

    switch (msg.type) {
      case 'subscribe': {
        const symbols = (msg.symbols ?? []).filter((s) => /^[A-Z]{1,5}$/.test(s))
        this.subManager.addSubscriber(ws.connId, symbols)
        // Subscribe to Redis channels and serve cached prices immediately
        for (const symbol of symbols) {
          void this.ensureRedisChannel(`prices:${symbol}`)
          void this.serveCachedPrice(ws, symbol)
        }
        break
      }
      case 'unsubscribe': {
        const symbols = msg.symbols ?? []
        // Temporarily remove symbols from this connection's subscription
        for (const symbol of symbols) {
          const connSet = this.subManager.getSubscribersForSymbol(symbol)
          connSet.delete(ws.connId)
          if (connSet.size === 0) {
            // No more subscribers — Finnhub unsubscribe handled by SubscriptionManager
          }
        }
        // Let SubscriptionManager do the full accounting
        // Re-add all except the removed ones
        const currentSymbols = Array.from(this.subManager.getSymbolsForConn(ws.connId))
        this.subManager.removeSubscriber(ws.connId)
        const remaining = currentSymbols.filter((s) => !(msg.symbols ?? []).includes(s))
        if (remaining.length > 0) {
          this.subManager.addSubscriber(ws.connId, remaining)
        }
        break
      }
      case 'pong':
        ws.isAlive = true
        break
    }
  }

  private async serveCachedPrice(ws: TaggedSocket, symbol: string) {
    const cached = await this.redisPub.hgetall(`prices:${symbol}`)
    if (cached && cached['price']) {
      this.send(ws, {
        type: 'price',
        symbol,
        price: parseFloat(cached['price']),
        change: parseFloat(cached['change'] ?? '0'),
        changePercent: parseFloat(cached['changePercent'] ?? '0'),
        timestamp: parseInt(cached['timestamp'] ?? '0', 10),
      })
    }
  }

  private async ensureRedisChannel(channel: string) {
    if (this.subscribedChannels.has(channel)) return
    this.subscribedChannels.add(channel)
    await this.redisSub.subscribe(channel)
    this.redisSub.on('message', (ch: string, message: string) => {
      if (ch !== channel) return
      try {
        const payload = JSON.parse(message) as Record<string, unknown>
        if (ch === 'finnhub:status') {
          // Broadcast status to all clients
          this.broadcast({ type: 'status', ...payload })
        } else if (ch.startsWith('prices:')) {
          const symbol = ch.slice(7)
          const subscribers = this.subManager.getSubscribersForSymbol(symbol)
          for (const connId of subscribers) {
            const client = this.connMap.get(connId)
            if (client && client.readyState === WebSocket.OPEN) {
              this.send(client, { type: 'price', symbol, ...payload })
            }
          }
        }
      } catch {
        // ignore malformed messages
      }
    })
  }

  /** Send a payload to all active WebSocket connections belonging to a specific user. */
  sendToUser(userId: string, data: unknown) {
    const msg = JSON.stringify(data)
    this.connMap.forEach((ws) => {
      if (ws.userId === userId && ws.readyState === WebSocket.OPEN) {
        ws.send(msg)
      }
    })
  }

  private send(ws: TaggedSocket, data: unknown) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  private broadcast(data: unknown) {
    const msg = JSON.stringify(data)
    this.connMap.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg)
    })
  }

  onModuleDestroy() {
    if (this.pingInterval) clearInterval(this.pingInterval)
  }
}
