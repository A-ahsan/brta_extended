<div align="center">

<img src="docs/assets/brta.png" alt="BRTA Logo" width="100" />

# BRTA 2.0 — Smart Transport Portal of Bangladesh

**A full-stack digital platform for the Bangladesh Road Transport Authority, replacing manual processes with a secure, real-time, AI-assisted citizen service portal.**

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow.js-Face%20AI-FF6F00?style=flat-square&logo=tensorflow&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

</div>

---

## Overview

BRTA 2.0 is a citizen-facing web application that digitises core BRTA services — driving licence applications, vehicle registration, tax token renewal, route permits, online written and physical exams, police verification, and more. It connects to a live Supabase backend, uses TensorFlow.js for face-liveness verification, and integrates an AI-powered chatbot for service guidance.

The project targets eliminating intermediary agents by giving citizens direct, secure, self-service access to all BRTA workflows.

---

## Feature Areas

| Area | Description |
|---|---|
| Driving Licence | Full application lifecycle — slots, tests, approvals, card generation |
| Vehicle Registration | New registration, renewal, ownership transfer, impoundment |
| Tax Token | Token renewal with payment and PDF generation |
| Route Permit | Commercial vehicle permit applications and tracking |
| Online Exam | MCQ-based driving theory exam with question bank |
| Physical Exam | Slot booking and result management for practical tests |
| Police Dashboard | QR-code scan and live plate lookup with violation history |
| Admin Panel | Applications, analytics, slot management, notices, user roles |
| Face Verification | TensorFlow.js + MediaPipe liveness detection at exam entry |
| AI Chatbot | Google AI-powered assistant with location-aware BRTA guidance |
| Community | Road-safety forum with reports, ranking, and moderation |
| Live Chat | Real-time citizen-to-agent support via Supabase Realtime |
| Notifications | OTP via email (Resend), SMS (configurable), Telegram integration |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Routing | React Router v6 |
| Backend / Database | Supabase (PostgreSQL + Row Level Security) |
| Authentication | Supabase Auth (email/OTP/password) |
| Face AI | TensorFlow.js, MediaPipe Face Mesh, face-api.js |
| Charts | Recharts |
| Maps | React-Leaflet |
| PDF / Cards | jsPDF, html2canvas |
| QR | html5-qrcode, qrcode |
| Email | Resend API |
| Icons | Lucide React, Phosphor React |

---

## Getting Started

### Prerequisites

- Node.js v18 or later
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/brta_extended.git
cd brta_extended

# Install dependencies
npm install
```

### Environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_GOOGLE_AI_API_KEY=<optional-chatbot-key>
VITE_RESEND_API_KEY=<optional-email-key>
```

### Run locally

```bash
npm run dev        # development server at http://localhost:5173
npm run build      # production build
npm run preview    # preview production build
```

---

## Project Structure

```
brta_extended/
├── src/
│   ├── components/        # Shared UI components
│   ├── contexts/          # React context providers
│   ├── pages/             # Route-level page components
│   ├── utils/             # Helpers, translations, constants
│   ├── App.jsx
│   └── main.jsx
├── docs/                  # MkDocs project documentation
│   └── assets/            # Screenshots and diagrams
├── wiki/                  # Developer reference notes
│   ├── setup/             # Database, Supabase, auth setup guides
│   ├── features/          # Per-feature implementation notes
│   ├── deployment/        # Hosting, HTTPS, performance guides
│   ├── fixes/             # Bug-fix records
│   ├── testing/           # Testing and QA guides
│   └── integrations/      # Third-party service setup (email, SMS, Telegram)
├── public/
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## Application Routes

| Path | Description |
|---|---|
| `/` | Public homepage |
| `/login` `/signup` | Authentication |
| `/dashboard` | Citizen dashboard |
| `/admin` | Admin panel |
| `/police` | Police verification dashboard |
| `/exam` | Online theory exam |
| `/physical-exam` | Physical exam management |
| `/community` | Community forum |
| `/fee-calculator` | Service fee calculator |

---

## Documentation

Extended documentation is hosted via MkDocs in the `docs/` directory.  
Developer notes and setup guides are organised in `wiki/` with the following sections:

- [Setup guides](wiki/setup/) — database schema, Supabase config, admin accounts
- [Feature notes](wiki/features/) — per-feature implementation details
- [Deployment](wiki/deployment/) — Render, Vercel, HTTPS, security checklist
- [Fixes](wiki/fixes/) — recorded bug fixes and patches
- [Testing](wiki/testing/) — testing procedures and checklists
- [Integrations](wiki/integrations/) — Resend, SMS, Telegram configuration

---

## License

This project is released under the [MIT License](LICENSE).
