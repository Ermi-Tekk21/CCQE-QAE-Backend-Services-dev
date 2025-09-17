import { IsString } from "class-validator";

export class UpdateCatagoryDto {
    @IsString()
    name: string
}