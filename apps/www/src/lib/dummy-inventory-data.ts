
export const dummyInventoryData = {
  categories: [
    { id: 1, name: 'Doors', parentId: null },
    { id: 2, name: 'Interior', parentId: 1 },
    { id: 3, name: 'Exterior', parentId: 1 },
    { id: 4, name: 'Windows', parentId: null },
    { id: 5, name: 'Hardware', parentId: null },
    { id: 6, name: 'Knobs & Levers', parentId: 5 },
    { id: 7, name: 'Hinges', parentId: 5 },
  ],
  products: [
    {
      id: 1,
      name: '6-Panel Interior Door',
      categoryId: 2,
      variants: [
        { id: 1, name: '30"x80"', stock: 100, price: 150.0, attributes: { width: '30"', height: '80"' } },
        { id: 2, name: '32"x80"', stock: 75, price: 160.0, attributes: { width: '32"', height: '80"' } },
        { id: 3, name: '36"x80"', stock: 50, price: 170.0, attributes: { width: '36"', height: '80"' } },
      ],
    },
    {
      id: 2,
      name: 'Shaker Interior Door',
      categoryId: 2,
      variants: [
        { id: 4, name: '30"x80"', stock: 80, price: 180.0, attributes: { width: '30"', height: '80"' } },
        { id: 5, name: '32"x80"', stock: 60, price: 190.0, attributes: { width: '32"', height: '80"' } },
      ],
    },
    {
      id: 3,
      name: 'Steel Exterior Door',
      categoryId: 3,
      variants: [
        { id: 6, name: '36"x80"', stock: 40, price: 450.0, attributes: { width: '36"', height: '80"' } },
      ],
    },
    {
      id: 4,
      name: 'Vinyl Sliding Window',
      categoryId: 4,
      variants: [
        { id: 7, name: '36"x48"', stock: 30, price: 250.0, attributes: { width: '36"', height: '48"' } },
        { id: 8, name: '48"x60"', stock: 20, price: 350.0, attributes: { width: '48"', height: '60"' } },
      ],
    },
    {
      id: 5,
      name: 'Satin Nickel Door Knob',
      categoryId: 6,
      variants: [
        { id: 9, name: 'Privacy', stock: 200, price: 25.0, attributes: { function: 'Privacy' } },
        { id: 10, name: 'Passage', stock: 300, price: 22.0, attributes: { function: 'Passage' } },
      ],
    },
    {
      id: 6,
      name: '3.5" Door Hinge',
      categoryId: 7,
      variants: [
        { id: 11, name: 'Satin Nickel', stock: 500, price: 3.50, attributes: { finish: 'Satin Nickel' } },
        { id: 12, name: 'Oil-Rubbed Bronze', stock: 400, price: 4.00, attributes: { finish: 'Oil-Rubbed Bronze' } },
      ],
    },
  ],
  stats: {
    totalProducts: 6,
    totalVariants: 12,
    totalStock: 1755,
    outOfStock: 0,
  }
};
