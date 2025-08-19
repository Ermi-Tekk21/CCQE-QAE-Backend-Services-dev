import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionAnswerOPDto } from './create-question_answerOP.dto';

export class UpdateQuestionAnswerOPDto extends PartialType(CreateQuestionAnswerOPDto) {}
