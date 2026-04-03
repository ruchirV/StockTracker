import { IsIn, IsNumber, IsPositive, Matches } from 'class-validator'
import type { AlertDirection } from '@stocktracker/types'

export class CreateAlertDto {
  @Matches(/^[A-Z]{1,5}$/)
  symbol!: string

  @IsNumber()
  @IsPositive()
  threshold!: number

  @IsIn(['above', 'below'])
  direction!: AlertDirection
}
