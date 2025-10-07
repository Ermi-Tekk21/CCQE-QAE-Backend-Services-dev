import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(["draft", "under_review", "closed"], { message: 'status should be draft, under_review or closed' })
  status: string;

  @IsOptional()
  @Transform(({ value }) => value.replace(/['"]/g, ''))
  @Type(() => String)
  @IsString()
  @IsIn(["ASC", "DESC"], { message: 'sort must be either ASC or DESC' })
  sort_order: string;
}
