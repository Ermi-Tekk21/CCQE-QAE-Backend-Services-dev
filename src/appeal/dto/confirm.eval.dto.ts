import { IsArray, IsUUID } from "class-validator";

export class ConfirmDto {
    @IsArray()
    @IsUUID("all", { each: true })
    audio_evaluation_ids: string[]
}
