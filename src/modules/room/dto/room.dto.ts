import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateRoomDTO {
    @IsNotEmpty()
    @IsString()
    name!: string;

    @IsNotEmpty()
    @IsNumber()
    basePrice!: number;

    @IsNotEmpty()
    @IsNumber()
    totalGuests!: number;

    @IsNotEmpty()
    @IsString()
    description!: string;

    @IsNotEmpty()
    @IsNumber()
    totalUnit!: number;
};

export class UpdateRoomDTO {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsNumber()
    basePrice?: number;

    @IsOptional()
    @IsNumber()
    totalGuests?: number;

    @IsNotEmpty()
    @IsString()
    description!: string;

    @IsOptional()
    @IsNumber()
    totalUnit?: number;

};