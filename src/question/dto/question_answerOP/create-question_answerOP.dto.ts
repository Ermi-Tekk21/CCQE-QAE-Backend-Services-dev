import { IsNumber } from "class-validator";

export class CreateQuestionAnswerOPDto {
    @IsNumber()
    weight: number
}
