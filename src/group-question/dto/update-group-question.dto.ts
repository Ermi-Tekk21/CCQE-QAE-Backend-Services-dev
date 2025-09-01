import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateGroupQuestionDto } from './create-group-question.dto';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateQuestionDto } from 'src/question/dto/update-question.dto';

export class UpdateGroupQuestionDto extends PartialType(
    OmitType(CreateGroupQuestionDto, ['created_by', 'questions'])
) {
    @IsUUID()
    updated_by: string;

    @IsArray()
    @Type(() => UpdateQuestionDto)
    updated_questions: UpdateQuestionDto[];
}
