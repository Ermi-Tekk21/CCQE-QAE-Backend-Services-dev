import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GroupQuestionService } from './group-question.service';
import { CreateGroupQuestionDto } from './dto/create-group-question.dto';
import { UpdateGroupQuestionDto } from './dto/update-group-question.dto';

@Controller('group-question')
export class GroupQuestionController {
  constructor(private readonly groupQuestionService: GroupQuestionService) {}

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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupQuestionDto: UpdateGroupQuestionDto) {
    return this.groupQuestionService.update(+id, updateGroupQuestionDto);
  }

  @Patch('publish/:id')
  publish(@Param('id') id: string){
    return this.groupQuestionService.publish(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupQuestionService.remove(id);
  }
}
