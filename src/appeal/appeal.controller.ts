import { Controller, Get, Post, Body, Put, Param, Delete, Patch, Query } from '@nestjs/common';
import { AppealService } from './appeal.service';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { UpdateAppealDto } from './dto/update-appeal.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('appeal')
export class AppealController {
  constructor(private readonly appealService: AppealService) { }

  //agent evaluation
  @Post(':id')
  create(@Body() createAppealDto: CreateAppealDto, @Param('id') id: string) {
    return this.appealService.create(id, createAppealDto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    const { page, limit, sort_order } = pagination;

    return this.appealService.findAll(page, limit, sort_order as 'ASC' | 'DESC');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appealService.findOne(id);
  }

  @Get('agent-evaluation/:id')
  findAppealsUnderSpecAgent(
    @Param('id') id: string,
    @Query() pagination: PaginationDto) {
    const { sort_order } = pagination;
    return this.appealService.findAppealsPerAgentEvaluationId(id, sort_order as 'ASC' | 'DESC');
  }

  @Put('agent-evaluation/:id')
  update(@Param('id') id: string, @Body() updateAppealDto: UpdateAppealDto) {
    return this.appealService.update(id, updateAppealDto);
  }

  //appealid
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appealService.remove(id);
  }

  @Delete('agent-evaluation/:id')
  removeAppealsPerAgent(@Param('id') id: string) {
    return this.appealService.removeAllApealsUnderAgent(id);
  }

  @Patch('under-review/:id')
  underReview(@Param('id') id: string) {
    return "this.appealService.underReview(id)"
  }

  @Patch('close/:id')
  close(@Param('id') id: string) {
    return "this.appealService.close(id)"
  }

  @Patch('draft/:id')
  returnToDraft(@Param('id') id: string) {
    return "this.appealService.returnToDraft(id)"
  }

  @Patch('close-and-decline/:id')
  decline(@Param('id') id: string) {
    return "this.appealService.decline(id)"
  }
}
