import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateAppealDto {
    @IsOptional()
    @IsString()
    complain: string

    @IsArray()
    @IsUUID("all", { each: true })
    audio_evaluation_ids: string[]
}
