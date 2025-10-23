import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateQuestionAnswerOPDto } from './create-question_answerOP.dto';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateQuestionAnswerOPDto extends PartialType(OmitType(CreateQuestionAnswerOPDto, ['content', 'weight'])) {
        @IsOptional()
        @IsUUID()
        id: string;

        @IsNumber()
        weight: number

        @IsString()
        content: string;
}
