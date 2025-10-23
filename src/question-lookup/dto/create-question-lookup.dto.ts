import { IsString, IsUUID } from "class-validator";

export class CreateQuestionLookupDto {
    @IsString()
    content: string;

    @IsUUID()
    catagoryId: string
}
