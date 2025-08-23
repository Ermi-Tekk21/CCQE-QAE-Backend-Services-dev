import { Test, TestingModule } from '@nestjs/testing';
import { QuestionLookupController } from './question-lookup.controller';
import { QuestionLookupService } from './question-lookup.service';

describe('QuestionLookupController', () => {
  let controller: QuestionLookupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionLookupController],
      providers: [QuestionLookupService],
    }).compile();

    controller = module.get<QuestionLookupController>(QuestionLookupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
