import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCategoryDTO {
    @IsNotEmpty()
    @IsString()
    name!: string;
}

export class UpdateCategoryDTO {
    @IsOptional()
    @IsString()
    name?: string;
}