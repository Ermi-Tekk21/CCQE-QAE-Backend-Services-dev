import { IsArray, IsOptional, IsUUID } from "class-validator";

export class DeletQueOrAnsOpDto {
    @IsUUID()
    deletedBy: string

    @IsUUID()
    questionId: string

    @IsOptional()
    @IsArray()
    @IsUUID('all', { each: true })
    AnswerOptions: string[];
}