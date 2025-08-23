import { Module } from '@nestjs/common';
import { AnswerOptionLookupService } from './answer-option-lookup.service';
import { AnswerOptionLookupController } from './answer-option-lookup.controller';

@Module({
  controllers: [AnswerOptionLookupController],
  providers: [AnswerOptionLookupService],
})
export class AnswerOptionLookupModule {}
