import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionModule } from './question/question.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { typeOrmConfig } from './common/config/datasource';
import { CatagoryModule } from './catagory/catagory.module';
import { AnswerOptionLookupModule } from './answer-option-lookup/answer-option-lookup.module';
import { QuestionLookupModule } from './question-lookup/question-lookup.module';
import { GroupQuestionModule } from './group-question/group-question.module';
import { VersionChangesDetail } from './group-question/entities/version-changes-detail.entity';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmConfig),
    QuestionModule,
    EvaluationModule,
    CatagoryModule,
    AnswerOptionLookupModule,
    QuestionLookupModule,
    GroupQuestionModule,
    VersionChangesDetail
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
