import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateGroupQuestionDto } from './create-group-question.dto';

export class UpdateGroupQuestionDto extends PartialType(
    OmitType(CreateGroupQuestionDto, ['parentId', 'created_by'])
) { }
