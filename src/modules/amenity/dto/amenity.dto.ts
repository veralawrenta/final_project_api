import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateAmenityDTO {
    @IsNotEmpty()
    @IsString()
    name!: string;
};

export class CreateAmenitiesDTO {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    names!: string[];
}

export class UpdateAmenityDTO {
    @IsOptional()
    @IsString()
    name?: string;
};