import { Type } from 'class-transformer';
import { IsString, IsInt, Min, IsUUID, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { CreateQuestionAnswerOPDto } from './question_answerOP/create-question_answerOP.dto';

export class CreateQuestionDto {
    @IsString()
    content: string;

    @IsInt()
    @Min(0)
    weight: number;

    @IsUUID()
    catagoryId: string;

    @IsArray()
    @Type(() => CreateQuestionAnswerOPDto)
    question_answerOP: CreateQuestionAnswerOPDto[];
}
