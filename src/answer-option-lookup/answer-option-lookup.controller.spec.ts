import { Test, TestingModule } from '@nestjs/testing';
import { AnswerOptionLookupController } from './answer-option-lookup.controller';
import { AnswerOptionLookupService } from './answer-option-lookup.service';

describe('AnswerOptionLookupController', () => {
    let controller: AnswerOptionLookupController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AnswerOptionLookupController],
            providers: [AnswerOptionLookupService],
        }).compile();

        controller = module.get<AnswerOptionLookupController>(AnswerOptionLookupController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});