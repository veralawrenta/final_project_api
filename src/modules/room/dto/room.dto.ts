import {
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto.js";
import { Type } from "class-transformer";
import { CreateRoomImageDTO } from "../../roomImage/dto/roomImage.dto.js";
import { PropertyType } from "../../../../generated/prisma/enums.js";

export class CreateRoomDTO {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number) 
  basePrice!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number) 
  totalGuests!: number;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number) 
  totalUnits!: number;
}

export class CreateRoomFlowDTO extends CreateRoomDTO {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRoomImageDTO)
  roomImages?: CreateRoomImageDTO[];
}

export class UpdateRoomDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number) 
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1) 
  totalGuests?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number) 
  @Min(1)
  totalUnits?: number;
}

export class GetAllRoomsDTO extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  search?: string = "";

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = "desc";
  
}
