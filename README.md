# Mahi Jewels Backend

This backend stores user signup and login details in MongoDB.

## Setup

1. Install dependencies:
   npm install express mongoose body-parser bcryptjs

2. Start MongoDB locally (default URI: mongodb://localhost:27017/mahi_jewels)

3. Start the server:
   npm start

## API Endpoints

- POST /api/auth/signup
  - { "username": "user", "email": "email", "password": "pass" }
- POST /api/auth/login
  - { "email": "email", "password": "pass" }
