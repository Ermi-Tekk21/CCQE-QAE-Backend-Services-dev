import { IsUUID } from "class-validator";

export class CreateQuestionEvaluation {
    @IsUUID()
    question_id: string

    @IsUUID()
    selected_question_answer_option_id: string
}