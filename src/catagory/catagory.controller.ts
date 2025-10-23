import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Headers } from '@nestjs/common';
import { CatagoryService } from './catagory.service';
import { CreateCatagoryDto } from './dto/create-catagory.dto';
import { UpdateCatagoryDto } from './dto/update-catagory.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('catagory')
export class CatagoryController {
  constructor(private readonly catagoryService: CatagoryService) { }

  @Post()
  create(
    @Body() createCatagoryDto: CreateCatagoryDto,
    @Headers('user_id') user_id: string
  ) {
    return this.catagoryService.create(createCatagoryDto, user_id);
  }

  @Get('fetch-all')
  findAll(@Query() pagination: PaginationDto) {
    const { page, limit, sort_order } = pagination;

    return this.catagoryService.findAll(page, limit, sort_order as 'asc' | 'desc');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catagoryService.findOne(id);
  }

  @Get(':id/questions')
  fetchQuesUnderCatagory(
    @Param('id') id: string,
    @Query() pagination: PaginationDto
  ) {

    const { page, limit, sort_order } = pagination;
    return this.catagoryService.getAllQuesPerCatagory(id, page, limit, sort_order as 'asc' | 'desc');
  }

  @Patch(':id')
  update(
    @Param('id') id: string, @Body() updateCatagoryDto: UpdateCatagoryDto,
    @Headers('user_id') user_id: string
  ) {
    return this.catagoryService.update(id, updateCatagoryDto, user_id);
  }

  @Patch('temp-delete/:id')
  softDelete(
    @Param('id') id: string,
    @Headers('user_id') user_id: string
  ) {
    return this.catagoryService.softDelete(id, user_id);
  }

  @Patch('restore-temp-delete/:id')
  restoreSoftDelete(@Param('id') id: string) {
    return this.catagoryService.restoreSoftDelete(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catagoryService.remove(id);
  }
}
