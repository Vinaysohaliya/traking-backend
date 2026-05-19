import { Test, TestingModule } from '@nestjs/testing';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

const mockMenuItems = [
  {
    id: 'uuid-1',
    name: 'Margherita Pizza',
    description: 'Classic pizza',
    price: 12.99,
    image: 'https://example.com/pizza.jpg',
    category: 'Pizza',
  },
  {
    id: 'uuid-2',
    name: 'Classic Cheeseburger',
    description: 'Juicy burger',
    price: 10.99,
    image: 'https://example.com/burger.jpg',
    category: 'Burgers',
  },
];

describe('MenuController', () => {
  let controller: MenuController;
  let service: MenuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [
        {
          provide: MenuService,
          useValue: {
            findAll: jest.fn().mockResolvedValue(mockMenuItems),
            findOne: jest.fn().mockResolvedValue(mockMenuItems[0]),
          },
        },
      ],
    }).compile();

    controller = module.get<MenuController>(MenuController);
    service = module.get<MenuService>(MenuService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of menu items', async () => {
      const result = await controller.findAll();
      expect(result).toEqual(mockMenuItems);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return all item fields', async () => {
      const result = await controller.findAll();
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('price');
      expect(result[0]).toHaveProperty('image');
      expect(result[0]).toHaveProperty('category');
    });
  });
});
