import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { IsDateOnly } from "../../../validators/is-date-only.validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";

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
  @IsDateOnly()
  startDate?: string;

  @IsOptional()
  @IsDateOnly()
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
}
