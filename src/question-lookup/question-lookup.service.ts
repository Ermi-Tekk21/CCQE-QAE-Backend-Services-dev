import { Injectable } from '@nestjs/common';
import { CreateQuestionLookupDto } from './dto/create-question-lookup.dto';
import { UpdateQuestionLookupDto } from './dto/update-question-lookup.dto';

@Injectable()
export class QuestionLookupService {
  create(createQuestionLookupDto: CreateQuestionLookupDto) {
    return 'This action adds a new questionLookup';
  }

  findAll() {
    return `This action returns all questionLookup`;
  }

  findOne(id: number) {
    return `This action returns a #${id} questionLookup`;
  }

  update(id: number, updateQuestionLookupDto: UpdateQuestionLookupDto) {
    return `This action updates a #${id} questionLookup`;
  }

  remove(id: number) {
    return `This action removes a #${id} questionLookup`;
  }
}
