import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.menuItem.findMany({
        orderBy: { category: 'asc' },
      });
    } catch {
      throw new InternalServerErrorException('Failed to fetch menu items');
    }
  }

  async findOne(id: string) {
    let item: Awaited<ReturnType<typeof this.prisma.menuItem.findUnique>>;
    try {
      item = await this.prisma.menuItem.findUnique({ where: { id } });
    } catch {
      throw new InternalServerErrorException('Failed to fetch menu item');
    }
    if (!item) throw new NotFoundException(`Menu item ${id} not found`);
    return item;
  }
}
