import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed for StockDesk...");

  // SQLite PRAGMA initialization
  await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");

  // Clear existing data (in dependency order)
  console.log("Cleaning old records...");
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.serialNumber.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.productRetailer.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.retailer.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.setting.deleteMany({});

  // 1. Seed Users
  console.log("Creating default users (Admin, Manager, Staff)...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  const managerPassword = await bcrypt.hash("manager123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  const adminUser = await prisma.user.create({
    data: {
      name: "Ramesh Sharma",
      email: "admin@stockdesk.local",
      passwordHash: adminPassword,
      role: "ADMIN",
      active: true,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      name: "Priya Patel",
      email: "manager@stockdesk.local",
      passwordHash: managerPassword,
      role: "MANAGER",
      active: true,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      name: "Vikram Singh",
      email: "staff@stockdesk.local",
      passwordHash: staffPassword,
      role: "STAFF",
      active: true,
    },
  });

  // 2. Seed Settings
  console.log("Configuring shop settings...");
  const defaultSettings = [
    { key: "shop_name", value: "StockDesk Computer Peripherals" },
    { key: "shop_tagline", value: "Wholesale & Retail Peripherals Hub" },
    { key: "shop_address", value: "Shop #14, IT Plaza, Commercial Street" },
    { key: "shop_city", value: "Bengaluru, Karnataka 560001" },
    { key: "shop_gstin", value: "29ABCDE1234F1Z5" },
    { key: "shop_phone", value: "+91 80 4123 4567" },
    { key: "shop_email", value: "billing@stockdesk.local" },
    { key: "owner_email", value: "owner@stockdesk.local" },
    { key: "default_gst_rate", value: "18" },
    { key: "default_reorder_level", value: "5" },
    { key: "daily_digest_hour", value: "9" },
    { key: "last_backup_at", value: new Date().toISOString() },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.create({ data: s });
  }

  // 3. Seed Categories (8 categories)
  console.log("Creating 8 peripheral categories...");
  const categoriesData = [
    { name: "Keyboards", slug: "keyboards", defaultReorderLevel: 6, defaultGstRate: 18, description: "Mechanical, wireless, and standard office USB keyboards" },
    { name: "Mice & Pointers", slug: "mice-pointers", defaultReorderLevel: 8, defaultGstRate: 18, description: "Ergonomic, gaming, and wireless optical mice" },
    { name: "Monitors & Displays", slug: "monitors-displays", defaultReorderLevel: 3, defaultGstRate: 18, description: "IPS, 144Hz+, curved, and business 4K monitors" },
    { name: "Headsets & Audio", slug: "headsets-audio", defaultReorderLevel: 5, defaultGstRate: 18, description: "USB call-center headsets, gaming 7.1 headphones, and speakers" },
    { name: "Webcams & Streaming", slug: "webcams-streaming", defaultReorderLevel: 4, defaultGstRate: 18, description: "FHD and 4K conferencing and live streaming webcams" },
    { name: "Printers & Scanners", slug: "printers-scanners", defaultReorderLevel: 2, defaultGstRate: 18, description: "LaserJet and ink-tank multifunction printers and barcode scanners" },
    { name: "Storage & SSDs", slug: "storage-ssds", defaultReorderLevel: 6, defaultGstRate: 18, description: "NVMe M.2 SSDs, 2.5 SATA drives, and OTG pen drives" },
    { name: "Networking & Cables", slug: "networking-cables", defaultReorderLevel: 10, defaultGstRate: 18, description: "Wi-Fi routers, Cat6 cables, HDMI/DisplayPort cords, and USB-C docks" },
  ];

  const categoriesMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const created = await prisma.category.create({ data: cat });
    categoriesMap.set(cat.slug, created.id);
  }

  // 4. Seed Brands
  console.log("Creating peripheral brands...");
  const brandNames = [
    "Logitech", "Dell", "HP", "Samsung", "Kingston",
    "TP-Link", "Corsair", "SanDisk", "Zebronics", "Crucial",
    "Redragon", "Canon", "Epson"
  ];
  const brandsMap = new Map<string, string>();
  for (const b of brandNames) {
    const created = await prisma.brand.create({ data: { name: b } });
    brandsMap.set(b, created.id);
  }

  // 5. Seed Retailers (6 authentic Indian distributors)
  console.log("Creating 6 wholesale retailers & distributors...");
  const retailersData = [
    {
      name: "Infotech Distribution Pvt Ltd",
      contactPerson: "Rajesh Gupta",
      phone: "+91 98201 12345",
      altPhone: "+91 98201 54321",
      email: "sales@infotechdist.in",
      address: "104, Lamington Road, Grant Road East",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400007",
      gstin: "27AABCI1234A1Z5",
      paymentTerms: "Net 30",
      notes: "Authorized Logitech and Kingston distributor. Direct warranty RMA center.",
      rating: 5,
    },
    {
      name: "Apex Peripherals & Components",
      contactPerson: "Sanjay Verma",
      phone: "+91 98110 98765",
      altPhone: "+91 98110 98766",
      email: "orders@apexperipherals.com",
      address: "205-207, Nehru Place Market",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110019",
      gstin: "07AAACA9876B1ZQ",
      paymentTerms: "Net 15",
      notes: "Largest stock of Samsung and Dell monitors. Quick delivery in 48 hours.",
      rating: 5,
    },
    {
      name: "Silicon Electronics Wholesale",
      contactPerson: "Anand Murthy",
      phone: "+91 98450 33445",
      altPhone: "+91 98450 33446",
      email: "supply@siliconelec.co.in",
      address: "42/1 SP Road, City Market",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560002",
      gstin: "29AABCS5566C1ZH",
      paymentTerms: "Net 21",
      notes: "Local partner for networking gear, TP-Link, and ethernet bulk rolls.",
      rating: 4,
    },
    {
      name: "Eastern IT Traders",
      contactPerson: "Debashis Roy",
      phone: "+91 98300 44556",
      altPhone: "+91 98300 44557",
      email: "supply@easternittraders.in",
      address: "E-Mall, 4th Floor, Chandni Chowk",
      city: "Kolkata",
      state: "West Bengal",
      pincode: "700072",
      gstin: "19AAACE3344D1Z2",
      paymentTerms: "Net 30",
      notes: "Supplies SanDisk, Crucial storage, and HP consumables.",
      rating: 4,
    },
    {
      name: "Prime Comps Hub",
      contactPerson: "Mohan Lal",
      phone: "+91 98401 77889",
      altPhone: "+91 98401 77890",
      email: "sales@primecomps.com",
      address: "Ritchie Street, Mount Road",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600002",
      gstin: "33AAACP4455E1ZO",
      paymentTerms: "Net 15",
      notes: "Specialist in gaming gear: Corsair, Redragon, and RGB headsets.",
      rating: 5,
    },
    {
      name: "Global Micro Systems",
      contactPerson: "Harshwardhan Rao",
      phone: "+91 99890 22334",
      altPhone: "+91 99890 22335",
      email: "billing@globalmicrosys.in",
      address: "Chenoy Trade Centre, Parklane",
      city: "Secunderabad",
      state: "Telangana",
      pincode: "500003",
      gstin: "36AAACG1122F1ZK",
      paymentTerms: "Cash on Delivery",
      notes: "Canon and Epson printers, replacement ink cartridges, and barcode readers.",
      rating: 4,
    },
  ];

  const retailers: any[] = [];
  for (const r of retailersData) {
    const created = await prisma.retailer.create({ data: r });
    retailers.push(created);
  }

  // 6. Seed 42 Computer Peripheral Products
  console.log("Seeding 42 computer peripheral products...");
  const productsRaw = [
    // Keyboards
    {
      name: "Logitech K120 USB Wired Keyboard",
      brand: "Logitech",
      model: "K120",
      sku: "LOG-KB-K120",
      barcode: "097855065551",
      categorySlug: "keyboards",
      quantity: 18,
      minReorderLevel: 5,
      purchasePricePaise: 42500, // ₹425.00
      sellingPricePaise: 59900,  // ₹599.00
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Rack A-01",
      retailerIndex: 0,
    },
    {
      name: "Logitech MX Keys Advanced Wireless Keyboard",
      brand: "Logitech",
      model: "MX Keys",
      sku: "LOG-KB-MXKEYS",
      barcode: "097855149817",
      categorySlug: "keyboards",
      quantity: 4,
      minReorderLevel: 3,
      purchasePricePaise: 799900, // ₹7,999.00
      sellingPricePaise: 999500,  // ₹9,995.00
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Showcase A",
      retailerIndex: 0,
    },
    {
      name: "Dell KB216 Wired Multimedia Keyboard",
      brand: "Dell",
      model: "KB216",
      sku: "DEL-KB-216",
      barcode: "884116172605",
      categorySlug: "keyboards",
      quantity: 2, // LOW STOCK!
      minReorderLevel: 5,
      purchasePricePaise: 47000,
      sellingPricePaise: 64900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Rack A-02",
      retailerIndex: 1,
    },
    {
      name: "HP 150 Wired Keyboard with NumPad",
      brand: "HP",
      model: "HP150",
      sku: "HP-KB-150",
      barcode: "195908381923",
      categorySlug: "keyboards",
      quantity: 12,
      minReorderLevel: 4,
      purchasePricePaise: 44000,
      sellingPricePaise: 59900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Rack A-03",
      retailerIndex: 3,
    },
    {
      name: "Corsair K55 RGB PRO Gaming Keyboard",
      brand: "Corsair",
      model: "K55 PRO",
      sku: "COR-KB-K55P",
      barcode: "840006631897",
      categorySlug: "keyboards",
      quantity: 6,
      minReorderLevel: 3,
      purchasePricePaise: 315000,
      sellingPricePaise: 399900,
      gstRate: 18,
      warrantyMonths: 24,
      rackLocation: "Rack A-04",
      retailerIndex: 4,
    },
    {
      name: "Redragon K552 Kumara Mechanical Keyboard",
      brand: "Redragon",
      model: "K552",
      sku: "RED-KB-552",
      barcode: "695037670412",
      categorySlug: "keyboards",
      quantity: 0, // OUT OF STOCK!
      minReorderLevel: 4,
      purchasePricePaise: 210000,
      sellingPricePaise: 279900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Rack A-05",
      retailerIndex: 4,
    },

    // Mice
    {
      name: "Logitech B100 Optical USB Mouse",
      brand: "Logitech",
      model: "B100",
      sku: "LOG-MS-B100",
      barcode: "097855060440",
      categorySlug: "mice-pointers",
      quantity: 35,
      minReorderLevel: 10,
      purchasePricePaise: 21000,
      sellingPricePaise: 29900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Rack B-01",
      retailerIndex: 0,
    },
    {
      name: "Logitech MX Master 3S Wireless Mouse",
      brand: "Logitech",
      model: "MX Master 3S",
      sku: "LOG-MS-MXM3S",
      barcode: "097855174093",
      categorySlug: "mice-pointers",
      quantity: 5,
      minReorderLevel: 3,
      purchasePricePaise: 720000,
      sellingPricePaise: 899500,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Showcase B",
      retailerIndex: 0,
    },
    {
      name: "Dell MS116 Optical Wired Mouse",
      brand: "Dell",
      model: "MS116",
      sku: "DEL-MS-116",
      barcode: "884116172643",
      categorySlug: "mice-pointers",
      quantity: 24,
      minReorderLevel: 10,
      purchasePricePaise: 22000,
      sellingPricePaise: 32000,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Rack B-02",
      retailerIndex: 1,
    },
    {
      name: "HP 200 Wireless Optical Mouse",
      brand: "HP",
      model: "HP 200",
      sku: "HP-MS-200",
      barcode: "190780829828",
      categorySlug: "mice-pointers",
      quantity: 15,
      minReorderLevel: 5,
      purchasePricePaise: 46000,
      sellingPricePaise: 64900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Rack B-03",
      retailerIndex: 3,
    },
    {
      name: "Corsair Harpoon PRO RGB Gaming Mouse",
      brand: "Corsair",
      model: "Harpoon PRO",
      sku: "COR-MS-HARP",
      barcode: "840006606888",
      categorySlug: "mice-pointers",
      quantity: 7,
      minReorderLevel: 4,
      purchasePricePaise: 135000,
      sellingPricePaise: 179900,
      gstRate: 18,
      warrantyMonths: 24,
      rackLocation: "Rack B-04",
      retailerIndex: 4,
    },
    {
      name: "Zebronics Zeb-Alex Wired USB Mouse",
      brand: "Zebronics",
      model: "Zeb-Alex",
      sku: "ZEB-MS-ALEX",
      barcode: "890426380123",
      categorySlug: "mice-pointers",
      quantity: 40,
      minReorderLevel: 15,
      purchasePricePaise: 9900,
      sellingPricePaise: 16900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Rack B-05",
      retailerIndex: 2,
    },

    // Monitors
    {
      name: "Dell 24 Inch Full HD IPS Monitor (S2421HN)",
      brand: "Dell",
      model: "S2421HN",
      sku: "DEL-MN-2421",
      barcode: "884116375082",
      categorySlug: "monitors-displays",
      quantity: 7,
      minReorderLevel: 3,
      purchasePricePaise: 920000,
      sellingPricePaise: 1149900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Display Shelf 1",
      retailerIndex: 1,
    },
    {
      name: "Samsung 27 Inch Curved Gaming Monitor (CR50)",
      brand: "Samsung",
      model: "LC27R500FHWXXL",
      sku: "SAM-MN-27CR50",
      barcode: "880609015842",
      categorySlug: "monitors-displays",
      quantity: 1, // LOW STOCK!
      minReorderLevel: 3,
      purchasePricePaise: 1190000,
      sellingPricePaise: 1449900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Display Shelf 2",
      retailerIndex: 1,
    },
    {
      name: "HP M27f 27-inch FHD IPS Micro-Edge Monitor",
      brand: "HP",
      model: "M27f",
      sku: "HP-MN-M27F",
      barcode: "195697669527",
      categorySlug: "monitors-displays",
      quantity: 4,
      minReorderLevel: 2,
      purchasePricePaise: 1120000,
      sellingPricePaise: 1369900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Display Shelf 3",
      retailerIndex: 3,
    },
    {
      name: "Zebronics 19-inch LED Monitor (ZEB-A19)",
      brand: "Zebronics",
      model: "ZEB-A19",
      sku: "ZEB-MN-A19",
      barcode: "890426381452",
      categorySlug: "monitors-displays",
      quantity: 9,
      minReorderLevel: 4,
      purchasePricePaise: 340000,
      sellingPricePaise: 449900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Display Shelf 4",
      retailerIndex: 2,
    },
    {
      name: "Dell 32 Inch 4K UHD Curved Monitor (S3221QS)",
      brand: "Dell",
      model: "S3221QS",
      sku: "DEL-MN-3221",
      barcode: "884116375105",
      categorySlug: "monitors-displays",
      quantity: 2,
      minReorderLevel: 2,
      purchasePricePaise: 2950000,
      sellingPricePaise: 3599900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Premium Bay",
      retailerIndex: 1,
    },

    // Headsets
    {
      name: "Logitech H111 Stereo Headset with Mic",
      brand: "Logitech",
      model: "H111",
      sku: "LOG-HS-H111",
      barcode: "097855113061",
      categorySlug: "headsets-audio",
      quantity: 22,
      minReorderLevel: 8,
      purchasePricePaise: 61000,
      sellingPricePaise: 79900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Rack C-01",
      retailerIndex: 0,
    },
    {
      name: "Corsair HS55 SURROUND Gaming Headset",
      brand: "Corsair",
      model: "HS55",
      sku: "COR-HS-HS55",
      barcode: "840006653240",
      categorySlug: "headsets-audio",
      quantity: 5,
      minReorderLevel: 3,
      purchasePricePaise: 420000,
      sellingPricePaise: 549900,
      gstRate: 18,
      warrantyMonths: 24,
      rackLocation: "Rack C-02",
      retailerIndex: 4,
    },
    {
      name: "Zebronics Zeb-Rush Wired Headphone with Mic",
      brand: "Zebronics",
      model: "Zeb-Rush",
      sku: "ZEB-HS-RUSH",
      barcode: "890426382109",
      categorySlug: "headsets-audio",
      quantity: 16,
      minReorderLevel: 6,
      purchasePricePaise: 68000,
      sellingPricePaise: 99900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Rack C-03",
      retailerIndex: 2,
    },
    {
      name: "Dell Pro Stereo Headset WH3022",
      brand: "Dell",
      model: "WH3022",
      sku: "DEL-HS-3022",
      barcode: "884116382899",
      categorySlug: "headsets-audio",
      quantity: 8,
      minReorderLevel: 4,
      purchasePricePaise: 290000,
      sellingPricePaise: 389900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Rack C-04",
      retailerIndex: 1,
    },
    {
      name: "HP DHE-8005 LED Lighting Gaming Headset",
      brand: "HP",
      model: "DHE-8005",
      sku: "HP-HS-8005",
      barcode: "697243171098",
      categorySlug: "headsets-audio",
      quantity: 11,
      minReorderLevel: 5,
      purchasePricePaise: 89000,
      sellingPricePaise: 129900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Rack C-05",
      retailerIndex: 3,
    },

    // Webcams
    {
      name: "Logitech C270 HD 720p Webcam",
      brand: "Logitech",
      model: "C270",
      sku: "LOG-WC-C270",
      barcode: "097855070739",
      categorySlug: "webcams-streaming",
      quantity: 14,
      minReorderLevel: 5,
      purchasePricePaise: 175000,
      sellingPricePaise: 229500,
      gstRate: 18,
      warrantyMonths: 24,
      rackLocation: "Rack D-01",
      retailerIndex: 0,
    },
    {
      name: "Logitech Brio 4K Ultra HD Pro Webcam",
      brand: "Logitech",
      model: "Brio 4K",
      sku: "LOG-WC-BRIO",
      barcode: "097855125613",
      categorySlug: "webcams-streaming",
      quantity: 3,
      minReorderLevel: 2,
      purchasePricePaise: 1450000,
      sellingPricePaise: 1799500,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Showcase C",
      retailerIndex: 0,
    },
    {
      name: "HP w100 720p HD Webcam with Built-in Mic",
      brand: "HP",
      model: "w100",
      sku: "HP-WC-W100",
      barcode: "194850893012",
      categorySlug: "webcams-streaming",
      quantity: 9,
      minReorderLevel: 4,
      purchasePricePaise: 89000,
      sellingPricePaise: 124900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Rack D-02",
      retailerIndex: 3,
    },
    {
      name: "Zebronics Zeb-Ultimate Pro 1080p Webcam",
      brand: "Zebronics",
      model: "Zeb-Ultimate Pro",
      sku: "ZEB-WC-ULT",
      barcode: "890426383321",
      categorySlug: "webcams-streaming",
      quantity: 2, // LOW STOCK!
      minReorderLevel: 4,
      purchasePricePaise: 135000,
      sellingPricePaise: 189900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Rack D-03",
      retailerIndex: 2,
    },
    {
      name: "Dell UltraSharp 4K Webcam (WB7022)",
      brand: "Dell",
      model: "WB7022",
      sku: "DEL-WC-7022",
      barcode: "884116391020",
      categorySlug: "webcams-streaming",
      quantity: 3,
      minReorderLevel: 2,
      purchasePricePaise: 1520000,
      sellingPricePaise: 1899900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Showcase C",
      retailerIndex: 1,
    },

    // Printers & Scanners
    {
      name: "Canon PIXMA G3010 All-in-One Ink Tank Printer",
      brand: "Canon",
      model: "G3010",
      sku: "CAN-PR-G3010",
      barcode: "4549292095914",
      categorySlug: "printers-scanners",
      quantity: 5,
      minReorderLevel: 2,
      purchasePricePaise: 1120000,
      sellingPricePaise: 1349900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Printer Section 1",
      retailerIndex: 5,
    },
    {
      name: "HP DeskJet Ink Advantage 2776 All-in-One",
      brand: "HP",
      model: "2776",
      sku: "HP-PR-2776",
      barcode: "194850892211",
      categorySlug: "printers-scanners",
      quantity: 6,
      minReorderLevel: 2,
      purchasePricePaise: 495000,
      sellingPricePaise: 619900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Printer Section 2",
      retailerIndex: 3,
    },
    {
      name: "HP LaserJet M1005 Multifunction Laser Printer",
      brand: "HP",
      model: "M1005",
      sku: "HP-PR-M1005",
      barcode: "0882780447385",
      categorySlug: "printers-scanners",
      quantity: 3,
      minReorderLevel: 2,
      purchasePricePaise: 1980000,
      sellingPricePaise: 2350000,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Printer Section 3",
      retailerIndex: 3,
    },
    {
      name: "Canon imageCLASS LBP2900B Single Function Laser Printer",
      brand: "Canon",
      model: "LBP2900B",
      sku: "CAN-PR-2900B",
      barcode: "4960999324081",
      categorySlug: "printers-scanners",
      quantity: 4,
      minReorderLevel: 2,
      purchasePricePaise: 1320000,
      sellingPricePaise: 1549900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Printer Section 4",
      retailerIndex: 5,
    },
    {
      name: "Epson EcoTank L3210 All-in-One Ink Tank Printer",
      brand: "Epson",
      model: "L3210",
      sku: "EPS-PR-L3210",
      barcode: "8715946683881",
      categorySlug: "printers-scanners",
      quantity: 5,
      minReorderLevel: 2,
      purchasePricePaise: 1140000,
      sellingPricePaise: 1329900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Printer Section 5",
      retailerIndex: 5,
    },

    // Storage & SSDs
    {
      name: "Kingston A400 240GB 2.5 Inch SATA SSD",
      brand: "Kingston",
      model: "SA400S37/240G",
      sku: "KNG-SSD-A400-240",
      barcode: "740617261218",
      categorySlug: "storage-ssds",
      quantity: 26,
      minReorderLevel: 8,
      purchasePricePaise: 145000,
      sellingPricePaise: 189900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Storage Vault A",
      retailerIndex: 0,
    },
    {
      name: "Kingston NV2 1TB M.2 2280 NVMe SSD",
      brand: "Kingston",
      model: "SNV2S/1000G",
      sku: "KNG-SSD-NV2-1TB",
      barcode: "740617329918",
      categorySlug: "storage-ssds",
      quantity: 15,
      minReorderLevel: 5,
      purchasePricePaise: 440000,
      sellingPricePaise: 549900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Storage Vault B",
      retailerIndex: 0,
    },
    {
      name: "Samsung 980 500GB PCIe 3.0 M.2 NVMe SSD",
      brand: "Samsung",
      model: "MZ-V8V500BW",
      sku: "SAM-SSD-980-500",
      barcode: "8806090572210",
      categorySlug: "storage-ssds",
      quantity: 8,
      minReorderLevel: 4,
      purchasePricePaise: 380000,
      sellingPricePaise: 479900,
      gstRate: 18,
      warrantyMonths: 60,
      rackLocation: "Storage Vault B",
      retailerIndex: 1,
    },
    {
      name: "Crucial BX500 480GB 3D NAND SATA SSD",
      brand: "Crucial",
      model: "CT480BX500SSD1",
      sku: "CRU-SSD-BX480",
      barcode: "649528787330",
      categorySlug: "storage-ssds",
      quantity: 12,
      minReorderLevel: 5,
      purchasePricePaise: 245000,
      sellingPricePaise: 319900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Storage Vault A",
      retailerIndex: 3,
    },
    {
      name: "SanDisk Ultra Dual Drive Luxe 64GB Type-C",
      brand: "SanDisk",
      model: "SDDDC4-064G-G46",
      sku: "SND-PD-LUXE-64",
      barcode: "619659178949",
      categorySlug: "storage-ssds",
      quantity: 30,
      minReorderLevel: 10,
      purchasePricePaise: 65000,
      sellingPricePaise: 89900,
      gstRate: 18,
      warrantyMonths: 60,
      rackLocation: "Storage Counter",
      retailerIndex: 3,
    },
    {
      name: "SanDisk Cruzer Blade 32GB USB 2.0 Flash Drive",
      brand: "SanDisk",
      model: "SDCZ50-032G-B35",
      sku: "SND-PD-BLADE-32",
      barcode: "619659069193",
      categorySlug: "storage-ssds",
      quantity: 45,
      minReorderLevel: 15,
      purchasePricePaise: 24000,
      sellingPricePaise: 34900,
      gstRate: 18,
      warrantyMonths: 24,
      rackLocation: "Storage Counter",
      retailerIndex: 3,
    },
    {
      name: "Kingston DataTraveler Exodia 128GB USB 3.2",
      brand: "Kingston",
      model: "DTX/128GB",
      sku: "KNG-PD-DTX-128",
      barcode: "740617309972",
      categorySlug: "storage-ssds",
      quantity: 20,
      minReorderLevel: 8,
      purchasePricePaise: 82000,
      sellingPricePaise: 114900,
      gstRate: 18,
      warrantyMonths: 60,
      rackLocation: "Storage Counter",
      retailerIndex: 0,
    },

    // Networking & Cables
    {
      name: "TP-Link Archer C6 AC1200 Gigabit Wi-Fi Router",
      brand: "TP-Link",
      model: "Archer C6",
      sku: "TPL-RT-C6",
      barcode: "6935364084271",
      categorySlug: "networking-cables",
      quantity: 11,
      minReorderLevel: 4,
      purchasePricePaise: 215000,
      sellingPricePaise: 269900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Net Bay 1",
      retailerIndex: 2,
    },
    {
      name: "TP-Link TL-WR845N 300Mbps Wireless N Router",
      brand: "TP-Link",
      model: "TL-WR845N",
      sku: "TPL-RT-845N",
      barcode: "6935364094195",
      categorySlug: "networking-cables",
      quantity: 14,
      minReorderLevel: 5,
      purchasePricePaise: 98000,
      sellingPricePaise: 129900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Net Bay 2",
      retailerIndex: 2,
    },
    {
      name: "TP-Link Archer T3U Plus AC1300 USB Wi-Fi Adapter",
      brand: "TP-Link",
      model: "Archer T3U Plus",
      sku: "TPL-WF-T3UPLS",
      barcode: "6935364053383",
      categorySlug: "networking-cables",
      quantity: 16,
      minReorderLevel: 6,
      purchasePricePaise: 115000,
      sellingPricePaise: 149900,
      gstRate: 18,
      warrantyMonths: 36,
      rackLocation: "Net Bay 3",
      retailerIndex: 2,
    },
    {
      name: "Zebronics Zeb-Kabel Cat6 RJ45 Patch Cord (10 Meters)",
      brand: "Zebronics",
      model: "Zeb-Kabel 10M",
      sku: "ZEB-CB-CAT6-10",
      barcode: "890426384401",
      categorySlug: "networking-cables",
      quantity: 28,
      minReorderLevel: 10,
      purchasePricePaise: 16000,
      sellingPricePaise: 29900,
      gstRate: 18,
      warrantyMonths: 6,
      rackLocation: "Cable Bin 1",
      retailerIndex: 2,
    },
    {
      name: "Dell USB-C to HDMI/VGA Multi-Port Adapter",
      brand: "Dell",
      model: "DA300",
      sku: "DEL-AD-DA300",
      barcode: "884116283929",
      categorySlug: "networking-cables",
      quantity: 5,
      minReorderLevel: 2,
      purchasePricePaise: 380000,
      sellingPricePaise: 499900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Cable Bin 2",
      retailerIndex: 1,
    },
    {
      name: "HP High Speed HDMI 2.0 Cable 1.8m",
      brand: "HP",
      model: "DHC-HD01-1.8M",
      sku: "HP-CB-HDMI-18",
      barcode: "193015560124",
      categorySlug: "networking-cables",
      quantity: 32,
      minReorderLevel: 12,
      purchasePricePaise: 18500,
      sellingPricePaise: 34900,
      gstRate: 18,
      warrantyMonths: 12,
      rackLocation: "Cable Bin 3",
      retailerIndex: 3,
    },
  ];

  let totalProducts = 0;
  for (const p of productsRaw) {
    const brandId = brandsMap.get(p.brand)!;
    const categoryId = categoriesMap.get(p.categorySlug)!;
    const retailer = retailers[p.retailerIndex];

    const isLow = p.quantity <= p.minReorderLevel;

    const createdProduct = await prisma.product.create({
      data: {
        name: p.name,
        brandId,
        model: p.model,
        sku: p.sku,
        barcode: p.barcode,
        categoryId,
        quantity: p.quantity,
        minReorderLevel: p.minReorderLevel,
        purchasePricePaise: p.purchasePricePaise,
        sellingPricePaise: p.sellingPricePaise,
        gstRate: p.gstRate,
        warrantyMonths: p.warrantyMonths,
        rackLocation: p.rackLocation,
        invoiceNo: "INV-SEED-2026-001",
        purchaseDate: new Date("2026-10-15T10:00:00.000Z"),
        alertArmed: !isLow, // if low already, alert has fired
        version: 1,
      },
    });

    // Link Primary Retailer
    await prisma.productRetailer.create({
      data: {
        productId: createdProduct.id,
        retailerId: retailer.id,
        lastPurchasePricePaise: p.purchasePricePaise,
        lastPurchaseDate: new Date("2026-10-15T10:00:00.000Z"),
        retailerSku: `${retailer.name.substring(0, 3).toUpperCase()}-${p.sku}`,
        isPrimary: true,
      },
    });

    // Link a secondary retailer for some products (e.g. keyboards, mice, storage)
    if (p.retailerIndex !== 0 && (p.categorySlug === "storage-ssds" || p.categorySlug === "keyboards")) {
      await prisma.productRetailer.create({
        data: {
          productId: createdProduct.id,
          retailerId: retailers[0].id,
          lastPurchasePricePaise: Math.round(p.purchasePricePaise * 1.03),
          lastPurchaseDate: new Date("2026-09-01T10:00:00.000Z"),
          retailerSku: `INF-${p.sku}`,
          isPrimary: false,
        },
      });
    }

    // Initial Stock Movement (PURCHASE)
    await prisma.stockMovement.create({
      data: {
        productId: createdProduct.id,
        userId: adminUser.id,
        type: "PURCHASE",
        quantityChange: p.quantity,
        previousQuantity: 0,
        newQuantity: p.quantity,
        unitPricePaise: p.purchasePricePaise,
        referenceType: "INVOICE",
        referenceId: "INV-SEED-2026-001",
        reason: "Initial warehouse stocking from " + retailer.name,
        createdAt: new Date("2026-10-15T10:00:00.000Z"),
      },
    });

    // If product is low or out of stock, generate the in-app notification
    if (p.quantity === 0) {
      await prisma.notification.create({
        data: {
          type: "OUT_OF_STOCK",
          title: `Out of Stock: ${p.name}`,
          message: `${p.name} (SKU: ${p.sku}) is completely out of stock. Supplier: ${retailer.name} (${retailer.phone}).`,
          productId: createdProduct.id,
          isRead: false,
        },
      });
    } else if (p.quantity <= p.minReorderLevel) {
      await prisma.notification.create({
        data: {
          type: "LOW_STOCK",
          title: `Low Stock Alert: ${p.name}`,
          message: `${p.name} (SKU: ${p.sku}) has only ${p.quantity} units left (reorder level: ${p.minReorderLevel}). Supplier: ${retailer.name} (${retailer.phone}).`,
          productId: createdProduct.id,
          isRead: false,
        },
      });
    }

    // Sample serial numbers for high value items (monitors, SSDs, printers)
    if (p.categorySlug === "monitors-displays" || p.categorySlug === "storage-ssds" || p.categorySlug === "printers-scanners") {
      const serialCount = Math.min(p.quantity, 3);
      for (let s = 1; s <= serialCount; s++) {
        await prisma.serialNumber.create({
          data: {
            productId: createdProduct.id,
            serialNumber: `SN-${p.sku}-${1000 + s}`,
            status: "IN_STOCK",
            notes: `Verified factory sealed unit #${s}`,
          },
        });
      }
    }

    totalProducts++;
  }

  // 7. Seed Sample Purchase Order
  console.log("Creating sample Purchase Order...");
  const samplePO = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-001",
      retailerId: retailers[1].id, // Apex Peripherals
      status: "SENT",
      totalPaise: 4830000,
      notes: "Urgent restocking for monitors and keyboards",
      expectedDate: new Date("2026-11-28T18:00:00.000Z"),
      orderDate: new Date(),
    },
  });

  // Link low-stock Dell products to this PO
  const dellMonitor = await prisma.product.findUnique({ where: { sku: "DEL-MN-2421" } });
  const dellKb = await prisma.product.findUnique({ where: { sku: "DEL-KB-216" } });

  if (dellMonitor) {
    await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: samplePO.id,
        productId: dellMonitor.id,
        orderedQty: 5,
        receivedQty: 0,
        unitPricePaise: dellMonitor.purchasePricePaise,
        gstRate: dellMonitor.gstRate,
      },
    });
  }

  if (dellKb) {
    await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: samplePO.id,
        productId: dellKb.id,
        orderedQty: 10,
        receivedQty: 0,
        unitPricePaise: dellKb.purchasePricePaise,
        gstRate: dellKb.gstRate,
      },
    });
  }

  // 8. Log initial audit entry
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: "SEED_INIT",
      entity: "SYSTEM",
      entityId: "SYSTEM_01",
      details: `Initialized database with ${totalProducts} peripherals, 8 categories, 6 retailers, and default roles.`,
      ipAddress: "127.0.0.1",
    },
  });

  console.log(`✅ Seed finished successfully! Seeded ${totalProducts} products, 3 users, 6 retailers.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
