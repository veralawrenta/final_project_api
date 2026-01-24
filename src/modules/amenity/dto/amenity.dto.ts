import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateAmenityDTO {
    @IsNotEmpty()
    @IsString()
    name!: string;
};

export class UpdateAmenityDTO {
    @IsOptional()
    @IsString()
    name?: string;
};