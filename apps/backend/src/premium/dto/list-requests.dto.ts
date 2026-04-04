import { IsIn, IsOptional } from 'class-validator'
import type { PremiumRequestStatus } from '@stocktracker/types'

export class ListRequestsDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: PremiumRequestStatus
}
