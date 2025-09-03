import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateQuestionAnswerOPDto } from './create-question_answerOP.dto';
import { IsNumber, IsString, IsUUID } from 'class-validator';

export class UpdateQuestionAnswerOPDto extends PartialType(OmitType(CreateQuestionAnswerOPDto, ['content', 'weight'])) {
        @IsUUID()
        id: string;

        @IsNumber()
        weight: number

        @IsString()
        content: string;
}
