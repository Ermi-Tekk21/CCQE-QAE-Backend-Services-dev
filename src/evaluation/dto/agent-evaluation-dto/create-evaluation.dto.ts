import { Type } from "class-transformer";
import { IsArray, IsString, ValidateNested } from "class-validator";
import { CreateAudioEvaluation } from "../audio-evaluation-dto/create-audio-evaluation.dto";

export class CreateEvaluationDto {
    @IsString()
    agent_assignment_id: string

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateAudioEvaluation)
    audios: CreateAudioEvaluation[];
}
