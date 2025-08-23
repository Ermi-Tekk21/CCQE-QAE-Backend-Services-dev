import { Injectable } from '@nestjs/common';
import { CreateGroupQuestionDto } from './dto/create-group-question.dto';
import { UpdateGroupQuestionDto } from './dto/update-group-question.dto';

@Injectable()
export class GroupQuestionService {
  create(createGroupQuestionDto: CreateGroupQuestionDto) {
    return 'This action adds a new groupQuestion';
  }

  findAll() {
    return `This action returns all groupQuestion`;
  }

  findOne(id: number) {
    return `This action returns a #${id} groupQuestion`;
  }

  update(id: number, updateGroupQuestionDto: UpdateGroupQuestionDto) {
    return `This action updates a #${id} groupQuestion`;
  }

  remove(id: number) {
    return `This action removes a #${id} groupQuestion`;
  }
}
