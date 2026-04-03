import { IsIn } from 'class-validator'
import type { ChartRange } from '@stocktracker/types'

export class CandlesQueryDto {
  @IsIn(['1D', '1W', '1M'])
  range!: ChartRange
}
