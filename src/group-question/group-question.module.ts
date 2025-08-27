import { Module } from '@nestjs/common';
import { GroupQuestionService } from './group-question.service';
import { GroupQuestionController } from './group-question.controller';
import { GroupQuestion } from './entities/group-question.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersionChangesDetail } from './entities/version-changes-detail.entity';
import { Question } from 'src/question/entities/question.entity';
import { Catagory } from 'src/catagory/entities/catagory.entity';
import { AnswerOptionLookup } from 'src/answer-option-lookup/entities/answer-option-lookup.entity';
import { QuestionLookup } from 'src/question-lookup/entities/question-lookup.entity';
import { QuestionAnswerOp } from 'src/question/entities/question_answerOP.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    GroupQuestion,
    VersionChangesDetail,
    Question,
    Catagory,
    AnswerOptionLookup,
    QuestionLookup,
    QuestionAnswerOp
  ])],
  controllers: [GroupQuestionController],
  providers: [GroupQuestionService],
})
export class GroupQuestionModule { }
