import { IsString } from "class-validator";

export class UpdateQuestionLookupDto {
    @IsString()
    content: string;
}
