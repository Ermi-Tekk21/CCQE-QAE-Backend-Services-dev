import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CatagoryService } from './catagory.service';
import { CreateCatagoryDto } from './dto/create-catagory.dto';
import { UpdateCatagoryDto } from './dto/update-catagory.dto';

@Controller('catagory')
export class CatagoryController {
  constructor(private readonly catagoryService: CatagoryService) { }

  @Post()
  create(@Body() createCatagoryDto: CreateCatagoryDto) {
    return this.catagoryService.create(createCatagoryDto);
  }

  @Get('fetch-all')
  findAll() {
    return this.catagoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catagoryService.findOne(id);
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
