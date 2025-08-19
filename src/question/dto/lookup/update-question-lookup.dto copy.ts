import { PartialType } from '@nestjs/mapped-types';
import { CreateAnswerOPLookupDto } from './create-answerOP-lookup.dto';

export class UpdateAnswerOPLoookupDto extends PartialType(CreateAnswerOPLookupDto) {}
