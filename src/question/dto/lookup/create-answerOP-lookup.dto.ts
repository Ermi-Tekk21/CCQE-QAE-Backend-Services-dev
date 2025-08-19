import { IsString } from "class-validator";

export class CreateAnswerOPLookupDto {
    @IsString()
    content: string
}
