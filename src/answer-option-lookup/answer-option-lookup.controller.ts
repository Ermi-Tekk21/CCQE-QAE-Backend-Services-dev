import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Headers } from '@nestjs/common';
import { AnswerOptionLookupService } from './answer-option-lookup.service';
import { CreateAnswerOptionLookupDto } from './dto/create-answer-option-lookup.dto';
import { UpdateAnswerOptionLookupDto } from './dto/update-answer-option-lookup.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('answer-option-lookup')
export class AnswerOptionLookupController {
    constructor(private readonly answerOptionLookupService: AnswerOptionLookupService) { }

    @Post()
    create(
        @Body() createAnswerOptionLookupDto: CreateAnswerOptionLookupDto,
        @Headers('user_id') user_id: string
    ) {
        return this.answerOptionLookupService.create(createAnswerOptionLookupDto, user_id);
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
    update(
        @Param('id') id: string,
        @Body() updateAnswerOptionLookupDto: UpdateAnswerOptionLookupDto,
        @Headers('user_id') user_id: string
    ) {
        return this.answerOptionLookupService.update(id, updateAnswerOptionLookupDto, user_id);
    }

    @Patch('temp-delete/:id')
    softDelete(
        @Param('id') id: string,
        @Headers('user_id') user_id: string
    ) {
        return this.answerOptionLookupService.softDelete(id, user_id);
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