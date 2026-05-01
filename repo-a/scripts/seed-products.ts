const API_URL = "https://backend-production-740c.up.railway.app/api";

// Login to get token
async function login() {
  // Try login-admin first
  let res = await fetch(`${API_URL}/employees/login-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Admin", password: "12345678" }),
  });
  let data = await res.json();
  if (data.token) return data.token;

  // Try regular login
  res = await fetch(`${API_URL}/employees/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Admin", password: "12345678" }),
  });
  data = await res.json();
  if (data.token) return data.token;

  throw new Error("Login failed: " + JSON.stringify(data));
}

// Create supplier
async function createSupplier(token: string, supplier: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/suppliers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(supplier),
  });
  return res.json();
}

// Create product
async function createProduct(token: string, product: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  });
  return res.json();
}

// Get existing suppliers
async function getSuppliers(token: string) {
  const res = await fetch(`${API_URL}/suppliers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// Get existing products
async function getProducts() {
  const res = await fetch(`${API_URL}/products`);
  return res.json();
}

async function main() {
  console.log("🔐 Logging in...");
  let token: string;
  try {
    token = await login();
  } catch {
    // Try without token for suppliers/products (some endpoints don't require auth)
    console.log("⚠️  Login failed, trying without auth token...");
    token = "";
  }

  // Get existing data to avoid duplicates
  console.log("📋 Fetching existing suppliers...");
  const existingSuppliers = await getSuppliers(token);
  const supplierMap: Record<string, string> = {};
  if (Array.isArray(existingSuppliers)) {
    existingSuppliers.forEach((s: { id: string; supplierName: string }) => {
      supplierMap[s.supplierName.toLowerCase()] = s.id;
    });
  }

  console.log("📦 Fetching existing products...");
  const existingProducts = await getProducts();
  const existingProductNames = new Set<string>();
  if (Array.isArray(existingProducts)) {
    existingProducts.forEach((p: { productName: string; supplierId: string }) => {
      existingProductNames.add(`${p.productName.toLowerCase()}|${p.supplierId}`);
    });
  }

  // Define suppliers and their products
  const suppliersToCreate = [
    {
      name: "Abby-Mae Enterprises",
      contactNo: "+639000000001",
      address: "",
      agentName: "",
      lastOrdered: 0,
      status: "ACTIVE",
      products: [
        { productName: "Pilsen", size: "330ml", category: "BEER", price: 45, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "San Mig Light", size: "330ml", category: "BEER", price: 50, stockQuantity: 0, stockUnit: "case_24" },
      ],
    },
    {
      name: "American Royal Crown INC",
      contactNo: "+639000000002",
      address: "",
      agentName: "",
      lastOrdered: 0,
      status: "ACTIVE",
      products: [
        { productName: "RC", size: "330ml", category: "SOFTDRINKS", price: 30, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Fruit Soda Orange", size: "330ml", category: "SOFTDRINKS", price: 30, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Fruit Soda Orange", size: "1.5L", category: "SOFTDRINKS", price: 65, stockQuantity: 0, stockUnit: "case_12" },
        { productName: "Fruit Soda Lemon", size: "330ml", category: "SOFTDRINKS", price: 30, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Fruit Soda Lemon", size: "1.5L", category: "SOFTDRINKS", price: 65, stockQuantity: 0, stockUnit: "case_12" },
        { productName: "RootBeer", size: "330ml", category: "SOFTDRINKS", price: 30, stockQuantity: 0, stockUnit: "case_24" },
      ],
    },
    {
      name: "Coca Cola INC",
      contactNo: "+639000000003",
      address: "",
      agentName: "",
      lastOrdered: 0,
      status: "ACTIVE",
      products: [
        { productName: "Coca Cola", size: "330ml", category: "SOFTDRINKS", price: 30, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Coca Cola", size: "500ml", category: "SOFTDRINKS", price: 40, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Coca Cola", size: "1.5L", category: "SOFTDRINKS", price: 70, stockQuantity: 0, stockUnit: "case_12" },
        { productName: "Coca Cola", size: "2L", category: "SOFTDRINKS", price: 85, stockQuantity: 0, stockUnit: "case_6" },
        { productName: "Coke Zero", size: "330ml", category: "SOFTDRINKS", price: 35, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Coke Zero", size: "500ml", category: "SOFTDRINKS", price: 45, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Coke Zero", size: "1.5L", category: "SOFTDRINKS", price: 75, stockQuantity: 0, stockUnit: "case_12" },
        { productName: "Sprite", size: "330ml", category: "SOFTDRINKS", price: 30, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Sprite", size: "500ml", category: "SOFTDRINKS", price: 40, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Sprite", size: "1.5L", category: "SOFTDRINKS", price: 70, stockQuantity: 0, stockUnit: "case_12" },
        { productName: "Fanta Orange", size: "330ml", category: "SOFTDRINKS", price: 30, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Fanta Orange", size: "500ml", category: "SOFTDRINKS", price: 40, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Fanta Orange", size: "1.5L", category: "SOFTDRINKS", price: 70, stockQuantity: 0, stockUnit: "case_12" },
        { productName: "Royal", size: "330ml", category: "SOFTDRINKS", price: 30, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Royal", size: "500ml", category: "SOFTDRINKS", price: 40, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Wilkins", size: "330ml", category: "WATER", price: 20, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Wilkins", size: "500ml", category: "WATER", price: 25, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Wilkins", size: "1L", category: "WATER", price: 40, stockQuantity: 0, stockUnit: "case_12" },
        { productName: "Wilkins", size: "1.5L", category: "WATER", price: 55, stockQuantity: 0, stockUnit: "case_12" },
      ],
    },
    {
      name: "Asia Brewery",
      contactNo: "+639000000004",
      address: "",
      agentName: "",
      lastOrdered: 0,
      status: "ACTIVE",
      products: [
        { productName: "Cobra", size: "330ml", category: "ENERGY_DRINK", price: 40, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Cobra", size: "500ml", category: "ENERGY_DRINK", price: 55, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "VitaMilk", size: "237ml", category: "OTHER", price: 25, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "VitaMilk", size: "250ml", category: "OTHER", price: 30, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Colt 45", size: "330ml", category: "BEER", price: 45, stockQuantity: 0, stockUnit: "case_24" },
      ],
    },
    {
      name: "Pepsi",
      contactNo: "+639000000005",
      address: "",
      agentName: "",
      lastOrdered: 0,
      status: "ACTIVE",
      products: [
        { productName: "Gatorade", size: "500ml", category: "OTHER", price: 45, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "Gatorade", size: "1L", category: "OTHER", price: 70, stockQuantity: 0, stockUnit: "case_12" },
        { productName: "VitaMilk", size: "237ml", category: "OTHER", price: 25, stockQuantity: 0, stockUnit: "case_24" },
        { productName: "VitaMilk", size: "250ml", category: "OTHER", price: 30, stockQuantity: 0, stockUnit: "case_24" },
      ],
    },
  ];

  for (const sup of suppliersToCreate) {
    const key = sup.name.toLowerCase();

    // Create supplier if not exists
    let supplierId = supplierMap[key];
    if (supplierId) {
      console.log(`✅ Supplier already exists: ${sup.name} (${supplierId})`);
    } else {
      console.log(`🏭 Creating supplier: ${sup.name}...`);
      const result = await createSupplier(token, {
        supplierName: sup.name,
        contactNo: sup.contactNo,
        address: sup.address,
        agentName: sup.agentName,
        lastOrdered: sup.lastOrdered,
        status: sup.status,
      });
      supplierId = result.id;
      if (supplierId) {
        console.log(`✅ Created supplier: ${sup.name} (${supplierId})`);
        supplierMap[key] = supplierId;
      } else {
        console.error(`❌ Failed to create supplier: ${sup.name}`, result);
        continue;
      }
    }

    // Create products
    for (const prod of sup.products) {
      const productKey = `${prod.productName.toLowerCase()}|${supplierId}`;
      if (existingProductNames.has(productKey)) {
        console.log(`  ✅ Product already exists: ${prod.productName} ${prod.size}`);
        continue;
      }

      console.log(`  📦 Creating product: ${prod.productName} ${prod.size}...`);
      const result = await createProduct(token, {
        productName: prod.productName,
        size: prod.size,
        price: prod.price,
        category: prod.category,
        stockQuantity: prod.stockQuantity,
        stockUnit: prod.stockUnit,
        supplierId: supplierId,
        status: "ACTIVE",
        image: null,
      });
      if (result.id) {
        console.log(`  ✅ Created: ${prod.productName} ${prod.size} (${result.id})`);
        existingProductNames.add(productKey);
      } else {
        console.error(`  ❌ Failed to create product: ${prod.productName} ${prod.size}`, result);
      }
    }
  }

  console.log("\n🎉 Done! All suppliers and products have been seeded.");
}

main().catch(console.error);
