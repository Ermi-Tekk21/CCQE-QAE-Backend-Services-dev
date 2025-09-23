import { Module } from '@nestjs/common';
import { AppealService } from './appeal.service';
import { AppealController } from './appeal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appeal } from './entities/appeal.entity';
import { EvalPerAudio } from 'src/evaluation/entities/evaluationPerAudio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appeal, EvalPerAudio])],
  controllers: [AppealController],
  providers: [AppealService],
})
export class AppealModule { }
