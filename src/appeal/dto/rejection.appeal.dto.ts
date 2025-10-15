import { IsString } from "class-validator";

export class RejectionAppealDto {
    @IsString()
    rejection_reason: string
}
