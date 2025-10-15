import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { GroupQuestionService } from './group-question.service';
import { CreateGroupQuestionDto } from './dto/group-question-dto/create-group-question.dto';
import { UpdateGroupQuestionDto } from './dto/group-question-dto/update-group-question.dto';
import { DeletQueOrAnsOpDto } from './dto/del-que-or-ansop-dto/delet-queOrAnsOp.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UUID } from 'crypto';
import { groupQuestionStatus } from 'src/common/group_question.status';

@Controller('group-question')
export class GroupQuestionController {
  constructor(private readonly groupQuestionService: GroupQuestionService) { }

  @Post()
  create(@Body() createGroupQuestionDto: CreateGroupQuestionDto) {
    return this.groupQuestionService.create(createGroupQuestionDto);
  }

  @Post('force-close-active/:id')
  async forceClose(@Param('id') id: string) {
    try {
      const { groupQuestion: activeGroupQue } = await this.groupQuestionService.getActiveGroupQuestion()
      if (id !== activeGroupQue?.id) {
        throw new BadRequestException('Provided id does not match the active group question id.');
      }
      if (activeGroupQue.status == groupQuestionStatus.CLOSED) {
        throw new BadRequestException('Active group question is already closed.');
      }
      console.log(activeGroupQue);
      return this.groupQuestionService.forceCloseGroupQuestion(activeGroupQue?.id as UUID)
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new InternalServerErrorException('An unexpected error occurred while force closing the group question.');
      }
    }
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    const { page, limit, sort_order } = pagination;

    return this.groupQuestionService.findAll(page, limit, sort_order as 'asc' | 'desc');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupQuestionService.findOne(id);
  }

  @Get('fetch/active')
  async getActiveGroupQuestion() {
    const activeGroupQuestion = await this.groupQuestionService.getActiveGroupQuestion()
    return {
      success: true,
      "active group question": activeGroupQuestion
    }
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
  undoPublish() {
    return this.groupQuestionService.undoPublish();
  }

  @Patch('close')
  closeGroupQuestion() {
    return this.groupQuestionService.close();
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
  removeQuesOrAnsOp(@Param('id') id: string, @Body() deletQueOrAnsOpDto: DeletQueOrAnsOpDto) {
    return this.groupQuestionService.deleteQueOrAnsOPs(id, deletQueOrAnsOpDto)
  }
}
