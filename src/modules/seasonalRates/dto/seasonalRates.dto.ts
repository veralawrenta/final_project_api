import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";
import { IsDateOnly } from "../../../validators/is-date-only.validator";

export class CreateSeasonalRatesDTO {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsDateOnly()
  startDate!: string;

  @IsNotEmpty()
  @IsDateOnly()
  endDate!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  fixedPrice!: number;

  @IsOptional()
  @IsNumber()
  roomId?: number;

  @IsOptional()
  @IsNumber()
  propertyId?: number;
}

export class UpdateSeasonalRatesDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  fixedPrice?: number;
}

export class GetSeasonalRatesDTO extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  search?: string = "";

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = "desc";

  @IsOptional()
  @IsString()
  sortBy: string = "createdAt";
}
