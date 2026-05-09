import re

# Read the original file
with open('app/purchase-order/PurchaseOrderPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add employee to Delivery type
content = re.sub(
    r'(  items: DeliveryItem\[\];)\n\};',
    r'\1\n  employee?: { id: string; name: string; role: string };\n};',
    content
)

# 2. Remove deliveryDate from DeliveryForm type
content = content.replace(
    'type DeliveryForm = { supplierId: string; deliveryDate: string; lineItems: LineItem[]; notes: string };',
    'type DeliveryForm = { supplierId: string; lineItems: LineItem[]; notes: string };'
)

# 3. Remove deliveryDate from makeEmptyForm
content = content.replace(
    '  supplierId: "", deliveryDate: new Date().toISOString().split("T")[0],\n  lineItems: [emptyLineItem()],',
    '  supplierId: "", lineItems: [emptyLineItem()],'
)

# 4. Update handleSave: remove deliveryDate, add employeeId
content = content.replace(
    '      const res = await api.createDelivery({\n        supplierId: form.supplierId, deliveryDate: form.deliveryDate,',
    '      const employeeId = localStorage.getItem("userId") || "";\n      const res = await api.createDelivery({\n        supplierId: form.supplierId,'
)

# 5. Add employeeId to API call
content = content.replace(
    '        notes: form.notes || "",\n        items:',
    '        notes: form.notes || "",\n        employeeId,\n        items:'
)

# 6. Remove Delivery Date section from Order Preview
# Find the section that starts with {form.deliveryDate && ( and ends with )}
pattern1 = r'\s*\{form\.deliveryDate && \(\s*<div className="mb-4 flex items-center gap-2 p-2\.5 bg-gray-50 rounded-xl border border-gray-100">.*?</div>\s*\)\}'
content = re.sub(pattern1, '', content, flags=re.DOTALL)

# 7. Remove DateField component
pattern2 = r'\s*\{\/\* ✅ Custom date field — calendar icon, readable date ✅ \*\/\}\s*<DateField[\s\S]*?\/>'
content = re.sub(pattern2, '', content)

# Write the modified content back
with open('app/purchase-order/PurchaseOrderPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('All changes applied successfully')
