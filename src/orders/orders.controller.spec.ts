import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { of } from 'rxjs';

const mockUser = { id: 'user-uuid-1', email: 'user@test.com', name: 'Test User' };
const mockReq = { user: mockUser };

const mockOrder = {
  id: 'order-uuid-1',
  customerName: 'Jane Doe',
  address: '456 Elm St',
  phone: '555-9999',
  status: OrderStatus.ORDER_RECEIVED,
  total: 12.99,
  userId: 'user-uuid-1',
  items: [],
  user: mockUser,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([mockOrder]),
            findByUser: jest.fn().mockResolvedValue([mockOrder]),
            findOne: jest.fn().mockResolvedValue(mockOrder),
            create: jest.fn().mockResolvedValue(mockOrder),
            updateStatus: jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.PREPARING }),
            getStatusStream: jest.fn().mockReturnValue(
              of({ data: { orderId: 'order-uuid-1', status: OrderStatus.PREPARING } }),
            ),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /orders', () => {
    it('should return all orders', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([mockOrder]);
    });
  });

  describe('GET /orders/my', () => {
    it('should return orders for the current user', async () => {
      const result = await controller.getMyOrders(mockReq);
      expect(result).toEqual([mockOrder]);
      expect(service.findByUser).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /orders/:id', () => {
    it('should return a single order owned by the user', async () => {
      const result = await controller.findOne('order-uuid-1', mockReq);
      expect(result).toEqual(mockOrder);
      expect(service.findOne).toHaveBeenCalledWith('order-uuid-1', mockUser.id);
    });

    it('should propagate NotFoundException', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValueOnce(new NotFoundException());
      await expect(controller.findOne('bad-id', mockReq)).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /orders', () => {
    it('should create and return an order linked to the user', async () => {
      const dto = {
        customerName: 'Jane Doe',
        address: '456 Elm St',
        phone: '555-9999',
        items: [{ menuItemId: 'menu-uuid-1', quantity: 1 }],
      };
      const result = await controller.create(dto, mockReq);
      expect(result).toEqual(mockOrder);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
    });
  });

  describe('PATCH /orders/:id/status', () => {
    it('should update and return the order', async () => {
      const result = await controller.updateStatus('order-uuid-1', {
        status: OrderStatus.PREPARING,
      });
      expect(result.status).toBe(OrderStatus.PREPARING);
    });
  });

  describe('SSE /orders/:id/status-stream', () => {
    it('should return an observable', () => {
      const stream = controller.statusStream('order-uuid-1');
      expect(stream).toBeDefined();
      expect(typeof stream.subscribe).toBe('function');
    });
  });
});
