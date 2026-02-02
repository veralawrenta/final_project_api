import { Transform } from "class-transformer";
import { IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PropertyType } from "../../../../generated/prisma/enums";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";
import { IsDateOnly } from "../../../validators/is-date-only.validator";

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
  @IsIn(["name", "price"])
  sortBy: string = "name";

  @IsOptional()
  @IsString()
  @IsIn(["asc", "desc"])
  sortOrder: string = "asc";

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsString()
  search?: string;
}

export class GetAllPropertiesDTO extends PaginationQueryParams{
    @IsOptional()
    @IsString()
    search?: string ="";
};

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
};

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
  }