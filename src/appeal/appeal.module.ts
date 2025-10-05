import { forwardRef, Module } from '@nestjs/common';
import { AppealService } from './appeal.service';
import { AppealController } from './appeal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appeal } from './entities/appeal.entity';
import { EvalPerAudio } from 'src/evaluation/entities/evaluationPerAudio.entity';
import { EvaluationModule } from 'src/evaluation/evaluation.module';
import { AppealComplain } from './entities/appealComplain.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appeal, EvalPerAudio, AppealComplain]),
    forwardRef(() => EvaluationModule),
  ],
  controllers: [AppealController],
  providers: [AppealService],
})
export class AppealModule { }
