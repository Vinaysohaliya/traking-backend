import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const menuItems = [
  {
    name: 'Margherita Pizza',
    description: 'Classic pizza with rich tomato sauce, fresh mozzarella, and fragrant basil leaves',
    price: 12.99,
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop',
    category: 'Pizza',
  },
  {
    name: 'Garden Veggie Pizza',
    description: 'Loaded with bell peppers, mushrooms, olives, onions, and cherry tomatoes on a crispy base',
    price: 14.49,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop',
    category: 'Pizza',
  },
  {
    name: 'Veggie Burger',
    description: 'Hearty black-bean patty with avocado, lettuce, tomato, pickles, and chipotle mayo',
    price: 10.99,
    image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&auto=format&fit=crop',
    category: 'Burgers',
  },
  {
    name: 'Paneer Tikka Wrap',
    description: 'Grilled paneer tikka with mint chutney, onions, and coriander in a soft whole-wheat wrap',
    price: 11.49,
    image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&auto=format&fit=crop',
    category: 'Wraps',
  },
  {
    name: 'Falafel Wrap',
    description: 'Crispy falafel balls with hummus, tabbouleh, cucumber, and tahini in a warm pita',
    price: 10.49,
    image: 'https://images.unsplash.com/photo-1571197119669-45862d9df9eb?w=600&auto=format&fit=crop',
    category: 'Wraps',
  },
  {
    name: 'Caesar Salad',
    description: 'Crispy romaine lettuce, shaved parmesan, house-made croutons, and classic Caesar dressing',
    price: 8.99,
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&auto=format&fit=crop',
    category: 'Salads',
  },
  {
    name: 'Caprese Salad',
    description: 'Ripe heirloom tomatoes, fresh buffalo mozzarella, basil, and a drizzle of balsamic glaze',
    price: 9.49,
    image: 'https://images.unsplash.com/photo-1592417817038-d13fd7342605?w=600&auto=format&fit=crop',
    category: 'Salads',
  },
  {
    name: 'Pasta Primavera',
    description: 'Penne tossed with seasonal vegetables, cherry tomatoes, garlic, and olive oil with fresh herbs',
    price: 12.49,
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&auto=format&fit=crop',
    category: 'Pasta',
  },
  {
    name: 'Mushroom Risotto',
    description: 'Creamy arborio rice with wild mushrooms, parmesan, thyme, and white wine reduction',
    price: 13.99,
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop',
    category: 'Mains',
  },
  {
    name: 'Veggie Spring Rolls',
    description: 'Crispy rolls filled with cabbage, carrots, glass noodles, and ginger — served with sweet chilli dip (4 pcs)',
    price: 7.99,
    image: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&auto=format&fit=crop',
    category: 'Starters',
  },
];

async function main() {
  console.log('Clearing existing data...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.menuItem.deleteMany({});
  console.log('Seeding vegetarian menu items...');
  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }
  console.log(`Seeded ${menuItems.length} menu items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
