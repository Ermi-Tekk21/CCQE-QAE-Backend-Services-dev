import { Module } from '@nestjs/common';
import { QuestionLookupService } from './question-lookup.service';
import { QuestionLookupController } from './question-lookup.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionLookup } from './entities/question-lookup.entity';
import { Catagory } from 'src/catagory/entities/catagory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionLookup, Catagory])],
  controllers: [QuestionLookupController],
  providers: [QuestionLookupService],
})
export class QuestionLookupModule { }