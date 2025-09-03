import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateQuestionDto } from './create-question.dto';
import { IsArray, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateQuestionAnswerOPDto } from './question_answerOP/update-question-answerOP.dto';

export class UpdateQuestionDto extends PartialType(OmitType(CreateQuestionDto, ['question_answer_option'])) {

    @IsUUID()
    id: string;

    @IsArray()
    @Type(() => UpdateQuestionAnswerOPDto)
    updated_question_answer_option: UpdateQuestionAnswerOPDto[];
}
