import {
  IsArray,
  IsString,
  MaxLength,
  Matches,
  ValidateNested,
  IsIn,
  ArrayMaxSize,
} from 'class-validator'
import { Type } from 'class-transformer'

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant'

  @IsString()
  @MaxLength(4000)
  content!: string
}

export class ChatDto {
  @Matches(/^[A-Z]{1,5}$/)
  symbol!: string

  @IsString()
  @MaxLength(4000)
  message!: string

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history!: ChatMessageDto[]
}
