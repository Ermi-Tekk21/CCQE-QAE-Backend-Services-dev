import { PartialType } from '@nestjs/mapped-types';
import { CreateAnswerOptionLookupDto } from './create-answer-option-lookup.dto';

export class UpdateAnswerOptionLookupDto extends PartialType(CreateAnswerOptionLookupDto) {}
