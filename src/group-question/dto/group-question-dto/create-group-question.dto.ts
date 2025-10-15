import { IsDate, IsOptional, IsUUID, MinDate, IsArray, ValidateNested} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionDto } from 'src/group-question/dto/question-dto/create-question.dto';

export class CreateGroupQuestionDto {
    @IsDate()
    @Type(() => Date)
    @MinDate(new Date(), {
        message: 'Evaluation end date must be after current time',
    })
    evaluation_ends_at: Date;

    @IsOptional()
    @IsUUID()
    parentId?: string | null;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateQuestionDto)
    questions: CreateQuestionDto[];
}