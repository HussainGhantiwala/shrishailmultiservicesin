# Product Requirements Document (PRD)

# Shrishail Multi Services
## Business Management Portal

Version 1.0
Status Draft
Prepared By Nova Corp
Last Updated July 2026

---

# 1. Overview

Shrishail Multi Services Business Management Portal is a cloud-based web application designed to digitally manage the company's daily business operations.

The system will allow the owner to securely record all business transactions, monitor expenses and income, generate reports, analyze financial performance, and access business data from anywhere.

Unlike traditional notebook bookkeeping, every transaction will be stored securely in the cloud, ensuring data safety and real-time accessibility.

---

# 2. Vision

To replace manual bookkeeping with a modern cloud-based management system that provides complete visibility into business operations through automation, reporting, and analytics.

---

# 3. Objectives

The system should help the business owner

• Record daily income
• Record daily expenses
• Maintain customer records
• Track pending payments
• Analyze profit & loss
• View business growth
• Generate reports
• Store all data securely
• Access records from any device

---

# 4. User Roles

## Owner (Admin)

Full Access

Can

- View Dashboard
- AddEditDelete Transactions
- Manage Customers
- View Analytics
- Manage Staff
- Manage Settings
- Export Reports

---

## Staff

Limited Access

Can

- Add Transactions
- View Assigned Customers
- View Today's Activity

Cannot

- Delete Transactions
- Access Analytics
- Change Settings
- Export Reports

---

# 5. Functional Modules

## Dashboard

Purpose

Provide an overview of the business.

Display

Today's Income

Today's Expenses

Today's Profit

Cash Balance

Pending Payments

Upcoming Due Payments

Recent Transactions

Income vs Expense Chart

Monthly Revenue Chart

Quick Action Buttons

---

## Transaction Management

Purpose

Record every business transaction.

Transaction Fields

Transaction ID

Date

Customer Name

Phone Number

Description

Category

Amount

Transaction Type

Income

Expense

Credit

Debit

Payment Status

Paid

Pending

Partial

Payment Method

Cash

UPI

Bank Transfer

Cheque

Reference Number

Attachments

Notes

Actions

Create

Edit

Delete

Search

Filter

---

## Customer Management

Store customer information.

Customer Details

Customer Name

Phone Number

Address

GST Number (Optional)

Outstanding Balance

Total Transactions

Last Transaction Date

Customer History

---

## Expense Categories

Default Categories

Fuel

Salary

Material Purchase

Maintenance

Office Expenses

Electricity

Transport

Food

Miscellaneous

Admin can create unlimited custom categories.

---

## Daily Book

Daily summary.

Display

Income

Expenses

Profit

Transactions

Cash Balance

Opening Balance

Closing Balance

---

## Analytics

Business insights.

Charts

Daily Income

Daily Expense

Weekly Profit

Monthly Profit

Yearly Revenue

Cash Flow

Top Customers

Expense Breakdown

Income Sources

Pending Collections

Profit Trend

---

## Reports

Generate reports.

Available Reports

Daily

Weekly

Monthly

Quarterly

Yearly

Export Formats

PDF

Excel

CSV

---

## Search

Global search.

Search By

Customer Name

Phone Number

Amount

Date

Category

Description

Reference Number

---

## Notifications

Upcoming Payment Reminder

Pending Payment Reminder

Large Expense Alert

Daily Closing Reminder

Monthly Summary

---

## Authentication

Secure Login

Forgot Password

Reset Password

Role Based Access

Session Management

---

## Settings

Business Information

Business Logo

Business Name

Business Address

GST Number

Phone Number

Categories

Staff Management

Profile Settings

Password

Theme

---

# 6. Dashboard KPIs

The dashboard should display

Today's Income

Today's Expense

Today's Profit

Monthly Revenue

Monthly Expense

Monthly Profit

Pending Collections

Cash in Hand

Total Customers

Total Transactions

---

# 7. Analytics

Interactive charts.

Examples

Revenue Trend

Expense Trend

Profit Trend

Income Distribution

Expense Categories

Top Customers

Monthly Growth

Year Comparison

---

# 8. Future Modules

These modules are NOT included in Version 1.

Inventory Management

Invoice Generator

GST Billing

Quotation Generator

Purchase Orders

Employee Attendance

Payroll

Task Management

WhatsApp Notifications

SMS Notifications

Printer Support

Barcode Scanner

QR Payments

Document Management

Multi-Branch Support

Mobile Application

---

# 9. Non Functional Requirements

Fast

Responsive

Secure

Cloud Based

Scalable

Mobile Friendly

Offline Tolerant (Future)

Easy to Use

---

# 10. Technology Stack

Frontend

React

Vite

Tailwind CSS

Framer Motion

Backend

Supabase

Authentication

Supabase Auth

Database

PostgreSQL

Storage

Supabase Storage

Charts

Recharts

Tables

TanStack Table

Forms

React Hook Form

Validation

Zod

Icons

Lucide React

Deployment

Vercel

Version Control

GitHub

---

# 11. Database (High Level)

Users

Customers

Transactions

Categories

Reports

Notifications

Settings

Attachments

Audit Logs

---

# 12. Security

Encrypted Authentication

Role Based Permissions

Secure Cloud Storage

Automatic Session Timeout

Database Backups

---

# 13. UI Design Guidelines

Modern

Minimal

Professional

Clean

Apple Inspired

Responsive

Soft Shadows

Rounded Corners

Blue Accent Theme

Smooth Animations

---

# 14. Project Phases

## Phase 1

Authentication

Dashboard

Customers

Transactions

Categories

Reports

Basic Analytics

---

## Phase 2

Advanced Analytics

Notifications

Attachments

Export Improvements

Role Management

---

## Phase 3

Inventory

Invoices

GST

Quotation

WhatsApp

Printer

Barcode

---

# 15. Success Metrics

The project will be considered successful when

✔ Every transaction is securely stored.

✔ Owner can access business data remotely.

✔ Daily reports are generated automatically.

✔ Monthly analytics are available.

✔ Customer balances are tracked accurately.

✔ Reports can be exported.

✔ The application remains responsive on Desktop, Tablet and Mobile.

---

# 16. Out of Scope (Version 1)

Native Android App

Native iOS App

Offline Synchronization

Inventory

Payroll

GST Filing

AI Predictions

Barcode

Multi-Branch

---

# 17. Change Log

 Version  Date  Changes  Author 
--------------------------------------------------------------
 1.0  July 2026  Initial PRD  Nova Corp 

---

# Notes

This document is a living document.

Any future feature request, UI modification, workflow update, or business requirement must first be reflected in this PRD before development begins.

The PRD serves as the single source of truth for the project.