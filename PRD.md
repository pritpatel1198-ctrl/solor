# PRD – Solar Revenue Tracker (Enterprise Web Application)

## Role

You are a Senior Product Designer, Senior UI/UX Designer, Senior Frontend Engineer, Senior Backend Engineer, Database Architect, and Supabase Expert.

Design and develop a production-ready web application named **Solar Revenue Tracker**.

This application should help homeowners with rooftop solar systems track daily electricity generation, electricity consumption, profit, losses, and complete financial analytics.

The application should look like a premium SaaS product similar to **Stripe Dashboard, Vercel, Notion, Linear, and SAP Fiori**.

Do **NOT** create a cyberpunk, neon, gaming, glass-heavy, or futuristic UI.

The design language should be elegant, premium, minimal, and business-focused.

---

# Tech Stack

Frontend

* HTML5
* CSS3
* Vanilla JavaScript (ES6+)

Backend

* Node.js
* Express.js

Database

* Supabase PostgreSQL

Authentication

* Supabase Authentication

Charts

* Chart.js

Icons

* Lucide Icons

Fonts

* Inter

Theme

* Material Inspired
* White Background
* Soft Gray Sections
* Blue Primary
* Green Success
* Red Danger

The project must have a clean folder structure and production-ready code.

---

# Purpose

Every day I manually check my electricity meter.

I enter two values.

Solar Generated Units

Grid Consumed Units

The system automatically calculates whether I made money or whether I have to pay the electricity company.

---

# Business Logic

Example 1

Solar Generated

7 Units

Grid Consumed

5 Units

Net Units

+2

Government Buying Rate

₹2

Revenue

₹4

Status

Profit

Show Green Badge

---

Example 2

Solar Generated

7 Units

Grid Consumed

10 Units

Net Units

-3

Government Selling Rate

₹7

Amount Payable

₹21

Status

Loss

Show Red Badge

---

Formula

Net Units = Generated − Consumed

If Net Units > 0

Revenue = Net Units × Buying Rate

Payable = 0

If Net Units < 0

Revenue = 0

Payable = Absolute(Net Units) × Selling Rate

If Net Units = 0

Revenue = 0

Payable = 0

Status = Balanced

---

# Dashboard

The landing page must immediately answer these questions.

How much electricity did I generate today?

How much electricity did I consume today?

How much money did I earn today?

How much money do I owe today?

How much profit this month?

How much profit this year?

Lifetime Revenue

Lifetime Expense

Lifetime Net Profit

Use KPI cards.

Use animated counters.

Display trend indicators.

---

# Daily Entry

Fields

Date

Generated Units

Consumed Units

Buying Rate

Selling Rate

Notes

Buttons

Save

Update

Delete

Reset

Auto-calculate values while typing.

---

# History

Professional data table.

Search

Filter

Pagination

Sorting

Edit

Delete

Bulk Delete

Export CSV

Export PDF

---

# Reports

Daily

Weekly

Monthly

Quarterly

Yearly

Lifetime

Each report should include

Solar Generated

Grid Consumption

Export Units

Import Units

Revenue

Expense

Net Profit

Average Units

Highest Day

Lowest Day

---

# Analytics

Interactive charts.

Daily Generation

Daily Consumption

Monthly Revenue

Monthly Expense

Monthly Profit

Yearly Revenue

Yearly Expense

Yearly Profit

Pie Chart

Revenue vs Expense

---

# Calendar

Calendar view.

Every day displays

Generation

Consumption

Revenue

Expense

Clicking a day opens complete details.

---

# Settings

Buying Rate

Selling Rate

Currency

Dark Mode

Export Settings

Backup

Restore

Profile

---

# Database Design

Table

daily_entries

Columns

id

entry_date

generated_units

consumed_units

net_units

buying_rate

selling_rate

revenue

payable

status

notes

created_at

updated_at

Use Supabase Row Level Security.

---

# Backend API

POST /entries

GET /entries

GET /entries/:id

PUT /entries/:id

DELETE /entries/:id

GET /dashboard

GET /reports

GET /analytics

All calculations must happen on the backend.

Never trust frontend calculations.

---

# UI Requirements

Premium SaaS Design

Soft Shadows

Rounded Cards

Responsive

Desktop First

Tablet Support

Mobile Support

Dark Mode

Loading Skeletons

Toast Notifications

Empty States

Professional Tables

Modern Forms

No Bootstrap.

No jQuery.

Write custom CSS.

---

# Project Structure

client/

assets/

css/

js/

pages/

components/

server/

controllers/

routes/

middleware/

services/

config/

supabase/

utils/

public/

---

# Deliverables

Generate the complete project.

Production-ready code.

No placeholders.

No pseudo code.

No TODO comments.

No missing files.

Generate every HTML page, every CSS file, every JavaScript file, Express backend, Supabase SQL schema, authentication flow, API documentation, and setup instructions.

The application should be deployable immediately after installing dependencies and configuring the Supabase environment variables.
