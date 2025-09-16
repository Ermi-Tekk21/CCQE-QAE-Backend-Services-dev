import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { CreateEvaluationDto } from './dto/agent-evaluation-dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/agent-evaluation-dto/update-evaluation.dto';

@Controller('evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) { }

  @Post()
  create(@Body() createEvaluationDto: CreateEvaluationDto) {
    return this.evaluationService.create(createEvaluationDto);
  }

  @Get()
  findAll() {
    return this.evaluationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEvaluationDto: UpdateEvaluationDto) {
    return this.evaluationService.update(id, updateEvaluationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evaluationService.remove(id);
  }

  @Patch('soft-delete/:id')
  softDelete(@Param('id') id: string) {
    return this.evaluationService.softDelete(id);
  }

  @Patch('restore-soft-delete/:id')
  restoreSoftDelete(@Param('id') id: string) {
    return this.evaluationService.restoreSoftDelete(id);
  }
}
