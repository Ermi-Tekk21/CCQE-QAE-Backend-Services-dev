import { Controller, Get, Post, Body, Put, Param, Delete, Patch, Query } from '@nestjs/common';
import { AppealService } from './appeal.service';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { UpdateAppealDto } from './dto/update-appeal.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { appealStatus } from 'src/common/appeal.status';

@Controller('appeal')
export class AppealController {
  constructor(
    private readonly appealService: AppealService
  ) { }

  //agent evaluation
  @Post('agent-evaluation/:id')
  create(@Body() createAppealDto: CreateAppealDto, @Param('id') id: string) {
    return this.appealService.create(id, createAppealDto);
  }

  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status: appealStatus,
  ) {
    const { page, limit, sort_order } = pagination;

    return this.appealService.findAll(page, limit, status, sort_order as 'ASC' | 'DESC');
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

  @Patch('accept/:id')
  acceptAppeal(@Param('id') id: string) {
    return this.appealService.acceptAppeal(id)
  }

  @Patch('reject/:id')
  rejectAppeal(@Param('id') id: string) {
    return this.appealService.rejectAppeal(id);
  }

  @Patch('close/:id')
  closeAppeal(@Param('id') id: string, @Body() changes: { from: number, to: number }) {
    return this.appealService.closeAppeal(id, changes);
  }
}
