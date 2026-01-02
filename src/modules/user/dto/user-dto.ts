import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateDataUserDTO {
    @IsNotEmpty()
    @IsNumber()
    id!: number;
    
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;
    
    @IsOptional()
    @IsString()
    phone?: string;
    
    @IsOptional()
    @IsString()
    address?: string;
    
    @IsOptional()
    @IsString()
    aboutMe?: string;
}

export class UpdateDataTenantDTO {
    @IsNotEmpty()
    @IsNumber()
    id!: number;
    
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;
    
    @IsOptional()
    @IsString()
    phone?: string;
    
    @IsOptional()
    @IsString()
    address?: string;
    
    @IsOptional()
    @IsString()
    aboutMe?: string;

    @IsOptional()
    @IsString()
    tenantName?: string;

    @IsOptional()
    @IsString()
    bankName?: string;

    @IsOptional()
    @IsString()
    bankNumber?: string;
}