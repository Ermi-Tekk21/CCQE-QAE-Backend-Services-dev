import { Module } from '@nestjs/common';
import { GroupQuestionService } from './group-question.service';
import { GroupQuestionController } from './group-question.controller';

@Module({
  controllers: [GroupQuestionController],
  providers: [GroupQuestionService],
})
export class GroupQuestionModule {}
