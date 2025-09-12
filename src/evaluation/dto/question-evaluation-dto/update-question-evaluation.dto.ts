import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateQuestionEvaluation } from './create-question-evaluation.dto';
import { IsUUID } from 'class-validator';

export class UpdateQuestionEvaluation extends PartialType(OmitType(CreateQuestionEvaluation, ['question_id'])) {
    @IsUUID()
    question_evaluation_id: string
}
