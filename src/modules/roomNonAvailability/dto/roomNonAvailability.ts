import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { IsDateOnly } from "../../../validators/is-date-only.validator.js";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto.js";

export class CreateRoomNonAvailabilityDTO {
  @IsNotEmpty()
  @IsDateOnly()
  startDate!: string;

  @IsNotEmpty()
  @IsDateOnly()
  endDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  roomInventory!: number;
}

export class UpdateRoomNonAvailabilityDTO {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  roomInventory?: number;
}

export class GetRoomNonAvailabilitiesByTenant extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  search?: string ="";

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = "desc";

  @IsOptional()
  @IsString()
  sortBy: string = "createdAt";
}
