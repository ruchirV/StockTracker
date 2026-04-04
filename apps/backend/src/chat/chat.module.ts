import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ChatController } from './chat.controller'
import { SearchController } from './search.controller'
import { ContextAssemblerService } from './context-assembler.service'
import { WatchlistModule } from '../watchlist/watchlist.module'
import { AlertsModule } from '../alerts/alerts.module'
import { LLM_ADAPTER, llmAdapterFactory } from './llm/llm-adapter.factory'

@Module({
  imports: [WatchlistModule, AlertsModule],
  controllers: [ChatController, SearchController],
  providers: [
    ContextAssemblerService,
    {
      provide: LLM_ADAPTER,
      inject: [ConfigService],
      useFactory: llmAdapterFactory,
    },
  ],
})
export class ChatModule {}
