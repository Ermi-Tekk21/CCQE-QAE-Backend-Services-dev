import { IsString } from "class-validator";

export class CreateAnswerOptionLookupDto {
    @IsString()
    content: string
}