# AutoWash System Architecture Template

Audience: SWP391 reviewers, lecturers, and project stakeholders.

Objective: Provide one editable reference slide that explains the deployed application structure evidenced by the GitHub `origin/dev` branch.

Narrative: Role-based users access a shared Next.js web application. The frontend communicates with a modular Spring Boot backend through REST APIs and WebSocket events. The backend persists data in PostgreSQL and connects to SePay, VNPay, Resend, and AWS S3.

Source baseline: GitHub `origin/dev` at commit `b5ad575`, including frontend and backend package manifests, controllers, services, WebSocket configuration, payment services, and storage services.

Visual system: 16:9 white architecture board on a cool-gray canvas; purple for application modules, cyan for web/realtime, green for data, and orange for external payment services.

Asset plan: Native editable PowerPoint shapes and text only; no external imagery is required for this technical diagram.

Editability plan: Every title, label, card, module, connector, and legend item remains individually editable.
