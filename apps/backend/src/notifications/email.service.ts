import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  readonly transporter: Transporter

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASS'),
          }
        : undefined,
    })
  }

  async sendAlertFired(
    to: string,
    symbol: string,
    threshold: number,
    direction: 'above' | 'below',
    currentPrice: number,
  ): Promise<void> {
    const directionText = direction === 'above' ? 'risen above' : 'fallen below'
    const from = this.config.get<string>('EMAIL_FROM', 'noreply@stocktracker.dev')

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: `StockTracker Alert: ${symbol} has ${directionText} $${threshold.toFixed(2)}`,
        text: [
          `Your price alert for ${symbol} has been triggered.`,
          ``,
          `Alert: ${symbol} ${directionText} $${threshold.toFixed(2)}`,
          `Current price: $${currentPrice.toFixed(2)}`,
          ``,
          `— StockTracker`,
        ].join('\n'),
        html: `
          <p>Your price alert for <strong>${symbol}</strong> has been triggered.</p>
          <p><strong>Alert:</strong> ${symbol} ${directionText} $${threshold.toFixed(2)}</p>
          <p><strong>Current price:</strong> $${currentPrice.toFixed(2)}</p>
          <hr/>
          <p style="color:#888;font-size:12px">StockTracker — automated alert</p>
        `,
      })
      this.logger.log(`Alert email sent to ${to} for ${symbol}`)
    } catch (err) {
      this.logger.error(`Failed to send alert email to ${to}`, (err as Error).message)
    }
  }
}
