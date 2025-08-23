import { Test, TestingModule } from '@nestjs/testing';
import { AnswerOptionLookupService } from './answer-option-lookup.service';

describe('AnswerOptionLookupService', () => {
  let service: AnswerOptionLookupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnswerOptionLookupService],
    }).compile();

    service = module.get<AnswerOptionLookupService>(AnswerOptionLookupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
