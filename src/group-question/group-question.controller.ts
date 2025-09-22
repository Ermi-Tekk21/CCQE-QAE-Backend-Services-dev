import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GroupQuestionService } from './group-question.service';
import { CreateGroupQuestionDto } from './dto/group-question-dto/create-group-question.dto';
import { UpdateGroupQuestionDto } from './dto/group-question-dto/update-group-question.dto';
import { DeletQueOrAnsOpDto } from './dto/del-que-or-ansop-dto/delet-queOrAnsOp.dto';

@Controller('group-question')
export class GroupQuestionController {
  constructor(private readonly groupQuestionService: GroupQuestionService) { }

  @Post()
  create(@Body() createGroupQuestionDto: CreateGroupQuestionDto) {
    return this.groupQuestionService.create(createGroupQuestionDto);
  }

  @Get()
  findAll() {
    return this.groupQuestionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupQuestionService.findOne(id);
  }

  @Patch('update/:id')
  update(@Param('id') id: string, @Body() updateGroupQuestionDto: UpdateGroupQuestionDto) {
    return this.groupQuestionService.update(id, updateGroupQuestionDto);
  }

  @Patch('publish/:id')
  publish(@Param('id') id: string) {
    return this.groupQuestionService.publish(id);
  }

  @Patch('undo-publish/:id')
  undoPublish(@Param('id') id: string) {
    return this.groupQuestionService.undoPublish(id);
  }

  @Patch('temp-delete/:id')
  softDelete(@Param('id') id: string) {
    return this.groupQuestionService.softDelete(id);
  }

  @Patch('restore-soft-delete/:id')
  restoreSoftDel(@Param('id') id: string) {
    return this.groupQuestionService.undoSoftDelete(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupQuestionService.remove(id);
  }

  @Delete(':id/delete-question-or-ansOptions')
  removeQuesOrAnsOp(@Param('id') id: string, @Body() deletQueOrAnsOpDto:DeletQueOrAnsOpDto) {
    return this.groupQuestionService.deleteQueOrAnsOPs(id, deletQueOrAnsOpDto)
  }
}
