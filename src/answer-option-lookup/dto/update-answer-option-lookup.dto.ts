import { IsString } from 'class-validator';

export class UpdateAnswerOptionLookupDto {
    @IsString()
    content: string;
}