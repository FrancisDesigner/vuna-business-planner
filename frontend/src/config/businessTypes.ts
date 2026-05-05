export type BusinessType = 'retail' | 'wholesale' | 'service' | 'manufacturing' | 'agriculture';

export interface BusinessTypeConfig {
  label: string;
  description: string;
  costSectionLabel: string;
  itemLabel: string;
  unitCostLabel: string;
  marginLabel: string;
  showProductionCosts: boolean;
  showBatchYield: boolean;
  showMultipleItems: boolean;
  showStockPurchase: boolean;
  pdfHeading: string;
  costExplanation: string;
  icon: string;
  title: string;
  subtitle: string;
  examples: string;
  entryNameLabel: string;
  sellingPriceLabel: string;
  unitsPerWeekLabel: string;
  unitNameSingular: string;
  unitNamePlural: string;
  weeklyCostLabel: string;
  itemTableHeading: string;
  selectedPriceLabel: string;
}

export const BUSINESS_TYPE_CONFIG: Record<BusinessType, BusinessTypeConfig> = {
  retail: {
    label: 'Retail',
    description: 'Buy goods and resell them to customers',
    costSectionLabel: 'Stock / Purchase Costs',
    itemLabel: 'Items You Sell',
    unitCostLabel: 'Buying price per item',
    marginLabel: 'Profit per item (margin)',
    showProductionCosts: false,
    showBatchYield: false,
    showMultipleItems: true,
    showStockPurchase: true,
    pdfHeading: 'Retail Business Plan',
    costExplanation: 'What you pay to buy your stock from suppliers or farmers',
    icon: '🛒',
    title: 'Buy & Sell',
    subtitle: 'Retail',
    examples: 'Tomatoes, onions, rice, kiosk stock',
    entryNameLabel: 'Item name',
    sellingPriceLabel: 'Selling price',
    unitsPerWeekLabel: 'Units per week',
    unitNameSingular: 'item',
    unitNamePlural: 'items',
    weeklyCostLabel: 'Weekly stock cost',
    itemTableHeading: 'Your Stock List',
    selectedPriceLabel: 'Average selling price',
  },
  wholesale: {
    label: 'Wholesale',
    description: 'Buy goods in bulk and resell to retailers or businesses',
    costSectionLabel: 'Bulk Purchase Costs',
    itemLabel: 'Products You Trade',
    unitCostLabel: 'Buying price per item',
    marginLabel: 'Profit per item (margin)',
    showProductionCosts: false,
    showBatchYield: false,
    showMultipleItems: true,
    showStockPurchase: true,
    pdfHeading: 'Wholesale Business Plan',
    costExplanation: 'What you pay to buy your stock in bulk',
    icon: '📦',
    title: 'Sell Bulk',
    subtitle: 'Wholesale',
    examples: 'Rice sacks, drinks, shop supply stock',
    entryNameLabel: 'Item name',
    sellingPriceLabel: 'Selling price',
    unitsPerWeekLabel: 'Units per week',
    unitNameSingular: 'item',
    unitNamePlural: 'items',
    weeklyCostLabel: 'Weekly stock cost',
    itemTableHeading: 'Your Stock List',
    selectedPriceLabel: 'Average selling price',
  },
  service: {
    label: 'Service',
    description: 'You provide a service to customers (salon, repair, transport, etc.)',
    costSectionLabel: 'Service Delivery Costs',
    itemLabel: 'Services You Offer',
    unitCostLabel: 'Cost per job/service',
    marginLabel: 'Profit per job',
    showProductionCosts: false,
    showBatchYield: false,
    showMultipleItems: true,
    showStockPurchase: false,
    pdfHeading: 'Service Business Plan',
    costExplanation: 'What it costs you to deliver one service (materials, transport, etc.)',
    icon: '🔧',
    title: 'Do Work',
    subtitle: 'Service',
    examples: 'Haircut, repair, transport, tailoring',
    entryNameLabel: 'Service name',
    sellingPriceLabel: 'Price charged',
    unitsPerWeekLabel: 'Jobs per week',
    unitNameSingular: 'job',
    unitNamePlural: 'jobs',
    weeklyCostLabel: 'Weekly service cost',
    itemTableHeading: 'Your Service List',
    selectedPriceLabel: 'Average price charged',
  },
  manufacturing: {
    label: 'Manufacturing',
    description: 'You make or process products from raw materials',
    costSectionLabel: 'Production Costs',
    itemLabel: 'What You Produce',
    unitCostLabel: 'Cost to make one item',
    marginLabel: 'Money you keep per item',
    showProductionCosts: true,
    showBatchYield: true,
    showMultipleItems: false,
    showStockPurchase: false,
    pdfHeading: 'Manufacturing Business Plan',
    costExplanation: 'Include raw materials, packaging, and direct labour for one batch. We divide that batch cost by your batch yield to find the cost to make one item.',
    icon: '🏭',
    title: 'Make & Sell',
    subtitle: 'Manufacturing',
    examples: 'Soap, baking, crafts, processed foods',
    entryNameLabel: 'Item name',
    sellingPriceLabel: 'Selling price',
    unitsPerWeekLabel: 'Units per week',
    unitNameSingular: 'item',
    unitNamePlural: 'items',
    weeklyCostLabel: 'Weekly production cost',
    itemTableHeading: 'Production Summary',
    selectedPriceLabel: 'Selected price',
  },
  agriculture: {
    label: 'Agriculture',
    description: 'Plan crop-season costs, expected yield, selling price, and gross margin',
    costSectionLabel: 'Field & Input Costs',
    itemLabel: 'Farm Enterprise',
    unitCostLabel: 'Cost per unit',
    marginLabel: 'Gross margin per unit',
    showProductionCosts: false,
    showBatchYield: false,
    showMultipleItems: false,
    showStockPurchase: false,
    pdfHeading: 'Agriculture Plan',
    costExplanation: 'Add the field operations and seasonal input costs you expect to pay before harvest.',
    icon: '🌾',
    title: 'Grow & Sell',
    subtitle: 'Agriculture',
    examples: 'Maize, tomatoes, onions, beans, vegetables',
    entryNameLabel: 'Crop name',
    sellingPriceLabel: 'Selling price per unit',
    unitsPerWeekLabel: 'Expected yield units',
    unitNameSingular: 'unit',
    unitNamePlural: 'units',
    weeklyCostLabel: 'Season variable cost',
    itemTableHeading: 'Season Summary',
    selectedPriceLabel: 'Expected price per unit',
  },
};
