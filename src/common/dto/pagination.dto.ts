import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

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
  @Type(() => String)
  @IsString()
  @IsIn(["asc", "desc"], { message: 'sort must be either asc or desc' })
  sort_order: string;

  @IsOptional()
  @Type(() => String)
  @IsString()
  catagory: string;

  @IsOptional()
  @Type(() => String)
  @IsString()
  month: string;

  @IsOptional()
  @Type(() => String)
  @IsString()
  year: string;

  @IsOptional()
  @Type(() => String)
  @IsString()
  search: string;
}
