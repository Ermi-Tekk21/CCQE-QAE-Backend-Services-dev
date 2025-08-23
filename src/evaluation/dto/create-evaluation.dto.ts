import { IsString } from "class-validator";

export class CreateEvaluationDto {
    @IsString()
    agent_id: string

    @IsString()
    evaluator_id: string

    @IsString()
    group_question_id: string
}
