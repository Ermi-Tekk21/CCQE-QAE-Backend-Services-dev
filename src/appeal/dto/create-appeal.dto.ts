import { IsArray, IsUUID } from "class-validator";

export class CreateAppealDto {
    @IsUUID()
    agent_id: string

    @IsArray()
    @IsUUID("all", { each: true })
    audio_evaluation_ids: string[]
}
