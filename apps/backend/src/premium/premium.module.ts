import { Module } from '@nestjs/common'
import { PremiumService } from './premium.service'
import { PremiumController } from './premium.controller'
import { PremiumAdminController } from './premium-admin.controller'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  providers: [PremiumService],
  controllers: [PremiumController, PremiumAdminController],
})
export class PremiumModule {}
