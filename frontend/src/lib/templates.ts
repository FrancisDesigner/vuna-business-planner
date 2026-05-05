import { BusinessCategory } from '../types';

export const INDUSTRY_TEMPLATES = {
  agriculture: {
    defaultSeeds: ['Land clearing', 'Land preparation / tillage', 'Seeds or seedlings', 'Soil amendments / fertiliser'],
    defaultFoundation: ['Owned tools or irrigation setup', 'Storage structure', 'Season setup equipment'],
    defaultFuel: ['Planting labour', 'Weeding', 'Irrigation', 'Harvesting'],
    defaultProtection: ['Crop protection', 'Post-harvest handling', 'Storage', 'Transport to market'],
    commonMistakes: ['Forgetting land rent when leasing', 'Ignoring post-harvest handling and transport'],
    salesSpeedUnit: 'Yield units per season',
  },
  manufacturing: {
    defaultSeeds: ["Raw materials", "Packaging", "Power/water per unit"],
    defaultFoundation: ["Equipment", "Workspace rent", "Machine operators"],
    defaultFuel: ["Transport to market", "Storage", "Maintenance"],
    defaultProtection: ["Machine repair", "Spoilage"],
    commonMistakes: ["Forgetting drying/curing time", "Not accounting for spoilage"],
    salesSpeedUnit: "Physical units (e.g., boxes, pieces)"
  },
  retail: {
    defaultSeeds: ["Cost of goods purchased", "Packaging for customers"],
    defaultFoundation: ["Shop rent", "Licenses", "Security", "Display fixtures"],
    defaultFuel: ["Bags/receipts", "Utilities", "Transport to supplier"],
    defaultProtection: ["Theft insurance", "Damages/Shrinkage"],
    commonMistakes: ["Pricing too low to compete", "Not counting theft/shrinkage"],
    salesSpeedUnit: "Transactions or items"
  },
  wholesale: {
    defaultSeeds: ["Purchase price of bulk stock", "Import duties"],
    defaultFoundation: ["Warehouse rent", "Delivery vehicle", "Sales staff"],
    defaultFuel: ["Fuel", "Phone/internet", "Loading labor", "Storage handling"],
    defaultProtection: ["Stock loss", "Bad debt"],
    commonMistakes: ["Giving too much credit to customers", "Underestimating transport costs"],
    salesSpeedUnit: "Volume or orders"
  },
  service: {
    defaultSeeds: ["Materials per job", "Subcontractor payments"],
    defaultFoundation: ["Tools/equipment", "Workspace or transport", "Certifications"],
    defaultFuel: ["Transport to clients", "Internet/phone", "Marketing", "Rework materials"],
    defaultProtection: ["Customer complaints", "Rework"],
    commonMistakes: ["Not charging for travel time", "Underpricing expertise"],
    salesSpeedUnit: "Hours or projects"
  }
};

export const categorizeBusiness = (description: string): BusinessCategory => {
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.match(/farm|farming|grow|garden|crop|harvest|seed|seedling|fertili|maize|beans|tomato|onion|cassava|banana|coffee|tea|poultry|dairy|livestock/)) return 'agriculture';
  if (lowerDesc.match(/make|produce|build|create|manufacture|craft|cook|bake|weave|knit|sew|weld|carve|brew|distill|roast|print|assemble|construct|design|develop|formulate|basket|busket/)) return 'manufacturing';
  if (lowerDesc.match(/sell|shop|store|kiosk|retail|boutique|supermarket|grocery|market|vendor|stall|trade|buy and sell|resell|ecommerce|e-commerce/)) return 'retail';
  if (lowerDesc.match(/distribute|wholesale|supply|bulk|export|import|warehouse|dealer|broker/)) return 'wholesale';
  if (lowerDesc.match(/service|repair|salon|consult|clean|teach|drive|wash|fix|paint|plumb|wire|install|maintain|tutor|coach|train|guide|host|entertain|perform|write|translate|design|code|program|develop|manage|plan|organize|deliver|transport|carry|move|massage|therapy|care|nurse|doctor|clinic|hospital|school|academy|agency/)) return 'service';
  return 'retail'; // Default fallback
};

export const getHelperSuggestion = (field: string, location: string, category: BusinessCategory) => {
  if (field.toLowerCase().includes('rent')) {
    return `Check current rent for ${category || 'this business'} in ${location || 'your area'} with nearby landlords or listing sites before you set this number.`;
  }
  if (field.toLowerCase().includes('salaries') || field.toLowerCase().includes('wages')) {
    return `Check current wages for this kind of role in ${location || 'your area'} before you decide on your salary budget.`;
  }
  return `Use current supplier or market research in ${location || 'your area'} to estimate ${field} accurately.`;
};
