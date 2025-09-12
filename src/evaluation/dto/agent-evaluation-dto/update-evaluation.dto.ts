import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEvaluationDto } from './create-evaluation.dto';
import { IsArray, IsUUID } from 'class-validator';
import { UpdateAudioEvaluation } from '../audio-evaluation-dto/update-audio-evaluation.dto';
import { Type } from 'class-transformer';

export class UpdateEvaluationDto extends PartialType(OmitType(CreateEvaluationDto, ['agent_assignment_id', 'audios'])) {
    @IsUUID()
    evaluation_id: string

    @IsArray()
    @Type(() => UpdateAudioEvaluation)
    audios: UpdateAudioEvaluation[];
}
