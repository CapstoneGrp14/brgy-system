import { InventoryCategory, Role } from '@brgy/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser, RequestUser, Roles } from '../../common/decorators';
import { InventoryService } from './inventory.service';

class AddItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsIn(['MEDICINE', 'EQUIPMENT', 'SUPPLY'])
  category: InventoryCategory;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  stockQty: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  threshold: number;
}

class RestockDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  qty: number;
}

class ListQueryDto {
  @IsOptional()
  @IsIn(['MEDICINE', 'EQUIPMENT', 'SUPPLY'])
  category?: InventoryCategory;
}

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /** Residents see only OPEN items (what they can request). */
  @Get('available')
  @Roles(Role.RESIDENT)
  available(@Query() query: ListQueryDto) {
    return this.inventory.list(query.category, true);
  }

  @Get()
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  list(@Query() query: ListQueryDto) {
    return this.inventory.list(query.category);
  }

  @Post()
  @Roles(Role.ADMIN)
  add(@Body() dto: AddItemDto, @CurrentUser() user: RequestUser) {
    return this.inventory.addItem(dto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inventory.updateItem(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    await this.inventory.removeItem(id, user);
    return { ok: true };
  }

  @Post(':id/restock')
  @Roles(Role.ADMIN)
  restock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestockDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inventory.restock(id, dto.qty, user);
  }
}
