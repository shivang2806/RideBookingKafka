# Ride Booking System

## Overview

This project implements a ride-booking system using Node.js, Kafka, and Docker. It consists of a Customer API, Driver API, and a Kafka-based event system to handle ride requests and updates efficiently.

---

## Folder Structure

```
.
├── storage.js       # Manages Kafka storage (orders)
├── driver.js        # Handles driver-related API operations
├── customer.js      # Handles customer-related API operations
└── Api              # Contains API-related code
```

---

## Setup and Running the Project

### Step 1: Start Docker Containers

```sh
sudo docker-compose up -d
```

### Step 2: Check Running Containers

```sh
sudo docker ps
```

### Step 3: Start Services

```sh
node admin.js
node driver.js
node customer.js
```

---

## API Endpoints

### 1. Driver Availability

- **Endpoint:** `GET /available-drivers/:zone`
- **Description:** Fetches available drivers in a specified zone.
- **Kafka Topic:** `driver-locations`
- **Flow:**
  - The customer requests available drivers.
  - The system retrieves driver locations via Kafka.
  - Response is sent to the customer.

---

### 2. Ride Booking Flow

#### Step 1: Create Booking

- **Endpoint:** `POST /create-booking`
- **Description:** Customers create a ride booking request.
- **Kafka Topic:** `booking-requests`
- **Flow:**
  - Customers submit a ride request.
  - The request is published to Kafka.
  - Drivers subscribed to the topic receive the request.

#### Step 2: Accept Booking

- **Endpoint:** `POST /accept-booking`
- **Description:** Drivers accept a ride request.
- **Kafka Topic:** `ride-accepted`
- **Flow:**
  - A driver accepts a booking.
  - The accepted ride is published to Kafka.
  - The customer receives a ride confirmation.

---

### 3. Ride Completion Flow

#### Step 1: Complete Ride

- **Endpoint:** `POST /complete-ride`
- **Description:** Drivers mark a ride as completed.
- **Kafka Topic:** `ride-completed`
- **Flow:**
  - The driver completes the ride.
  - Kafka stores the ride completion event.
  - The customer can fetch completed rides.

#### Step 2: Fetch Completed Rides

- **Endpoint:** `GET /orders`
- **Description:** Customers retrieve completed ride history.
- **Kafka Storage:** `Orders`
- **Flow:**
  - The system fetches ride history from Kafka storage.
  - The response is sent to the customer.

---

## Technologies Used

- **Node.js** – Backend API development
- **Kafka** – Event-driven messaging
- **Docker** – Containerization

---
