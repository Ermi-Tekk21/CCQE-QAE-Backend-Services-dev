import { Injectable } from '@nestjs/common';
import { CreateAnswerOptionLookupDto } from './dto/create-answer-option-lookup.dto';
import { UpdateAnswerOptionLookupDto } from './dto/update-answer-option-lookup.dto';

@Injectable()
export class AnswerOptionLookupService {
  create(createAnswerOptionLookupDto: CreateAnswerOptionLookupDto) {
    return 'This action adds a new answerOptionLookup';
  }

  findAll() {
    return `This action returns all answerOptionLookup`;
  }

  findOne(id: number) {
    return `This action returns a #${id} answerOptionLookup`;
  }

  update(id: number, updateAnswerOptionLookupDto: UpdateAnswerOptionLookupDto) {
    return `This action updates a #${id} answerOptionLookup`;
  }

  remove(id: number) {
    return `This action removes a #${id} answerOptionLookup`;
  }
}
