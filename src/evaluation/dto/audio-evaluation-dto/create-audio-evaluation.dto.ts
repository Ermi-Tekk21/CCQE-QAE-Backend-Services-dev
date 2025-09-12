import { IsArray, IsUUID } from "class-validator";
import { CreateQuestionEvaluation } from "../question-evaluation-dto/create-question-evaluation.dto";
import { Type } from "class-transformer";

export class CreateAudioEvaluation {
    @IsUUID()
    audio_id: string

    @IsArray()
    @Type(() => CreateQuestionEvaluation)
    questions: CreateQuestionEvaluation[];
}