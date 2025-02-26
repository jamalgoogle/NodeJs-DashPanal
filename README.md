Node.js Backend Architecture - Short Notes (Expanded):

Core:
    Asynchronous, event-driven.
    JavaScript runtime.
    API-focused.
Layers:
    API Gateway (Optional): Entry point, routing, security.
    API (Express/Koa/Fastify): Routes, middleware, request/response.
    Application Logic (Services/Controllers): Business logic, data handling.
    Data Access (Models/Repositories): Database interaction (ORM/drivers).
Utilities: Reusable functions.
Key Features:
    Authentication/Authorization (Auth):
    JWT, Passport.js, OAuth.
    User authentication, role-based access control.
Database:
    MongoDB (Mongoose), PostgreSQL (Sequelize), MySQL.
    Data persistence, retrieval, and manipulation.
Middleware:
    Request processing, logging, error handling, authentication, validation.
    Cross-cutting concerns.
Caching:
    Redis, Memcached.
    Performance optimization.
Background Jobs:
    Bull, RabbitMQ.
    Asynchronous task processing.
Logging/Monitoring:
    Winston, PM2, Prometheus, Grafana.
    Application health and performance.
Deployment:
    Docker, Kubernetes, Cloud (AWS, Azure, GCP).
Organization:
    Modular, layered, tested.
