# ☀️ Solar Revenue Tracker (Enterprise Web Application)

A production-ready enterprise SaaS web application for tracking rooftop solar electricity generation, grid consumption, daily revenues, expenses, and comprehensive net profit analytics.

Built with **HTML5**, custom **CSS3** (Stripe/Vercel/Linear design language), **Vanilla JavaScript (ES6+)**, **Node.js**, **Express.js**, **Supabase PostgreSQL**, **Chart.js**, and **Lucide Icons**.

---

## 🌟 Key Features

1. **Enterprise SaaS Dashboard**:
   - Live KPI cards: Today's Generation, Consumption, Earned Revenue, Owed Payable, Current Month Profit, Current Year Profit, Lifetime Revenue, Lifetime Expense, and Lifetime Net Profit.
   - Animated count-up metrics & trend badges.
   - Quick solar insight widget & recent entry logs.

2. **Daily Meter Entry**:
   - Fields: Date, Solar Generated Units (kWh), Grid Consumed Units (kWh), Buying Rate, Selling Rate, Notes.
   - Real-time auto-calculation preview as you type: Net Units, Revenue (Earned), Payable (Owed), and Status (Profit / Loss / Balanced).
   - CRUD actions: Save, Update, Delete, Reset.

3. **History Log & Data Management**:
   - Interactive data table with instant text search, date range filtering, and status filtering.
   - Dynamic column sorting and page navigation.
   - Single & Bulk item deletion.
   - CSV Export & PDF Print export capabilities.

4. **Financial & Performance Reports**:
   - Filterable by timeline periods: **Daily**, **Weekly**, **Monthly**, **Quarterly**, **Yearly**, **Lifetime**.
   - Metric aggregates: Solar Generated, Grid Consumption, Export Units, Import Units, Revenue, Expense, Net Profit, Average Units per day, Highest Generation Day, Lowest Generation Day.

5. **Visual Analytics**:
   - Interactive Chart.js visualizations:
     - Daily Generation vs Consumption Time Series.
     - Monthly Revenue, Expense & Profit Bar Chart.
     - Yearly Financial Growth.
     - Doughnut Chart for Revenue vs Expense breakdown.

6. **Interactive Calendar View**:
   - 5-week month calendar grid showing per-day Generation, Consumption, Revenue, and Expense metrics.
   - Click any day to open detailed reading modal with direct edit/add options.

7. **Settings & Preferences**:
   - Configurable default Buying Rate, Selling Rate, and Currency symbols (`₹`, `$`, `€`, `£`).
   - Dark Mode / Light Mode theme switcher.
   - Data Backup (JSON export) & Data Restore (JSON import).

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom SaaS Tokens), ES6+ JavaScript SPA Architecture
- **Backend**: Node.js, Express.js
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) & Auth
- **Charts & Icons**: Chart.js, Lucide Icons
- **Typography**: Inter (Google Fonts)

---

## 📁 Project Structure

```
d:\Solor\
├── package.json
├── README.md
├── .env.example
├── .env
├── supabase/
│   └── schema.sql              # Supabase PostgreSQL DDL, indexes, RLS & triggers
├── server/
│   ├── server.js               # Express application entry point
│   ├── config/
│   │   └── supabase.js         # Supabase client configuration & fallback store
│   ├── middleware/
│   │   └── auth.js             # JWT Bearer token authentication
│   ├── utils/
│   │   └── calculations.js     # Canonical calculation engine
│   ├── services/
│   │   ├── entryService.js     # Entries CRUD & dataset queries
│   │   ├── analyticsService.js # Dashboard KPIs, Reports, Analytics datasets
│   │   └── settingsService.js  # User settings, backup & restore
│   ├── controllers/
│   │   ├── entryController.js
│   │   ├── analyticsController.js
│   │   └── settingsController.js
│   └── routes/
│       ├── entryRoutes.js
│       ├── analyticsRoutes.js
│       └── settingsRoutes.js
└── client/
    ├── index.html              # HTML5 application shell
    └── assets/
        ├── css/
        │   ├── variables.css   # Theme design tokens & CSS custom properties
        │   ├── main.css        # Base reset, layout grid, headers, sidebar
        │   ├── components.css  # Buttons, cards, form controls, tables, modals, toasts
        │   └── views.css       # Page view specific styles
        └── js/
            ├── config.js       # Global constants
            ├── state.js        # Reactive state manager
            ├── api.js          # HTTP API client
            ├── auth.js         # Supabase auth wrapper
            ├── router.js       # SPA router
            ├── components/
            │   ├── toast.js
            │   ├── modal.js
            │   └── skeleton.js
            └── views/
                ├── authView.js
                ├── dashboardView.js
                ├── entryView.js
                ├── historyView.js
                ├── reportsView.js
                ├── analyticsView.js
                ├── calendarView.js
                └── settingsView.js
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```env
PORT=3000
SUPABASE_URL=https://your-supabase-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```
*(Note: If left on default/demo values, the app automatically runs in Demo Mode so you can explore instantly!)*

### 3. Setup Supabase Database
Run the SQL script provided in `supabase/schema.sql` in your Supabase SQL Editor to create `daily_entries`, `user_settings`, RLS policies, and triggers.

### 4. Start the Application
```bash
npm start
```
Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

---

## 📐 Business Logic & Financial Formulas

```
Net Units = Generated Units - Consumed Units

Case 1 (Net Units > 0):
  Revenue = Net Units × Buying Rate
  Payable = 0
  Status = Profit (Green Badge)

Case 2 (Net Units < 0):
  Revenue = 0
  Payable = |Net Units| × Selling Rate
  Status = Loss (Red Badge)

Case 3 (Net Units = 0):
  Revenue = 0
  Payable = 0
  Status = Balanced (Neutral Badge)
```

All calculation logic is enforced on the backend server before persisting data, while live previews calculate in real-time on the frontend form.
