import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CatagoryService } from './catagory.service';
import { CreateCatagoryDto } from './dto/create-catagory.dto';
import { UpdateCatagoryDto } from './dto/update-catagory.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('catagory')
export class CatagoryController {
  constructor(private readonly catagoryService: CatagoryService) { }

  @Post()
  create(@Body() createCatagoryDto: CreateCatagoryDto) {
    return this.catagoryService.create(createCatagoryDto);
  }

  @Get('fetch-all')
  findAll(@Query() pagination: PaginationDto) {
    const { page, limit, sort } = pagination;

    return this.catagoryService.findAll(page, limit, sort);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catagoryService.findOne(id);
  }

  @Get('questions/:id')
  fetchQuesUnderCatagory(@Param('id') id: string) {
    return this.catagoryService.getAllQuesPerCatagory(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCatagoryDto: UpdateCatagoryDto) {
    return this.catagoryService.update(id, updateCatagoryDto);
  }

  @Patch('temp-delete/:id')
  softDelete(@Param('id') id: string) {
    return this.catagoryService.softDelete(id);
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
