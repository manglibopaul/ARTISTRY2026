# Package Diagram

Below is a package-level diagram for the Artistry project (Mermaid format).

```mermaid
graph LR
  %% Frontend package
  subgraph frontend [Frontend — `src/`]
    FE_App["App.jsx\nPages\nComponents\nAssets"]
    FE_Context["context/*\nstate providers"]
    FE_Utils["utils/*"]
  end

  %% Backend package
  subgraph backend [Backend — `backend/`]
    BE_Server["server.js\nExpress app"]
    BE_Config["config/*\n(database, config.json)"]
    BE_Controllers["controllers/*\nbusiness logic"]
    BE_Routes["routes/*\nroute definitions"]
    BE_Models["models/*\nSequelize models"]
    BE_Middleware["middleware/*\nauth, upload"]
    BE_Utils["utils/*\nemail, media, helpers"]
  end

  %% Other packages
  subgraph infra [Infrastructure & Services]
    DB[(PostgreSQL DB)]
    Storage[(Object Storage — S3)]
    CDN[CDN]
    Mail[Mail Service]
    Payments[Payment Gateway]
  end

  %% Relationships
  FE_App -->|calls| BE_Server
  BE_Server --> BE_Routes
  BE_Routes --> BE_Controllers
  BE_Controllers --> BE_Models
  BE_Controllers --> BE_Utils
  BE_Server --> BE_Middleware
  BE_Models -->|persist| DB
  BE_Controllers -->|upload| Storage
  Storage -->|serve| CDN
  BE_Utils -->|send| Mail
  BE_Controllers -->|process| Payments

  style frontend fill:#f9f,stroke:#333,stroke-width:1px
  style backend fill:#ff9,stroke:#333,stroke-width:1px
  style infra fill:#9ff,stroke:#333,stroke-width:1px
```

Notes:
- Frontend package maps to `src/` and contains UI, pages, and client-side state.
- Backend package maps to `backend/` and contains API surface, controllers, models, and middleware.
- Infrastructure packages show external services the packages interact with.
