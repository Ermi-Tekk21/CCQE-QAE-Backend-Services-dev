import { Module } from '@nestjs/common';
import { AnswerOptionLookup } from './entities/answer-option-lookup.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswerOptionLookupController } from './answer-option-lookup.controller';
import { AnswerOptionLookupService } from './answer-option-lookup.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnswerOptionLookup])],
  controllers: [AnswerOptionLookupController],
  providers: [AnswerOptionLookupService],
})
export class AnswerOptionLookupModule { }