import { Test, TestingModule } from '@nestjs/testing';
import { AppealController } from './appeal.controller';
import { AppealService } from './appeal.service';

describe('AppealController', () => {
  let controller: AppealController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppealController],
      providers: [AppealService],
    }).compile();

    controller = module.get<AppealController>(AppealController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
