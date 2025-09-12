import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEvaluationDto } from '../agent-evaluation-dto/create-evaluation.dto';
import { IsArray, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateQuestionEvaluation } from '../question-evaluation-dto/update-question-evaluation.dto';

export class UpdateAudioEvaluation extends PartialType(OmitType(CreateEvaluationDto, ['agent_assignment_id', 'audios'])) {
    @IsUUID()
    audio_evaluation_id: string

    @IsArray()
    @Type(() => UpdateQuestionEvaluation)
    audios: UpdateQuestionEvaluation[];
}
