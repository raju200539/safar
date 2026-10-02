import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateReportDto {
  @IsIn(['NOT_RUNNING', 'DIVERTED', 'OVERCROWDED', 'OTHER'])
  type!: 'NOT_RUNNING' | 'DIVERTED' | 'OVERCROWDED' | 'OTHER';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  routeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  stopId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}

export class AlertsQueryDto {
  @IsOptional()
  @IsString()
  stopId?: string;

  @IsOptional()
  @IsString()
  routeId?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
