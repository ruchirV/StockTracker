import { Test, TestingModule } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let appController: AppController

  const mockAppService = {
    getHealth: jest.fn().mockResolvedValue({
      status: 'ok',
      db: 'connected',
      redis: 'connected',
      uptime: 42,
    }),
  }

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: mockAppService }],
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('health', () => {
    it('should return health status', async () => {
      const result = await appController.getHealth()
      expect(result).toMatchObject({ status: 'ok', db: 'connected', redis: 'connected' })
    })
  })
})
