import { IsString } from "class-validator";

export class CreateQuestionLookupDto {
    @IsString()
    content: string;
}
