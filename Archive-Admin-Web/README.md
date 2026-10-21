# ArchiveAuto - Admin Web Portal

This folder contains the complete frontend for the ArchiveAuto Administrator Portal.

## Architecture

- **Served at**: `/admin` by the ArchiveAuto Express server (`mongodb/server/src/server.js`).
- **Admin API**: `/admin-api`
- **Security**:
  - Full adherence to Helmet Content Security Policy (CSP): No inline scripts or inline event handlers.
  - Client-side DOM creation strictly uses safe text methods (`textContent`, `createElement`), never raw HTML injection.
  - Chart library (`chart.js`) is hosted directly from the local server.
  - JWT token is kept strictly in page memory and is never written to `localStorage` or `sessionStorage`.

## Included Screens

1. **Platform Overview**: Aggregated counts for Total Users, Vehicles, Service Records, New Users (Last 7 Days), and AI Requests Today.
2. **Weekly Spending**: MongoDB aggregation bar chart of total spending per week across all users.
3. **Repair Breakdown & Proof Coverage**: Repair spending and proof attachment rates by repair category.
4. **Car Catalog Manager**: Search, pagination, add new vehicle, and delete vehicle with strict validation.
5. **Security Events**: Last 20 security events (failed logins, rate-limited requests) with masked IP addresses and zero emails.
6. **Audit Logs**: Administrative action trail with masked IPs.
