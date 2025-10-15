import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { CreateEvaluationDto } from './dto/agent-evaluation-dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/agent-evaluation-dto/update-evaluation.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) { }

  @Post()
  create(@Body() createEvaluationDto: CreateEvaluationDto) {
    return this.evaluationService.create(createEvaluationDto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    const { page, limit, month, year, sort_order } = pagination;

    return this.evaluationService.findAll(page, limit, month, year, sort_order as 'asc' | 'desc');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(id);
  }

  // assignment id
  @Get('assignment/:id')
  findOneByAssignmentId(@Param('id') id: string, @Query() pagination: PaginationDto) {
    const { month, year } = pagination;
    return this.evaluationService.findOneByAssignmentId(id, month, year);
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

  @Patch('close/:id')
  closeAgentEvaluation(@Param('id') id: string) {
    return this.evaluationService.close(id);
  }
}
