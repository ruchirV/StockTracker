import { Injectable, Logger } from '@nestjs/common'
import { FinnhubClient } from './finnhub.client'

@Injectable()
export class SubscriptionManager {
  private readonly logger = new Logger(SubscriptionManager.name)
  private readonly symbolToConnIds = new Map<string, Set<string>>()
  private readonly connIdToSymbols = new Map<string, Set<string>>()

  constructor(private readonly finnhub: FinnhubClient) {}

  addSubscriber(connId: string, symbols: string[]) {
    if (!this.connIdToSymbols.has(connId)) {
      this.connIdToSymbols.set(connId, new Set())
    }
    for (const symbol of symbols) {
      const connSet = this.symbolToConnIds.get(symbol) ?? new Set<string>()
      const wasEmpty = connSet.size === 0
      connSet.add(connId)
      this.symbolToConnIds.set(symbol, connSet)
      this.connIdToSymbols.get(connId)!.add(symbol)
      if (wasEmpty) {
        this.logger.debug(`First subscriber for ${symbol} — subscribing Finnhub`)
        this.finnhub.subscribe(symbol)
      }
    }
  }

  removeSubscriber(connId: string) {
    const symbols = this.connIdToSymbols.get(connId) ?? new Set<string>()
    for (const symbol of symbols) {
      const connSet = this.symbolToConnIds.get(symbol)
      if (!connSet) continue
      connSet.delete(connId)
      if (connSet.size === 0) {
        this.symbolToConnIds.delete(symbol)
        this.logger.debug(`Last subscriber for ${symbol} left — unsubscribing Finnhub`)
        this.finnhub.unsubscribe(symbol)
      }
    }
    this.connIdToSymbols.delete(connId)
  }

  getSubscribersForSymbol(symbol: string): Set<string> {
    return this.symbolToConnIds.get(symbol) ?? new Set()
  }

  getSymbolsForConn(connId: string): Set<string> {
    return this.connIdToSymbols.get(connId) ?? new Set()
  }
}
