import { Type } from 'class-transformer';
import { IsString, IsInt, Min, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { CreateQuestionAnswerOPDto } from '../question-and-answer-option-dto/create-question_answerOP.dto';

export class CreateQuestionDto {
    @IsString()
    content: string;

    @IsInt()
    @Min(0)
    weight: number;

    @IsUUID()
    catagoryId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateQuestionAnswerOPDto)
    question_answer_option: CreateQuestionAnswerOPDto[];
}
