# MealPrep Month Planner

Plan a balanced month of meals from your own food library, then export or print clean weekly and monthly views. This project is built by [Teda.dev](https://teda.dev), the AI app builder for everyday problems, so you can get a production-ready planner without any setup.

## Features
- Add foods and tag them for breakfast, lunch, dinner, and dessert
- Auto-balance 4-week meal plans with smart variety spacing
- If you have no desserts saved, the planner will add tasteful dessert suggestions automatically
- Regenerate a single week without changing the rest of your month
- Export CSV for a selected week or the entire month
- Print-friendly weekly and monthly layouts
- Private by default: everything is stored locally in your browser via localStorage

## Tech stack
- HTML5, Tailwind CSS (Play CDN), and custom CSS
- jQuery 3.7.x for interactions
- Modular JavaScript with a single global namespace (window.App)

## Getting started
1. Open `index.html` to explore the landing page.
2. Click the Get started button or open `app.html` directly.
3. Add some foods with meal types and tags, or pick from the suggestions.
4. Set a start date and click Generate month.
5. Switch between Month or Week view, export CSV, or print.

## Files
- `index.html`: Landing page
- `app.html`: Main app
- `styles/main.css`: Custom CSS and print styles
- `scripts/helpers.js`: Storage, utilities, CSV export, print helpers
- `scripts/ui.js`: App logic, planning, rendering, event handlers
- `scripts/main.js`: App bootstrapper with safety guards
- `scripts/landing.js`: Non-essential landing micro-interactions
- `assets/logo.svg`: App logo

## Data persistence
The app saves your foods, settings, and generated plans to `localStorage` under the `mealprep-v1` namespace.

## Accessibility
- Semantic HTML and keyboard navigable controls
- WCAG-friendly color contrast
- Respects `prefers-reduced-motion`

## Printing
Use the Print buttons in the app for clean, ink-friendly output. You can print either the current week or the entire month. CSV export is also included for spreadsheets.
