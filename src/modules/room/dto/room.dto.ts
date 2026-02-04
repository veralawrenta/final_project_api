import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";
import { Type } from "class-transformer";
import { CreateRoomImageDTO } from "../../roomImage/dto/roomImage.dto";

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
  totalUnits!: number;
}

export class CreateRoomFlowDTO extends CreateRoomDTO {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRoomImageDTO)
  roomImages?: CreateRoomImageDTO[];
}

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

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  totalUnits?: number;
}

export class GetAllRoomsDTO extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  search?: string = "";
}
