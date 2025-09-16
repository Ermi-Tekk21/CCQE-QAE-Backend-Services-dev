import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEvaluationDto } from './create-evaluation.dto';
import { IsArray, IsDefined, ValidateNested } from 'class-validator';
import { UpdateAudioEvaluation } from '../audio-evaluation-dto/update-audio-evaluation.dto';
import { Type } from 'class-transformer';

export class UpdateEvaluationDto extends PartialType(OmitType(CreateEvaluationDto, ['agent_assignment_id', 'audios'])) {
    @IsArray()
    @IsDefined()
    @ValidateNested({ each: true })
    @Type(() => UpdateAudioEvaluation)
    audios: UpdateAudioEvaluation[];
}
