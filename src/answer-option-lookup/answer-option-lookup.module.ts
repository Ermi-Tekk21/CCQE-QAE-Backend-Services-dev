import { Module } from '@nestjs/common';
import { AnswerOptionLookupService } from './answer-option-lookup.service';
import { AnswerOptionLookupController } from './answer-option-lookup.controller';
import { AnswerOptionLookup } from './entities/answer-option-lookup.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([AnswerOptionLookup])],
  controllers: [AnswerOptionLookupController],
  providers: [AnswerOptionLookupService],
})
export class AnswerOptionLookupModule { }
