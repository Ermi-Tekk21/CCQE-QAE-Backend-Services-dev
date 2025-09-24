import { forwardRef, Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentEvaluation } from './entities/evaluation.entity';
import { GroupQuestionModule } from 'src/group-question/group-question.module';

@Module({
  imports: [TypeOrmModule.forFeature([AgentEvaluation]),
  forwardRef(() => GroupQuestionModule)],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService]
})
export class EvaluationModule { }
