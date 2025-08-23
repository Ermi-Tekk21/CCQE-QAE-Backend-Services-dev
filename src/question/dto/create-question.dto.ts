import { IsNumber, IsString } from "class-validator";

export class CreateQuestionDto {
    @IsString()
    content: string

    @IsNumber()
    weight: number
}
