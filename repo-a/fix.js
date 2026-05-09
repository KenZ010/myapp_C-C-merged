const fs = require('fs');
let content = fs.readFileSync('app/purchase-order/PurchaseOrderPage.tsx', 'utf8');

// 1. Add employee to Delivery type
content = content.replace(
  /(  items: DeliveryItem\[\];)\n\};/,
  '$1\n  employee?: { id: string; name: string; role: string };\n};'
);

// 2. Remove deliveryDate from DeliveryForm type
content = content.replace(
  'type DeliveryForm = { supplierId: string; deliveryDate: string; lineItems: LineItem[]; notes: string };',
  'type DeliveryForm = { supplierId: string; lineItems: LineItem[]; notes: string };'
);

// 3. Remove deliveryDate from makeEmptyForm
content = content.replace(
  '  supplierId: "", deliveryDate: new Date().toISOString().split("T")[0],\n  lineItems: [emptyLineItem()],',
  '  supplierId: "", lineItems: [emptyLineItem()],'
);

fs.writeFileSync('app/purchase-order/PurchaseOrderPage.tsx', content, 'utf8');
console.log('Done');
