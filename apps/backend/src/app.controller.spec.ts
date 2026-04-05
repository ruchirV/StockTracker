import { Test, TestingModule } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let appController: AppController
  let appService: jest.Mocked<AppService>

  beforeEach(async () => {
    const mockAppService: jest.Mocked<Partial<AppService>> = {
      getHealth: jest.fn(),
    }

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: mockAppService }],
    }).compile()

    appController = app.get<AppController>(AppController)
    appService = app.get(AppService)
  })

  describe('GET /health', () => {
    it('returns ok status when db and redis are healthy', async () => {
      appService.getHealth.mockResolvedValue({
        status: 'ok',
        db: 'connected',
        redis: 'connected',
        uptime: 42,
      })

      const result = await appController.getHealth()

      expect(result).toEqual({
        status: 'ok',
        db: 'connected',
        redis: 'connected',
        uptime: 42,
      })
    })

    it('returns degraded status when db is down', async () => {
      appService.getHealth.mockResolvedValue({
        status: 'degraded',
        db: 'error',
        redis: 'connected',
        uptime: 10,
      })

      const result = await appController.getHealth()

      expect(result).toMatchObject({ status: 'degraded', db: 'error' })
    })

    it('returns degraded status when redis is down', async () => {
      appService.getHealth.mockResolvedValue({
        status: 'degraded',
        db: 'connected',
        redis: 'error',
        uptime: 10,
      })

      const result = await appController.getHealth()

      expect(result).toMatchObject({ status: 'degraded', redis: 'error' })
    })

    it('delegates to AppService', async () => {
      appService.getHealth.mockResolvedValue({ status: 'ok', db: 'connected', redis: 'connected', uptime: 1 })

      await appController.getHealth()

      expect(appService.getHealth).toHaveBeenCalledTimes(1)
    })
  })
})
