import { Type } from "class-transformer";
import { IsArray, IsString } from "class-validator";
import { CreateAudioEvaluation } from "../audio-evaluation-dto/create-audio-evaluation.dto";

export class CreateEvaluationDto {
    @IsString()
    agent_assignment_id: string

    @IsArray()
    @Type(() => CreateAudioEvaluation)
    audios: CreateAudioEvaluation[];
}
