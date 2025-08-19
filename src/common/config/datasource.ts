import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AgentEvaluation } from 'src/evaluation/entities/evaluation.entity';
import { EvalPerAudio } from 'src/evaluation/entities/evaluationPerAudio.entity';
import { EvalPerQuestion } from 'src/evaluation/entities/evaluationPerQuestion.entity';
import { AnswerOplookup } from 'src/question/entities/lookups/answerOP_lookup.entity';
import { QuestionLookup } from 'src/question/entities/lookups/question_lookup.entity';
import { Catagory } from 'src/question/entities/catagory.entity';
import { GroupQuestion } from 'src/question/entities/group_question.entity';
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
    AnswerOplookup,
    QuestionLookup,
    Catagory,
    GroupQuestion,
    QuestionAnswerOp,
    Question
  ],
  synchronize: true,
};
