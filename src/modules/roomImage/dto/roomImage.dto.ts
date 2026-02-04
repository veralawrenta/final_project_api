import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateRoomImageDTO {
  @IsNotEmpty()
  @IsString()
  urlImages!: string;
  
  @IsNotEmpty()
  @IsBoolean()
  isCover?: boolean;
}

export class UpdateRoomImageDTO {
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}
