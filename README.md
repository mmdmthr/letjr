# letjr

> A minimalist, keyboard-driven double-entry accounting app built with Laravel and Tabulator.js. Inspired by GnuCash.

---

## Why I Made This

GnuCash is a phenomenal personal finance tool—it is fast, reliable, and adheres strictly to double-entry bookkeeping principles. However, being a desktop application, managing financial data across multiple devices requires manual file syncing or local network shares, which creates unnecessary friction.

`letjr` was born out of the need to have my financial database accessible online from anywhere, without sacrificing the raw efficiency and keyboard-centric workflow that makes GnuCash so effective.

---

## Goal

The primary objective of `letjr` is **not** to clone every single complex feature of GnuCash, but to build a streamlined Minimum Viable Product (MVP) focused on:
1. **Accessibility:** Cloud-hosted database accessible anywhere via web interface.
2. **Desktop-Like Speed:** Keyboard-driven transaction entry using Tabulator.js with local in-memory account lookups.
3. **Financial Clarity:** Reliable real-time Balance Sheet and Cash Flow reporting based on a rock-solid accounting engine.

---

## Philosophy

* **Double-Entry Engine First:** No floating single-entry hacks. Every monetary movement consists of balanced debit and credit entries summing to exactly `0`.
* **Keyboard Over Mouse:** Data entry should be fast. Navigating fields, editing cells, and logging transactions should happen using standard spreadsheet shortcuts without touching the mouse.
* **Pragmatic Simplicity:** Keep the codebase lean. Three core tables (`accounts`, `transactions`, `entries`) handle the vast majority of accounting logic.
* **Perceived Speed Matters:** Utilize client-side memory indexing, virtualized rendering via Tabulator.js, and optimistic updates to negate typical web latency.

---

## Tools Used

* **Backend:** [Laravel](https://laravel.com/) (PHP)
* **Frontend:** Blade, [Alpine.js](https://alpinejs.dev/), [Tabulator.js](https://tabulator.info/), [Tailwind CSS](https://tailwindcss.com/)
* **Database:** SQLite / PostgreSQL
* **Architecture:** In-Memory Client Search + Double-Entry Ledger Pattern