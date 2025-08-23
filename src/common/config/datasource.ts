import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AgentEvaluation } from 'src/evaluation/entities/evaluation.entity';
import { EvalPerAudio } from 'src/evaluation/entities/evaluationPerAudio.entity';
import { EvalPerQuestion } from 'src/evaluation/entities/evaluationPerQuestion.entity';
import { AnswerOptionLookup } from 'src/answer-option-lookup/entities/answer-option-lookup.entity';
import { QuestionLookup } from 'src/question-lookup/entities/question-lookup.entity';
import { Catagory } from 'src/catagory/entities/catagory.entity';
import { GroupQuestion } from 'src/group-question/entities/group-question.entity';
import { QuestionAnswerOp } from 'src/question/entities/question_answerOP.entity';
import { Question } from 'src/question/entities/question.entity';
ConfigModule.forRoot({ isGlobal: true });

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: +(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    AgentEvaluation,
    EvalPerAudio,
    EvalPerQuestion,
    AnswerOptionLookup,
    QuestionLookup,
    Catagory,
    GroupQuestion,
    QuestionAnswerOp,
    Question
  ],
  synchronize: true,
};
