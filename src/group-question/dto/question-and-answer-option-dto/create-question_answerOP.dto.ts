import { IsNumber, IsString } from "class-validator";

export class CreateQuestionAnswerOPDto {
    @IsNumber()
    weight: number

    @IsString()
    content: string;
}

