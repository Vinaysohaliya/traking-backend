import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Sse,
  MessageEvent,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // All orders for the logged-in user
  @Get('my')
  getMyOrders(@Request() req) {
    return this.ordersService.findByUser(req.user.id);
  }

  // All orders (admin-style, still authenticated)
  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.ordersService.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    return this.ordersService.create(createOrderDto, req.user.id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }

  @Sse(':id/status-stream')
  async statusStream(@Param('id') id: string): Promise<Observable<MessageEvent>> {
    return this.ordersService.getStatusStream(id) as Promise<Observable<MessageEvent>>;
  }
}
