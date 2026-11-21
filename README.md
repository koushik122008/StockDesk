# StockDesk - Computer Peripherals Inventory System

StockDesk is a fast, web-based inventory management system purpose-built for a **Computer Peripherals & Components** retail & wholesale business (keyboards, mice, monitors, headsets, webcams, printers, cables, pen drives, SSDs, and routers).

It replaces manual notebooks and fragmented Excel sheets with instant barcode scanning, strict double-entry stock movement tracking, automated low-stock reorder alerts, and complete distributor management.

Designed to run on **one host PC** in the shop/office, StockDesk enables all counter staff and warehouse mobile devices to connect simultaneously over the office Wi-Fi/LAN at `0.0.0.0:3000`.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run Prisma migrations (creates SQLite at ./data/stockdesk.db)
npx prisma migrate dev

# 3. Seed 45+ peripheral products, 8 categories, 6 distributors, and 3 user accounts
npm run seed

# 4. Start production/dev server bound to all local network interfaces
npm run dev
```

The application will be live at:
- **Local Host:** `http://localhost:3000`
- **Office LAN:** `http://<HOST_IP>:3000` (e.g. `http://192.168.1.100:3000`)

---

## 👥 Default Login Accounts

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@stockdesk.local` | `admin123` | Full access, Database Restore, Settings, User & Role management |
| **Manager** | `manager@stockdesk.local` | `manager123` | Stock Entry, PO generation, Distributor management, Print Reports |
| **Staff** | `staff@stockdesk.local` | `staff123` | Counter sales, Barcode lookup, Stock adjustments |

---

## 🏗️ Key Architecture & Data Invariants

1. **Local SQLite File Storage (`./data/stockdesk.db`):**
   - No cloud database, no external telemetry or SaaS lock-in.
   - Enforces **WAL mode** (`PRAGMA journal_mode = WAL;`) for high concurrency across multiple devices.
   - Foreign key integrity (`PRAGMA foreign_keys = ON;`) and 5,000ms busy timeout.
2. **Strict Integer Paise Storage:**
   - All monetary values (`purchasePricePaise`, `sellingPricePaise`, `totalPaise`) are stored as integers (1 INR = 100 paise). Zero floating-point drift.
3. **Transaction-Safe Stock Modifications:**
   - Every stock adjustment, sale, or inward purchase executes inside a `prisma.$transaction` alongside an immutable `StockMovement` audit record.
4. **Optimistic Locking:**
   - Products maintain an incrementing `version` field to prevent lost updates when two staff members edit stock simultaneously.
5. **Soft Deletion (`deletedAt`):**
   - Products, Retailers, and Purchase Orders are never hard-deleted if referenced by historical movements.
6. **Stateful Low-Stock Alert Engine:**
   - Exactly one alert (in-app notification + email + webhook) is triggered when an item crosses below its reorder threshold. The alert disarms until the item is restocked, preventing notification spam.

---

## 🖨️ Print Stock Report with Retailer Details (Core Feature)

Accessible directly from the navigation bar (`/reports` or pressing `P` on any stock page):
- **A4 Landscape Print CSS:** Clean typography, zero navigation chrome, and repeating `<thead>` on every printed page.
- **Header:** Shop Name, Registered Address, GSTIN, IST Timestamp, and Operator Name.
- **Required Columns on Every Row:**
  `S.No`, `SKU`, `Product Name`, `Brand & Model`, `Category`, `Qty on Hand`, `Reorder Level`, `Status`, `Purchase Price (₹)`, `Selling Price (₹)`, `Stock Valuation (₹)`, `Rack Location`, **Distributor Name**, **Contact Person**, **Phone**, **Email**, **City**, **GSTIN**, and **Last Purchase Date**.
- **Grouping & Filters:** Filter by Category, Brand, Distributor, and Stock Status. Toggle **"Group by Distributor"** to print each distributor's products under their contact block with sub-totals.
- **Export Formats:** One-click instant export to Excel (`.xlsx`), CSV, and browser PDF print.
- **Low-Stock Reorder Sheet:** Dedicated reorder view with suggested order quantities and a manager/owner signature approval line.

---

## 🖥️ Windows Office Host PC Setup Guide

### 1. Allow Port 3000 Through Windows Firewall
Open **PowerShell as Administrator** on the Host PC and run:
```powershell
netsh advfirewall firewall add rule name="StockDesk Host" dir=in action=allow protocol=TCP localport=3000
```

### 2. Connect Other Office Devices (Phones & Tablets)
1. Ensure other devices are connected to the same office Wi-Fi router.
2. Open **Settings -> Office LAN & QR** in StockDesk on the host PC.
3. Point your smartphone camera at the displayed QR code, or type `http://<HOST_IP>:3000` into any browser.

### 3. Configure Auto-Start on Windows Boot
#### Option A: Using PM2 (Recommended)
```bash
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
pm2 start npm --name "stockdesk" -- start
pm2 save
```

#### Option B: Windows Task Scheduler
1. Open `taskschd.msc` (Task Scheduler).
2. Click **Create Basic Task** -> Name: `StockDesk Host`.
3. Trigger: **When the computer starts**.
4. Action: **Start a program** -> Program: `npm.cmd` -> Arguments: `run dev` -> Start in: `C:\VS_Code\stockDesk`.

---

## 💾 Backup and Disaster Recovery

- **Automated Daily Backups:** Creates database snapshots and CSV exports of stock, retailers, and movements in `./data/backups/`. Automatically retains the last 30 snapshots.
- **Secondary Backup Directory:** In **Settings -> Backup & Restore**, configure an external USB drive path (e.g. `E:\Backups\StockDesk`) or a synced cloud folder (OneDrive / Google Drive).
- **Download Full Backup:** One-click download of the live SQLite database.
- **Restore from Backup:** Admin-only upload of any historical `.db` file with confirmation preview before replacement.
- **Health Warning Banner:** Automatically alerts staff if no backup has succeeded in the last 3 days.

---

## 🧪 Testing Suite (Vitest)

Run all unit and integration tests:
```bash
npm run test
```

Test coverage includes:
- **Low-Stock Single Alert Invariant:** Verifies threshold crossing triggers exactly 1 alert, avoids duplicate spam on subsequent drops, and re-arms after restock.
- **CSV & Excel Import:** Verifies column mapping, row validation, auto-generated SKUs, and duplicate merge vs. skip handling.
- **Report Totals & Money Invariants:** Validates integer paise conversions and reporting calculations.
