import { IsString } from "class-validator";

export class CreateCatagoryDto {
    @IsString()
    name: string
}
