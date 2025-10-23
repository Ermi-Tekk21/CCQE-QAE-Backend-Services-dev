import { Test, TestingModule } from '@nestjs/testing';
import { QuestionLookupService } from './question-lookup.service';

describe('QuestionLookupService', () => {
    let service: QuestionLookupService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [QuestionLookupService],
        }).compile();

        service = module.get<QuestionLookupService>(QuestionLookupService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});