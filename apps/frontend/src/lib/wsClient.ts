import type { WsServerMessage, WsClientMessage } from '@stocktracker/types'
import { useAuthStore } from '@/stores/authStore'
import { usePriceStore } from '@/stores/priceStore'
import { useNotificationStore } from '@/stores/notificationStore'

class WsClient {
  private ws: WebSocket | null = null
  private reconnectDelay = 1000
  private destroyed = false
  private pendingSubscriptions = new Set<string>()
  private connectedSymbols = new Set<string>()

  connect() {
    if (this.ws) return
    const token = useAuthStore.getState().accessToken
    if (!token) return

    const isLocalhost = window.location.hostname === 'localhost'
    const host = isLocalhost ? `${window.location.hostname}:3001` : window.location.hostname
    const url = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${host}/ws?token=${token}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
      // Replay any pending subscriptions
      if (this.pendingSubscriptions.size > 0) {
        const symbols = Array.from(this.pendingSubscriptions)
        this.pendingSubscriptions.clear()
        this.send({ type: 'subscribe', symbols })
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsServerMessage
        this.handleMessage(msg)
      } catch {
        // ignore
      }
    }

    this.ws.onclose = () => {
      this.ws = null
      usePriceStore.getState().setStatus(false)
      if (!this.destroyed) {
        setTimeout(() => this.connect(), this.reconnectDelay)
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000)
      }
    }

    this.ws.onerror = () => {
      // onclose fires after onerror — no extra handling needed
    }
  }

  disconnect() {
    this.destroyed = true
    this.ws?.close()
    this.ws = null
  }

  subscribe(symbols: string[]) {
    for (const s of symbols) this.connectedSymbols.add(s)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', symbols })
    } else {
      symbols.forEach((s) => this.pendingSubscriptions.add(s))
      // Ensure connected
      if (!this.ws) this.connect()
    }
  }

  unsubscribe(symbols: string[]) {
    for (const s of symbols) {
      this.connectedSymbols.delete(s)
      this.pendingSubscriptions.delete(s)
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', symbols })
    }
  }

  private handleMessage(msg: WsServerMessage) {
    const store = usePriceStore.getState()
    switch (msg.type) {
      case 'price':
        store.setPrice(msg.symbol, {
          symbol: msg.symbol,
          price: msg.price,
          change: msg.change,
          changePercent: msg.changePercent,
          timestamp: msg.timestamp,
        })
        break
      case 'status':
        store.setStatus(msg.finnhubConnected)
        break
      case 'ping':
        this.send({ type: 'pong' })
        break
      case 'connected':
        store.setStatus(true)
        // Re-subscribe to all known symbols after reconnect
        if (this.connectedSymbols.size > 0) {
          this.send({ type: 'subscribe', symbols: Array.from(this.connectedSymbols) })
        }
        break
      case 'notification':
        useNotificationStore.getState().addNotification({
          id: msg.id,
          message: msg.message,
          isRead: false,
          alertId: null,
          createdAt: msg.createdAt,
        })
        break
    }
  }

  private send(msg: WsClientMessage) {
    this.ws?.send(JSON.stringify(msg))
  }
}

export const wsClient = new WsClient()
