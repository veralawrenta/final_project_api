import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto.js";

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

export class GetAllCategoriesDTO extends PaginationQueryParams{
    @IsOptional()
    @IsString()
    search?: string ="";
}