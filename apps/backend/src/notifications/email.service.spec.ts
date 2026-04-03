import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { EmailService } from './email.service'

describe('EmailService', () => {
  let service: EmailService
  let sendMailSpy: jest.SpyInstance

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: unknown) => {
              const env: Record<string, unknown> = {
                SMTP_HOST: 'localhost',
                SMTP_PORT: 1025,
                EMAIL_FROM: 'test@stocktracker.dev',
              }
              return env[key] ?? def
            },
          },
        },
      ],
    }).compile()

    service = module.get<EmailService>(EmailService)
    // nodemailer Transporter.sendMail overload return type requires casting in test context
    sendMailSpy = jest.spyOn(service.transporter, 'sendMail').mockResolvedValue({} as never)
  })

  it('calls transporter.sendMail with correct subject and recipients', async () => {
    await service.sendAlertFired('user@example.com', 'AAPL', 195, 'above', 196.5)

    expect(sendMailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        from: 'test@stocktracker.dev',
        subject: expect.stringContaining('AAPL') as string,
      }),
    )
  })

  it('includes "above" direction text in email body', async () => {
    await service.sendAlertFired('user@example.com', 'TSLA', 250, 'above', 251)
    expect(sendMailSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('risen above') as string }),
    )
  })

  it('includes "below" direction text in email body', async () => {
    await service.sendAlertFired('user@example.com', 'TSLA', 200, 'below', 199)
    expect(sendMailSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('fallen below') as string }),
    )
  })
})
