import { Module } from '@nestjs/common';
import { AnswerOptionLookup } from './entities/answer-option-lookup.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([AnswerOptionLookup])],
  controllers: [],
  providers: [],
})
export class AnswerOptionLookupModule { }