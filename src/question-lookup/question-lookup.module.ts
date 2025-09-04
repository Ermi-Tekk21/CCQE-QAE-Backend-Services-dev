import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionLookup } from './entities/question-lookup.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionLookup])],
  controllers: [],
  providers: [],
})
export class QuestionLookupModule {}
