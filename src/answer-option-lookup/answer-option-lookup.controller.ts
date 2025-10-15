import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AnswerOptionLookupService } from './answer-option-lookup.service';
import { CreateAnswerOptionLookupDto } from './dto/create-answer-option-lookup.dto';
import { UpdateAnswerOptionLookupDto } from './dto/update-answer-option-lookup.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('answer-option-lookup')
export class AnswerOptionLookupController {
    constructor(private readonly answerOptionLookupService: AnswerOptionLookupService) { }

    @Post()
    create(@Body() createAnswerOptionLookupDto: CreateAnswerOptionLookupDto) {
        return this.answerOptionLookupService.create(createAnswerOptionLookupDto);
    }

    @Get('fetch-all')
    findAll(@Query() pagination: PaginationDto) {
        const { page, limit, sort_order } = pagination;

        return this.answerOptionLookupService.findAll(page, limit, sort_order as 'asc' | 'desc');
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.answerOptionLookupService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateAnswerOptionLookupDto: UpdateAnswerOptionLookupDto) {
        return this.answerOptionLookupService.update(id, updateAnswerOptionLookupDto);
    }

    @Patch('temp-delete/:id')
    softDelete(@Param('id') id: string) {
        return this.answerOptionLookupService.softDelete(id);
    }

    @Patch('restore-temp-delete/:id')
    restoreSoftDelete(@Param('id') id: string) {
        return this.answerOptionLookupService.restoreSoftDelete(id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.answerOptionLookupService.remove(id);
    }
}