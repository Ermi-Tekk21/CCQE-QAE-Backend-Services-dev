import { Module } from '@nestjs/common';
import { CatagoryService } from './catagory.service';
import { CatagoryController } from './catagory.controller';
import { Catagory } from './entities/catagory.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from 'src/group-question/entities/question-entities/question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Catagory, Question])],
  controllers: [CatagoryController],
  providers: [CatagoryService],
})
export class CatagoryModule { }
