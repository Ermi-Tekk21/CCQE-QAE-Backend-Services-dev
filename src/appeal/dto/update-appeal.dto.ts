import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateAppealDto {
    @IsOptional()
    @IsString()
    complain: string

    @IsOptional()
    @IsArray()
    @IsUUID("all", { each: true })
    audio_evaluation_ids: string[]
}
