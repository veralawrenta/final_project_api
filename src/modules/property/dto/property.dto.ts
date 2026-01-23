import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { PropertyType } from "../../../../generated/prisma/enums";

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