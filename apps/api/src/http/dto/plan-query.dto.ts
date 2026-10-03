import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { HYDERABAD_BBOX } from '../../application/plan-trip';

/** GET /v1/plan query params. Coordinates limited to Hyderabad (SPEC §2.7). */
export class PlanQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(HYDERABAD_BBOX.minLat)
  @Max(HYDERABAD_BBOX.maxLat)
  fromLat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(HYDERABAD_BBOX.minLon)
  @Max(HYDERABAD_BBOX.maxLon)
  fromLon!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(HYDERABAD_BBOX.minLat)
  @Max(HYDERABAD_BBOX.maxLat)
  toLat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(HYDERABAD_BBOX.minLon)
  @Max(HYDERABAD_BBOX.maxLon)
  toLon!: number;

  @IsOptional()
  @IsISO8601()
  when?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  arriveBy?: boolean;

  @IsOptional()
  @IsIn(['all', 'bus', 'metro'])
  modes?: 'all' | 'bus' | 'metro';

  @IsOptional()
  @IsIn(['en', 'te'])
  lang?: 'en' | 'te';
}
