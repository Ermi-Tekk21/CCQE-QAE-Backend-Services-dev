import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionLookupDto } from './create-question-lookup.dto';

export class UpdateQuestionLoookupDto extends PartialType(CreateQuestionLookupDto) {}
