import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Prisma } from "../../../../generated/prisma/client";
import { PropertyType } from "../../../../generated/prisma/enums";
import { IsDateOnly } from "../../../validators/is-date-only.validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";

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

export class RoomImageInput {
  @IsNotEmpty()
  @IsNumber()
  roomId!: number;

  @IsNotEmpty()
  @IsString()
  urlImages!: string;

  @IsOptional()
  @Transform(({ value }) => Boolean(value))
  isCover?: boolean;
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
  @Type(() => Number)
  cityId!: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;

  @IsNotEmpty()
  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return [];
  })
  amenities?: string[];
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
  @Type(() => Number)
  cityId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  // property images: add URLs (uploaded elsewhere) or remove by id
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addPropertyImageUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  removePropertyImageIds?: number[];

  // room images: add/remove per room
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomImageInput)
  addRoomImages?: RoomImageInput[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  removeRoomImageIds?: number[];
}

export class PublishPropertyDTO {
  // no body needed now; included for validation placeholder
}
