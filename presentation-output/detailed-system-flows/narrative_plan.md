# AutoWash Detailed System Flows

Audience: SWP391 presentation reviewers and project stakeholders.

Objective: Explain the actual request, response, callback, WebSocket, persistence, and status-transition flows implemented in the GitHub repository.

Source baseline: GitHub `origin/dev` commit `b5ad575`. Evidence comes from the authentication, catalog, vehicle, slot, booking, payment, operations, wash-tracking, loyalty, review, reporting, WebSocket, and storage code.

Narrative arc:
1. Full system architecture and traffic directions.
2. Authentication, catalog, and vehicle flow.
3. Booking, slot capacity, and SePay/VNPay payment flow.
4. Staff wash-session lifecycle and realtime synchronization.
5. Completion, customer tracking, loyalty, review, and reporting flow.

Visual system: 16:9 technical diagrams using a white canvas, dark request arrows, dashed response/callback arrows, purple application modules, cyan frontend, green persistence, and orange external payment services.

Asset plan: Native editable PowerPoint shapes and text only; no external visual assets are needed.

Editability plan: All lanes, endpoints, state labels, arrows, legends, notes, and modules remain editable.
