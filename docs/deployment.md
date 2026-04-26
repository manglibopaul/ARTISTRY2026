# Deployment Diagram

Below is the deployment diagram for the Artistry project (Mermaid format).

```mermaid
flowchart LR
  user["User\n(Browser / Mobile)"]

  subgraph Frontend
    fe["Vite + React (artistry)\nDeployed: Vercel / Netlify"]
  end

  subgraph Backend
    be["Node.js + Express\nDeployed: Render / Heroku / DigitalOcean"]
    api[/REST API/]
  end

  subgraph ManagedServices
    db[(PostgreSQL DB)]
    storage[(Object Storage\nS3 / Spaces / Cloud Storage)]
    cdn[CDN]
    mail[Mail Service\n(Mailgun / SendGrid)]
    payments[Payment Gateway\n(GCash / Stripe)]
  end

  user -->|HTTPS| fe
  fe -->|HTTPS / Fetch| be
  fe -->|Static assets| cdn
  be -->|Read / Write| db
  be -->|Upload / Serve media| storage
  storage -->|Serve| cdn
  be -->|Send emails| mail
  be -->|Process payments| payments

  style fe fill:#f9f,stroke:#333,stroke-width:1px
  style be fill:#ff9,stroke:#333,stroke-width:1px
  style db fill:#9f9,stroke:#333,stroke-width:1px
  style storage fill:#9ff,stroke:#333,stroke-width:1px
```

Notes:
- Frontend is deployed as a static SPA (Vercel recommended).
- Backend is a Node/Express API (hosted on Render/Heroku/DigitalOcean).
- PostgreSQL is used for persistent data; object storage (S3) for uploads.
- CDN sits in front of static assets and object storage.
- Mail and payment are third-party services integrated with the backend.
