import { IsString, Matches } from 'class-validator'

export class AddToWatchlistDto {
  @IsString()
  @Matches(/^[A-Z]{1,5}$/, { message: 'symbol must be 1–5 uppercase letters' })
  symbol!: string
}
