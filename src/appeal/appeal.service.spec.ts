import { Test, TestingModule } from '@nestjs/testing';
import { AppealService } from './appeal.service';

describe('AppealService', () => {
  let service: AppealService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppealService],
    }).compile();

    service = module.get<AppealService>(AppealService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
