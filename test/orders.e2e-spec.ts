import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let menuItemId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Seed a test menu item
    const item = await prisma.menuItem.create({
      data: {
        name: 'Test Pizza',
        description: 'Test description',
        price: 10.0,
        image: 'https://example.com/pizza.jpg',
        category: 'Pizza',
      },
    });
    menuItemId = item.id;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.menuItem.deleteMany({ where: { name: 'Test Pizza' } });
    await app.close();
  });

  describe('GET /api/menu', () => {
    it('should return menu items array', async () => {
      const res = await request(app.getHttpServer()).get('/api/menu').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/orders', () => {
    it('should create an order with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          customerName: 'Test User',
          address: '123 Test St',
          phone: '555-0000',
          items: [{ menuItemId, quantity: 2 }],
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe(OrderStatus.ORDER_RECEIVED);
      expect(res.body.customerName).toBe('Test User');
      expect(res.body.total).toBeCloseTo(20.0, 2);
      orderId = res.body.id;
    });

    it('should return 400 when customerName is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          address: '123 Test St',
          phone: '555-0000',
          items: [{ menuItemId, quantity: 1 }],
        })
        .expect(400);
    });

    it('should return 400 when items array is empty', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          customerName: 'Test User',
          address: '123 Test St',
          phone: '555-0000',
          items: [],
        })
        .expect(400);
    });

    it('should return 400 when phone is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          customerName: 'Test User',
          address: '123 Test St',
          items: [{ menuItemId, quantity: 1 }],
        })
        .expect(400);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .expect(200);

      expect(res.body.id).toBe(orderId);
      expect(res.body).toHaveProperty('items');
    });

    it('should return 404 for unknown id', async () => {
      await request(app.getHttpServer())
        .get('/api/orders/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('GET /api/orders', () => {
    it('should return array of orders', async () => {
      const res = await request(app.getHttpServer()).get('/api/orders').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('should update order status to PREPARING', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: OrderStatus.PREPARING })
        .expect(200);

      expect(res.body.status).toBe(OrderStatus.PREPARING);
    });

    it('should return 400 for invalid status value', async () => {
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });

    it('should return 404 for unknown order id', async () => {
      await request(app.getHttpServer())
        .patch('/api/orders/00000000-0000-0000-0000-000000000000/status')
        .send({ status: OrderStatus.PREPARING })
        .expect(404);
    });
  });
});
