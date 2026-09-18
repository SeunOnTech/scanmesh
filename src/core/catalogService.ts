import type { ProductMetadata } from './types';

export interface CatalogResolver {
  resolveBarcode(barcode: string): Promise<ProductMetadata | null>;
  resolveByText(text: string): ProductMetadata | null;
}

const OFFLINE_MASTER_CATALOG: ProductMetadata[] = [
  {
    id: 'fmcg-ind-001',
    barcode: '6151100010018',
    name: 'Indomie Instant Noodles Onion Chicken',
    brand: 'Indomie',
    category: 'Groceries / Noodles',
    subCategory: 'Instant Noodles',
    size: '70g',
    suggestedRetailPrice: 350,
    costPrice: 270,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-ind-001-alt',
    barcode: '0896860107233',
    name: 'Indomie Instant Noodles Onion Chicken',
    brand: 'Indomie',
    category: 'Groceries / Noodles',
    subCategory: 'Instant Noodles',
    size: '70g',
    suggestedRetailPrice: 350,
    costPrice: 270,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-ind-002',
    barcode: '6151100010025',
    name: 'Indomie Super Pack Onion Chicken',
    brand: 'Indomie',
    category: 'Groceries / Noodles',
    subCategory: 'Instant Noodles',
    size: '120g',
    suggestedRetailPrice: 500,
    costPrice: 410,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-ind-002-alt',
    barcode: '0896860107240',
    name: 'Indomie Super Pack Onion Chicken',
    brand: 'Indomie',
    category: 'Groceries / Noodles',
    subCategory: 'Instant Noodles',
    size: '120g',
    suggestedRetailPrice: 500,
    costPrice: 410,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-ind-003',
    barcode: '6151100010032',
    name: 'Indomie Hungryman Size Chicken',
    brand: 'Indomie',
    category: 'Groceries / Noodles',
    subCategory: 'Instant Noodles',
    size: '180g',
    suggestedRetailPrice: 750,
    costPrice: 620,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-ind-004',
    barcode: '6151100010049',
    name: 'Indomie Belle Full Chicken Flavor',
    brand: 'Indomie',
    category: 'Groceries / Noodles',
    subCategory: 'Instant Noodles',
    size: '305g',
    suggestedRetailPrice: 1200,
    costPrice: 980,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-mlk-001',
    barcode: '6151100012345',
    name: 'Peak Evaporated Milk (Full Cream)',
    brand: 'Peak',
    category: 'Dairy & Breakfast',
    subCategory: 'Evaporated Milk',
    size: '160g',
    suggestedRetailPrice: 750,
    costPrice: 650,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-mlk-001-alt',
    barcode: '6151100012348',
    name: 'Peak Evaporated Milk (Full Cream)',
    brand: 'Peak',
    category: 'Dairy & Breakfast',
    subCategory: 'Evaporated Milk',
    size: '160g',
    suggestedRetailPrice: 750,
    costPrice: 650,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-mlk-002',
    barcode: '6151100012352',
    name: 'Three Crowns Evaporated Milk',
    brand: 'Three Crowns',
    category: 'Dairy & Breakfast',
    subCategory: 'Evaporated Milk',
    size: '160g',
    suggestedRetailPrice: 650,
    costPrice: 560,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-mlk-003',
    barcode: '5711953018235',
    name: 'Dano Full Cream Milk Powder',
    brand: 'Dano',
    category: 'Dairy & Breakfast',
    subCategory: 'Milk Powder',
    size: '800g',
    suggestedRetailPrice: 7000,
    costPrice: 6100,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-mlk-004',
    barcode: '6151100012369',
    name: 'Cowbell Milk Powder Sachet',
    brand: 'Cowbell',
    category: 'Dairy & Breakfast',
    subCategory: 'Milk Powder',
    size: '14g',
    suggestedRetailPrice: 150,
    costPrice: 110,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-mlk-005',
    barcode: '7613035987654',
    name: 'Milo Chocolate Malt Drink Tin',
    brand: 'Milo',
    category: 'Dairy & Breakfast',
    subCategory: 'Malt Beverage',
    size: '500g',
    suggestedRetailPrice: 4200,
    costPrice: 3650,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-mlk-006',
    barcode: '7613035987661',
    name: 'Milo Food Drink Sachet',
    brand: 'Milo',
    category: 'Dairy & Breakfast',
    subCategory: 'Malt Beverage',
    size: '20g',
    suggestedRetailPrice: 200,
    costPrice: 160,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-oil-001',
    barcode: '0614141999996',
    name: 'Golden Terra Pure Soya Oil',
    brand: 'Golden Terra',
    category: 'Cooking & Oils',
    subCategory: 'Vegetable Oil',
    size: '2.75L',
    suggestedRetailPrice: 10500,
    costPrice: 9200,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-oil-002',
    barcode: '6151100020012',
    name: "Devon King's Pure Vegetable Oil",
    brand: "King's",
    category: 'Cooking & Oils',
    subCategory: 'Vegetable Oil',
    size: '1L',
    suggestedRetailPrice: 2600,
    costPrice: 2250,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-oil-003',
    barcode: '6151100020029',
    name: 'Power Oil Pure Vegetable Cooking Oil',
    brand: 'Power Oil',
    category: 'Cooking & Oils',
    subCategory: 'Vegetable Oil',
    size: '750ml',
    suggestedRetailPrice: 2400,
    costPrice: 2050,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-bev-001',
    barcode: '5449000000996',
    name: 'Coca-Cola Original Taste',
    brand: 'Coca-Cola',
    category: 'Beverages & Soft Drinks',
    subCategory: 'Carbonated Drink',
    size: '50cl',
    suggestedRetailPrice: 450,
    costPrice: 360,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-bev-001-alt',
    barcode: '5449000131805',
    name: 'Coca-Cola Original Taste',
    brand: 'Coca-Cola',
    category: 'Beverages & Soft Drinks',
    subCategory: 'Carbonated Drink',
    size: '50cl',
    suggestedRetailPrice: 450,
    costPrice: 360,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-bev-002',
    barcode: '012000000133',
    name: 'Pepsi Cola Chilled Bottle',
    brand: 'Pepsi',
    category: 'Beverages & Soft Drinks',
    subCategory: 'Carbonated Drink',
    size: '50cl',
    suggestedRetailPrice: 400,
    costPrice: 320,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-bev-003',
    barcode: '5449000011527',
    name: 'Fanta Orange Soda',
    brand: 'Fanta',
    category: 'Beverages & Soft Drinks',
    subCategory: 'Carbonated Drink',
    size: '50cl',
    suggestedRetailPrice: 450,
    costPrice: 360,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-bev-004',
    barcode: '5449000011534',
    name: 'Sprite Lemon-Lime Soda',
    brand: 'Sprite',
    category: 'Beverages & Soft Drinks',
    subCategory: 'Carbonated Drink',
    size: '50cl',
    suggestedRetailPrice: 450,
    costPrice: 360,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-bev-005',
    barcode: '6151100030011',
    name: 'Maltina Classic Malt Drink',
    brand: 'Maltina',
    category: 'Beverages & Soft Drinks',
    subCategory: 'Malt Drink',
    size: '33cl',
    suggestedRetailPrice: 550,
    costPrice: 440,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-bev-006',
    barcode: '6151100040010',
    name: 'Eva Premium Table Water',
    brand: 'Eva',
    category: 'Beverages & Soft Drinks',
    subCategory: 'Table Water',
    size: '75cl',
    suggestedRetailPrice: 250,
    costPrice: 180,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-det-001',
    barcode: '4015400123456',
    name: 'Ariel Auto Washing Powder',
    brand: 'Ariel',
    category: 'Household & Cleaning',
    subCategory: 'Laundry Detergent',
    size: '2kg',
    suggestedRetailPrice: 6100,
    costPrice: 5200,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-det-002',
    barcode: '6151100050019',
    name: 'Sunlight 2-in-1 Hand Wash Powder',
    brand: 'Sunlight',
    category: 'Household & Cleaning',
    subCategory: 'Laundry Detergent',
    size: '900g',
    suggestedRetailPrice: 2200,
    costPrice: 1850,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-det-003',
    barcode: '6001053001234',
    name: 'Dettol Original Antiseptic Bar Soap',
    brand: 'Dettol',
    category: 'Toiletries & Personal Care',
    subCategory: 'Bar Soap',
    size: '110g',
    suggestedRetailPrice: 650,
    costPrice: 520,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-det-004',
    barcode: '6151100060018',
    name: 'Close-Up Triple Fresh Mint Toothpaste',
    brand: 'Close-Up',
    category: 'Toiletries & Personal Care',
    subCategory: 'Oral Care',
    size: '140g',
    suggestedRetailPrice: 900,
    costPrice: 720,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-sug-001',
    barcode: '6151100070017',
    name: 'Dangote Refined Granulated Sugar',
    brand: 'Dangote',
    category: 'Cooking & Staples',
    subCategory: 'Sugar',
    size: '500g',
    suggestedRetailPrice: 1400,
    costPrice: 1180,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-cer-001',
    barcode: '0038000198514',
    name: "Kellogg's Corn Flakes Box",
    brand: "Kellogg's",
    category: 'Dairy & Breakfast',
    subCategory: 'Breakfast Cereal',
    size: '500g',
    suggestedRetailPrice: 4400,
    costPrice: 3800,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-brd-001',
    barcode: 'VALU-BRD-800',
    name: 'Valu Special White Sliced Bread',
    brand: 'Valu Bakery',
    category: 'Bakery & Bread',
    subCategory: 'Sliced Bread',
    size: '800g',
    suggestedRetailPrice: 1400,
    costPrice: 1150,
    isMasterVerified: true,
  },
  {
    id: 'fmcg-brd-002',
    barcode: 'UTC-BRD-900',
    name: 'UTC Family Sliced Bread',
    brand: 'UTC',
    category: 'Bakery & Bread',
    subCategory: 'Sliced Bread',
    size: '900g',
    suggestedRetailPrice: 1500,
    costPrice: 1250,
    isMasterVerified: true,
  },
];

class CatalogService implements CatalogResolver {
  private memoryCache: Map<string, ProductMetadata> = new Map();

  constructor() {
    for (const item of OFFLINE_MASTER_CATALOG) {
      this.memoryCache.set(item.barcode, item);
    }
  }

  public async resolveBarcode(barcode: string): Promise<ProductMetadata | null> {
    const clean = barcode.trim().replace(/[\s-]/g, '');
    if (this.memoryCache.has(clean)) {
      return this.memoryCache.get(clean) || null;
    }

    if (clean.startsWith('0') && this.memoryCache.has(clean.slice(1))) {
      return this.memoryCache.get(clean.slice(1)) || null;
    }

    if (!clean.startsWith('0') && this.memoryCache.has('0' + clean)) {
      return this.memoryCache.get('0' + clean) || null;
    }

    return null;
  }

  public resolveByText(text: string): ProductMetadata | null {
    if (!text || text.length < 3) return null;
    const cleanUpper = text.toUpperCase();

    for (const item of OFFLINE_MASTER_CATALOG) {
      const nameUpper = item.name.toUpperCase();
      const brandUpper = item.brand.toUpperCase();

      if (cleanUpper.includes(nameUpper) || cleanUpper.includes(brandUpper)) {
        return item;
      }

      if (
        (cleanUpper.includes('INDOMIE') && nameUpper.includes('INDOMIE')) ||
        (cleanUpper.includes('PEAK') && nameUpper.includes('PEAK')) ||
        (cleanUpper.includes('MILO') && nameUpper.includes('MILO')) ||
        (cleanUpper.includes('COCA') && nameUpper.includes('COCA')) ||
        (cleanUpper.includes('PEPSI') && nameUpper.includes('PEPSI')) ||
        (cleanUpper.includes('FANTA') && nameUpper.includes('FANTA')) ||
        (cleanUpper.includes('SPRITE') && nameUpper.includes('SPRITE')) ||
        (cleanUpper.includes('MALTINA') && nameUpper.includes('MALTINA')) ||
        (cleanUpper.includes('ARIEL') && nameUpper.includes('ARIEL')) ||
        (cleanUpper.includes('DETTOL') && nameUpper.includes('DETTOL')) ||
        (cleanUpper.includes('CLOSE UP') && nameUpper.includes('CLOSE-UP')) ||
        (cleanUpper.includes('VALU') && nameUpper.includes('VALU')) ||
        (cleanUpper.includes('GOLDEN TERRA') && nameUpper.includes('GOLDEN TERRA')) ||
        (cleanUpper.includes('DANGOTE') && nameUpper.includes('DANGOTE'))
      ) {
        return item;
      }
    }

    return null;
  }

  public registerCustomProduct(item: ProductMetadata): void {
    this.memoryCache.set(item.barcode, item);
  }
}

export const catalogService = new CatalogService();
