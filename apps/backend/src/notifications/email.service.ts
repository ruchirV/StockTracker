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

  async sendPremiumRequestReceived(adminEmail: string, userEmail: string): Promise<void> {
    const from = this.config.get<string>('EMAIL_FROM', 'noreply@stocktracker.dev')
    const adminPanelUrl = this.config.get<string>('APP_URL', 'http://localhost:5173')
    try {
      await this.transporter.sendMail({
        from,
        to: adminEmail,
        subject: `[StockTracker] New premium request from ${userEmail}`,
        text: [
          `A user has requested premium access:`,
          ``,
          `Email:     ${userEmail}`,
          `Requested: ${new Date().toUTCString()}`,
          ``,
          `Review in the admin panel: ${adminPanelUrl}/admin/premium-requests`,
          ``,
          `— StockTracker`,
        ].join('\n'),
        html: `
          <p>A user has requested premium access:</p>
          <table style="margin:8px 0;border-collapse:collapse">
            <tr><td style="padding:2px 12px 2px 0;color:#888">Email</td><td><strong>${userEmail}</strong></td></tr>
            <tr><td style="padding:2px 12px 2px 0;color:#888">Requested</td><td>${new Date().toUTCString()}</td></tr>
          </table>
          <p><a href="${adminPanelUrl}/admin/premium-requests">Review in the admin panel</a></p>
          <hr/><p style="color:#888;font-size:12px">StockTracker — admin notification</p>
        `,
      })
      this.logger.log(`Premium request notification sent to admin ${adminEmail} for ${userEmail}`)
    } catch (err) {
      this.logger.error(`Failed to send premium request email`, (err as Error).message)
    }
  }

  async sendPremiumApproved(userEmail: string): Promise<void> {
    const from = this.config.get<string>('EMAIL_FROM', 'noreply@stocktracker.dev')
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173')
    try {
      await this.transporter.sendMail({
        from,
        to: userEmail,
        subject: `[StockTracker] Premium access approved`,
        text: [
          `Your StockTracker premium access has been approved.`,
          ``,
          `You can now use the AI portfolio chatbot.`,
          `Sign in and open the AI Chat panel to get started: ${appUrl}/dashboard`,
          ``,
          `— StockTracker`,
        ].join('\n'),
        html: `
          <p>Your StockTracker premium access has been <strong>approved</strong>.</p>
          <p>You can now use the AI portfolio chatbot.</p>
          <p><a href="${appUrl}/dashboard">Sign in and open the AI Chat panel to get started</a></p>
          <hr/><p style="color:#888;font-size:12px">StockTracker — automated notification</p>
        `,
      })
      this.logger.log(`Premium approval email sent to ${userEmail}`)
    } catch (err) {
      this.logger.error(
        `Failed to send premium approval email to ${userEmail}`,
        (err as Error).message,
      )
    }
  }

  async sendPremiumRejected(userEmail: string, adminNote?: string): Promise<void> {
    const from = this.config.get<string>('EMAIL_FROM', 'noreply@stocktracker.dev')
    try {
      await this.transporter.sendMail({
        from,
        to: userEmail,
        subject: `[StockTracker] Premium request update`,
        text: [
          `Your StockTracker premium access request was not approved at this time.`,
          ...(adminNote ? [``, `Note from admin: ${adminNote}`] : []),
          ``,
          `You can submit a new request from your account settings.`,
          ``,
          `— StockTracker`,
        ].join('\n'),
        html: `
          <p>Your StockTracker premium access request was <strong>not approved</strong> at this time.</p>
          ${adminNote ? `<p><em>Note from admin: ${adminNote}</em></p>` : ''}
          <p>You can submit a new request from your account settings.</p>
          <hr/><p style="color:#888;font-size:12px">StockTracker — automated notification</p>
        `,
      })
      this.logger.log(`Premium rejection email sent to ${userEmail}`)
    } catch (err) {
      this.logger.error(
        `Failed to send premium rejection email to ${userEmail}`,
        (err as Error).message,
      )
    }
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
