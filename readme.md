# Real-Time SSE Notification System with Event Persistence and Replay

## Overview

This project implements a **Server-Sent Events (SSE) based real-time notification system**.
The backend allows users to subscribe to channels and receive live events published to those channels.

All events are **persisted in PostgreSQL**, enabling **event replay** when a client reconnects after a disconnection.
The system is fully containerized using **Docker and Docker Compose** for easy setup and evaluation.

This project demonstrates key backend concepts such as:

* Real-time streaming using SSE
* Event persistence
* Event replay using `Last-Event-ID`
* Subscription management
* Docker containerization
* Database-backed notification systems

---

# Architecture Overview

```
Client
   │
   │ HTTP (SSE stream)
   ▼
Express Server
   │
   ├── Active SSE Connections (in-memory Map)
   │
   ├── PostgreSQL Database
   │       ├── events
   │       └── user_subscriptions
   │
   └── Event Publisher API
```

### Key Components

**Express.js Server**

* Handles API endpoints
* Manages active SSE connections
* Streams events to subscribed clients

**PostgreSQL Database**

* Stores events permanently
* Stores user-channel subscriptions

**Docker**

* Provides reproducible environment
* Runs both app and database services

---

# Features

### 1. Event Publishing

Clients can publish events to channels.

Events are:

* persisted in the database
* pushed to all active subscribers

---

### 2. Channel Subscriptions

Users can subscribe or unsubscribe from channels.

Subscriptions are stored in the `user_subscriptions` table.

---

### 3. Real-Time Streaming (SSE)

Clients connect to:

```
GET /api/events/stream
```

The server streams events continuously using the **text/event-stream protocol**.

---

### 4. Event Replay

If a client disconnects, they can reconnect using the header:

```
Last-Event-ID
```

The server queries the database and sends any missed events.

---

### 5. Heartbeat

To prevent idle connection timeouts, the server sends a heartbeat every **30 seconds**.

Example:

```
: heartbeat
```

---

### 6. Event History

Clients can query historical events for a specific channel.

---

# Database Schema

## events

| Column     | Type      | Description         |
| ---------- | --------- | ------------------- |
| id         | BIGSERIAL | Unique event ID     |
| channel    | VARCHAR   | Channel name        |
| event_type | VARCHAR   | Event type          |
| payload    | JSONB     | Event data          |
| created_at | TIMESTAMP | Event creation time |

Index:

```
(channel, id)
```

Used for efficient replay queries.

---

## user_subscriptions

| Column     | Type      | Description        |
| ---------- | --------- | ------------------ |
| user_id    | INTEGER   | User identifier    |
| channel    | VARCHAR   | Subscribed channel |
| created_at | TIMESTAMP | Subscription time  |

Constraint:

```
PRIMARY KEY (user_id, channel)
```

Prevents duplicate subscriptions.

---

# API Endpoints

## Health Check

```
GET /health
```

Response:

```
200 OK
```

Used by Docker health checks.

---

# Publish Event

```
POST /api/events/publish
```

Request:

```json
{
  "channel": "alerts",
  "eventType": "SYSTEM_ALERT",
  "payload": {
    "message": "Server restart"
  }
}
```

Response:

```
202 Accepted
```

---

# Subscribe to Channel

```
POST /api/events/channels/subscribe
```

Request:

```json
{
  "userId": 1,
  "channel": "alerts"
}
```

Response:

```json
{
  "status": "subscribed",
  "userId": 1,
  "channel": "alerts"
}
```

---

# Unsubscribe from Channel

```
POST /api/events/channels/unsubscribe
```

Request:

```json
{
  "userId": 1,
  "channel": "alerts"
}
```

Response:

```json
{
  "status": "unsubscribed",
  "userId": 1,
  "channel": "alerts"
}
```

---

# SSE Stream

```
GET /api/events/stream
```

Query Parameters:

```
userId
channels (comma separated)
```

Example:

```
/api/events/stream?userId=1&channels=alerts,notifications
```

Headers:

```
Last-Event-ID (optional)
```

Event Format:

```
id: 5
event: SYSTEM_ALERT
data: {"message":"Hello"}
```

---

# Event History

```
GET /api/events/history
```

Query Parameters:

```
channel
page
limit
```

Example:

```
/api/events/history?channel=alerts&page=1&limit=10
```

---

# Active Connections

```
GET /api/events/active-connections
```

Returns currently connected clients.

Example:

```json
{
  "totalConnections": 1,
  "connections": [
    {
      "userId": "1",
      "channel": "alerts"
    }
  ]
}
```

---

# Setup Instructions

## 1. Clone Repository

```
git clone <repository-url>
cd project-folder
```

---

## 2. Start Application

```
docker-compose up --build
```

This starts:

* Express backend
* PostgreSQL database

---

## 3. Verify Server

```
http://localhost:8080/health
```

Response:

```
OK
```

---

# Testing the System

### Subscribe

```
POST /api/events/channels/subscribe
```

---

### Start SSE Stream

```
curl --no-buffer \
"http://localhost:8080/api/events/stream?userId=1&channels=alerts"
```

---

### Publish Event

```
POST /api/events/publish
```

Example:

```json
{
 "channel":"alerts",
 "eventType":"TEST",
 "payload":{"msg":"hello"}
}
```

Events will appear immediately in the SSE stream.

---

# Replay Example

Reconnect with header:

```
Last-Event-ID: 3
```

Server returns events with IDs greater than 3.

---

# Docker Setup

Services defined in `docker-compose.yml`:

### App Service

Runs the Node.js application.

### Database Service

Runs PostgreSQL and initializes schema using SQL seed scripts.

---

# Project Structure

```
project-root
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── submission.json
│
├── seeds
│   └── init.sql
│
├── src
│   ├── server.js
│   ├── routes.js
│   └── db.js
│
└── README.md
```

---

# Technologies Used

* Node.js
* Express.js
* PostgreSQL
* Docker
* Server-Sent Events (SSE)

---

# Key Concepts Demonstrated

* Real-time server push using SSE
* Persistent event storage
* Event replay for disconnected clients
* Channel-based event subscriptions
* Dockerized microservice architecture
* Database indexing for performance

---

# Conclusion

This project demonstrates how to build a **scalable real-time notification backend** using **Server-Sent Events with event persistence and replay**.

The architecture ensures:

* reliable message delivery
* reconnection safety
* efficient streaming
* containerized deployment

This system closely resembles real-world notification services used in modern web applications.
