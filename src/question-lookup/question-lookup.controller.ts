import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { QuestionLookupService } from './question-lookup.service';
import { CreateQuestionLookupDto } from './dto/create-question-lookup.dto';
import { UpdateQuestionLookupDto } from './dto/update-question-lookup.dto';

@Controller('question-lookup')
export class QuestionLookupController {
  constructor(private readonly questionLookupService: QuestionLookupService) {}

  @Post()
  create(@Body() createQuestionLookupDto: CreateQuestionLookupDto) {
    return this.questionLookupService.create(createQuestionLookupDto);
  }

  @Get('fetch-all')
  findAll() {
    return this.questionLookupService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionLookupService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQuestionLookupDto: UpdateQuestionLookupDto) {
    return this.questionLookupService.update(id, updateQuestionLookupDto);
  }

    @Patch('temp-delete/:id')
  softDelete(@Param('id') id: string) {
    return this.questionLookupService.softDelete(id);
  }

  @Patch('restore-temp-delete/:id')
  restoreSoftDelete(@Param('id') id: string) {
    return this.questionLookupService.restoreSoftDelete(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.questionLookupService.remove(id);
  }
}
