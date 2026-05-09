const fs = require('fs');
const filePath = 'app/purchase-order/PurchaseOrderPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

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

// 4. Update handleSave: remove deliveryDate, add employeeId
content = content.replace(
  '      const res = await api.createDelivery({\n        supplierId: form.supplierId, deliveryDate: form.deliveryDate,',
  '      const employeeId = localStorage.getItem("userId") || "";\n      const res = await api.createDelivery({\n        supplierId: form.supplierId,'
);

// 5. Add employeeId to API call
content = content.replace(
  '        notes: form.notes || "",\n        items:',
  '        notes: form.notes || "",\n        employeeId,\n        items:'
);

// 6. Remove Delivery Date section from Order Preview
const dateSectionRegex = /\s*\{form\.deliveryDate && \(\s*<div className="mb-4 flex items-center gap-2 p-2\.5 bg-gray-50 rounded-xl border border-gray-100">[\s\S]*?<\/div>\s*\)\}/;
content = content.replace(dateSectionRegex, '');

// 7. Remove DateField component
const dateFieldRegex = /\s*\{\/\* ✅ Custom date field — calendar icon, readable date ✅ \*\/\}\s*<DateField[\s\S]*?\/>/;
content = content.replace(dateFieldRegex, '');

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('All changes applied successfully');
