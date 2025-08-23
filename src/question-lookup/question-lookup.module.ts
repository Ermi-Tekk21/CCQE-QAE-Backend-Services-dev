import { Module } from '@nestjs/common';
import { QuestionLookupService } from './question-lookup.service';
import { QuestionLookupController } from './question-lookup.controller';

@Module({
  controllers: [QuestionLookupController],
  providers: [QuestionLookupService],
})
export class QuestionLookupModule {}
