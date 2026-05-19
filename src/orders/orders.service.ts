import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { Subject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

export interface StatusEvent {
  data: { orderId: string; status: OrderStatus };
}

const STATUS_SEQUENCE: OrderStatus[] = [
  OrderStatus.ORDER_RECEIVED,
  OrderStatus.PREPARING,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

const STATUS_DELAYS_MS = [0, 15_000, 30_000, 45_000];

const ORDER_INCLUDE = {
  items: { include: { menuItem: true } },
  user: { select: { id: true, name: true, email: true } },
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private streams = new Map<string, Subject<OrderStatus>>();

  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.order.findMany({
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { menuItem: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requestingUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    if (requestingUserId && order.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }

  async create(dto: CreateOrderDto, userId: string) {
    const { customerName, address, phone, items } = dto;

    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: items.map((i) => i.menuItemId) } },
    });
    if (menuItems.length !== items.length) {
      throw new BadRequestException('One or more menu items not found');
    }

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));
    const total = items.reduce((sum, item) => {
      return sum + menuItemMap.get(item.menuItemId).price * item.quantity;
    }, 0);

    const order = await this.prisma.order.create({
      data: {
        customerName,
        address,
        phone,
        total: Math.round(total * 100) / 100,
        status: OrderStatus.ORDER_RECEIVED,
        userId,
        items: {
          create: items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: menuItemMap.get(item.menuItemId).price,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });

    this.simulateStatusUpdates(order.id);
    return order;
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    await this.findOne(id); // existence check only — admin action, no ownership required
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: ORDER_INCLUDE,
    });
    this.emitStatus(id, dto.status);
    return updated;
  }

  async getStatusStream(orderId: string): Promise<Observable<StatusEvent>> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    if (order.status === OrderStatus.DELIVERED) {
      return of({ data: { orderId, status: order.status } });
    }

    if (!this.streams.has(orderId)) {
      this.streams.set(orderId, new Subject<OrderStatus>());
    }
    return this.streams.get(orderId).pipe(
      map((status) => ({ data: { orderId, status } })),
    );
  }

  private emitStatus(orderId: string, status: OrderStatus) {
    const subject = this.streams.get(orderId);
    if (subject) subject.next(status);
  }

  private simulateStatusUpdates(orderId: string) {
    if (!this.streams.has(orderId)) {
      this.streams.set(orderId, new Subject<OrderStatus>());
    }

    STATUS_SEQUENCE.forEach((status, index) => {
      const isLast = index === STATUS_SEQUENCE.length - 1;
      const timer = setTimeout(async () => {
        try {
          await this.prisma.order.update({ where: { id: orderId }, data: { status } });
          this.emitStatus(orderId, status);
          if (isLast) {
            const subject = this.streams.get(orderId);
            if (subject) {
              subject.complete();
              this.streams.delete(orderId);
            }
          }
        } catch (err) {
          this.logger.warn(`Status simulation aborted for order ${orderId}`, err?.message);
        }
      }, STATUS_DELAYS_MS[index]);
      timer.unref();
    });
  }
}
