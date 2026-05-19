import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';

const mockMenuItem = {
  id: 'menu-uuid-1',
  name: 'Margherita Pizza',
  description: 'Classic pizza',
  price: 12.99,
  image: 'https://example.com/pizza.jpg',
  category: 'Pizza',
};

const mockOrder = {
  id: 'order-uuid-1',
  customerName: 'John Doe',
  address: '123 Main St',
  phone: '555-1234',
  status: OrderStatus.ORDER_RECEIVED,
  total: 25.98,
  items: [
    {
      id: 'item-uuid-1',
      orderId: 'order-uuid-1',
      menuItemId: 'menu-uuid-1',
      quantity: 2,
      unitPrice: 12.99,
      menuItem: mockMenuItem,
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  menuItem: {
    findMany: jest.fn(),
  },
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      const result = await service.findAll();
      expect(result).toEqual([mockOrder]);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single order by id', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      const result = await service.findOne('order-uuid-1');
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      customerName: 'John Doe',
      address: '123 Main St',
      phone: '555-1234',
      items: [{ menuItemId: 'menu-uuid-1', quantity: 2 }],
    };

    it('should create an order and return it', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([mockMenuItem]);
      mockPrisma.order.create.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);

      const result = await service.create(createDto, 'user-uuid-1');
      expect(result).toEqual(mockOrder);
      expect(mockPrisma.order.create).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when menu items not found', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([]);
      await expect(service.create(createDto, 'user-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate total correctly', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([mockMenuItem]);
      mockPrisma.order.create.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);

      await service.create(createDto, 'user-uuid-1');

      const createCall = mockPrisma.order.create.mock.calls[0][0];
      expect(createCall.data.total).toBeCloseTo(25.98, 2);
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      const updatedOrder = { ...mockOrder, status: OrderStatus.PREPARING };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateStatus('order-uuid-1', {
        status: OrderStatus.PREPARING,
      });
      expect(result.status).toBe(OrderStatus.PREPARING);
    });

    it('should throw NotFoundException for invalid order id', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('bad-id', { status: OrderStatus.PREPARING }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatusStream', () => {
    it('should return an observable', () => {
      const stream = service.getStatusStream('order-uuid-1');
      expect(stream).toBeDefined();
      expect(typeof stream.subscribe).toBe('function');
    });
  });
});
