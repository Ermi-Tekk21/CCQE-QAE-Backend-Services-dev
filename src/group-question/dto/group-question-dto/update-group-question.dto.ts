import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateGroupQuestionDto } from './create-group-question.dto';
import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateQuestionDto } from 'src/group-question/dto/question-dto/update-question.dto';

export class UpdateGroupQuestionDto extends PartialType(
    OmitType(CreateGroupQuestionDto, ['questions'])
) {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateQuestionDto)
    updated_questions: UpdateQuestionDto[];
}
