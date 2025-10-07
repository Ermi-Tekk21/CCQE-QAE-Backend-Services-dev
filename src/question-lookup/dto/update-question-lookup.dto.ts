import { IsOptional, IsString, IsUUID } from "class-validator";

export class UpdateQuestionLookupDto {
    @IsString()
    content: string;

    @IsOptional()
    @IsUUID()
    catagoryId: string
}
