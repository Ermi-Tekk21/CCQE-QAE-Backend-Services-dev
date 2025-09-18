import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateQuestionDto } from './create-question.dto';
import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateQuestionAnswerOPDto } from '../question-and-answer-option-dto/update-question-answerOP.dto';

export class UpdateQuestionDto extends PartialType(OmitType(CreateQuestionDto, ['question_answer_option'])) {

    @IsUUID()
    id: string;
    @ValidateNested({ each: true })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateQuestionAnswerOPDto)
    updated_question_answer_option: UpdateQuestionAnswerOPDto[];
}
