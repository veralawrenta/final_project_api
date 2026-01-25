import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateDataUserDTO { 
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