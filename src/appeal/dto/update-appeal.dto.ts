import { IsArray, IsUUID } from 'class-validator';

export class UpdateAppealDto {
    @IsArray()
    @IsUUID("all", { each: true })
    audio_evaluation_ids: string[]
}
