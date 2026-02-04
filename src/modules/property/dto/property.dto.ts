import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";
import { Prisma } from "../../../../generated/prisma/client";
import { PropertyType } from "../../../../generated/prisma/enums";
import { IsDateOnly } from "../../../validators/is-date-only.validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";
import { CreatePropertyImageDTO } from "../../propertyImage/dto/propertyImage.dto";
import { CreateRoomFlowDTO } from "../../room/dto/room.dto";

export enum PropertySortBy {
  NAME = "name",
  PRICE = "price",
}

export enum SortOrderEnum {
  ASC = "asc",
  DESC = "desc",
}

export class GetSearchAvailablePropertiesDTO extends PaginationQueryParams {
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  cityId!: number;

  @IsNotEmpty()
  @IsDateOnly()
  checkIn!: string;

  @IsNotEmpty()
  @IsDateOnly()
  checkOut!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  totalGuests!: number;

  @IsOptional()
  @IsString()
  @IsEnum(PropertySortBy)
  sortBy: PropertySortBy = PropertySortBy.PRICE;

  @IsOptional()
  @IsEnum(SortOrderEnum)
  @Transform(
    ({ value }): Prisma.SortOrder => (value === "desc" ? "desc" : "asc")
  )
  sortOrder: Prisma.SortOrder = "asc";

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsString()
  search?: string;
}

export class GetAllPropertiesDTO extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  search?: string = "";

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;
}

export class GetPropertyAvailabilityQueryDTO {
  @IsNotEmpty()
  @IsDateOnly()
  checkIn!: string;

  @IsNotEmpty()
  @IsDateOnly()
  checkOut!: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  totalGuests!: number;
}

export class CreatePropertyDTO {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsString()
  address!: string;

  @IsNotEmpty()
  @IsNumber()
  cityId!: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsNotEmpty()
  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}

export class CreatePropertyFlowDTO extends CreatePropertyDTO {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePropertyImageDTO)
  propertyImages?: CreatePropertyImageDTO[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRoomFlowDTO)
  rooms?: CreateRoomFlowDTO[];
}

export class UpdatePropertyDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  cityId?: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}
