# 🏥 Swastik Healthcare Backend API

A complete, production-ready Node.js backend for the Swastik Healthcare platform. This API powers both the Android mobile app (patient side) and the React web dashboard (doctor side).

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [WebSocket Events](#websocket-events)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)

## ✨ Features

### Patient Features
- 🔐 Authentication (Email/Phone + OTP verification)
- 👤 Profile management with health metrics
- 📅 Appointment booking with doctors
- 📹 Video consultations with WebRTC
- 🏥 Hospital, clinic, pharmacy finder with live location
- 🚑 Real-time ambulance tracking & SOS
- 💊 Medicine search with pharmacy availability
- 📋 Medical reports & prescriptions
- 🤖 AI-powered health chatbot
- 🔔 Push notifications
- ⏰ Medicine & appointment reminders

### Doctor Features
- 📊 Dashboard with stats & today's schedule
- 👥 Patient management
- 📅 Appointment management (confirm/cancel/reschedule)
- 📹 Video consultation with patients
- 💊 Prescription creation
- 📋 Patient report analysis
- ⚙️ Availability & slot management

### Admin Features
- 🏥 Hospital/Clinic management
- 🚑 Ambulance fleet management
- 👨‍⚕️ Doctor/Provider approval (Strict Verification)
- 📊 Analytics dashboard

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | Supabase (PostgreSQL) |
| File Storage | MinIO (S3-compatible) |
| Real-time | Socket.io |
| Authentication | JWT + OTP |
| AI Chatbot | OpenAI GPT-4 |
| Video Calls | WebRTC (Agora/Twilio ready) |
| Geolocation | geolib |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- MinIO server (or S3-compatible storage)
- OpenAI API key (for chatbot)

### Installation

```bash
# Clone the repository
cd swastik-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Set up database (run in Supabase SQL Editor)
# Copy contents of database/schema.sql

# Start development server
npm run dev
```

### Running with Docker

```bash
# Start MinIO (for file storage)
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"

# Start the API server
npm run dev
```

## 🔧 Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-super-secret-key-minimum-32-chars
JWT_EXPIRES_IN=7d

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=swastik-healthcare

# OpenAI (for chatbot)
OPENAI_API_KEY=sk-your-openai-api-key

# Frontend URLs
FRONTEND_WEB_URL=http://localhost:3000
FRONTEND_APP_URL=http://localhost:3000
```

## 📚 API Documentation

### Base URL
```
Development: http://localhost:3000/api
Production: https://api.swastik.com/api
```

### Authentication Headers
```
Authorization: Bearer <access_token>
```

---

## 🔐 Authentication APIs

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "patient@example.com",
  "phone": "+919876543210",
  "password": "securepassword123",
  "name": "John Doe",
  "role": "patient"  // or "doctor"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "patient@example.com",
  "password": "securepassword123"
}

Response:
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "patient" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "+919876543210"
}
```

### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456"
}
```

### Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbG..."
}
```

### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## 👤 Patient APIs

### Get Profile
```http
GET /api/patients/profile
Authorization: Bearer <token>
```

### Update Profile
```http
PUT /api/patients/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "age": 30,
  "gender": "male",
  "bloodGroup": "O+",
  "weight": 70.5,
  "height": 175.0,
  "location": "New Delhi"
}
```

### Upload Profile Image
```http
POST /api/patients/profile/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

image: <file>
```

### Get Dashboard
```http
GET /api/patients/dashboard
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "patient": { "id": "...", "name": "John" },
    "upcomingAppointments": [...],
    "reminders": [...],
    "recentConsultations": [...],
    "notifications": [...],
    "recommendedDoctors": [...]
  }
}
```

### Reminders
```http
GET /api/patients/reminders
POST /api/patients/reminders
PUT /api/patients/reminders/:id
DELETE /api/patients/reminders/:id
```

### Emergency Contacts
```http
POST /api/patients/emergency-contacts
DELETE /api/patients/emergency-contacts/:id
```

---

## 👨‍⚕️ Doctor APIs

### Get All Doctors (Public)
```http
GET /api/doctors?page=1&limit=10&specialization=Cardiologist&search=kumar

Response:
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 10, "total": 45 }
}
```

### Get Specialties
```http
GET /api/doctors/specialties

Response:
{
  "success": true,
  "data": [
    { "name": "General Physician", "doctorCount": 45 },
    { "name": "Cardiologist", "doctorCount": 23 }
  ]
}
```

### Get Doctor by ID
```http
GET /api/doctors/:id

Response includes slots and reviews
```

### Get Available Slots
```http
GET /api/doctors/:id/slots?date=2026-02-10

Response:
{
  "success": true,
  "data": [
    { "time": "09:00", "period": "Morning", "isAvailable": true },
    { "time": "10:00", "period": "Morning", "isAvailable": false }
  ]
}
```

### Doctor Dashboard (Doctor Only)
```http
GET /api/doctors/me/dashboard
Authorization: Bearer <doctor_token>

Response:
{
  "success": true,
  "data": {
    "doctor": { ... },
    "todayAppointments": [...],
    "upcomingAppointments": [...],
    "pendingCount": 5,
    "stats": { "totalPatientsToday": 12, "earningsToday": 5000 }
  }
}
```

### Update Availability
```http
PUT /api/doctors/me/availability
Authorization: Bearer <doctor_token>
Content-Type: application/json

{
  "isAvailable": true
}
```

### Update Slots
```http
PUT /api/doctors/me/slots
Authorization: Bearer <doctor_token>
Content-Type: application/json

{
  "slots": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00" },
    { "dayOfWeek": 2, "startTime": "09:00", "endTime": "17:00" }
  ]
}
```

---

## 📅 Appointment APIs

### Book Appointment (Patient)
```http
POST /api/appointments
Authorization: Bearer <patient_token>
Content-Type: application/json

{
  "doctorId": "uuid",
  "date": "2026-02-10",
  "timeSlot": "10:00",
  "type": "video_consultation",
  "symptoms": ["fever", "headache"],
  "notes": "Having fever for 2 days"
}
```

### Get Appointments
```http
GET /api/appointments?status=scheduled&upcoming=true
Authorization: Bearer <token>
```

### Update Status (Doctor)
```http
PUT /api/appointments/:id/status
Authorization: Bearer <doctor_token>
Content-Type: application/json

{
  "status": "confirmed"
}
```

### Cancel Appointment (Patient)
```http
DELETE /api/appointments/:id
Authorization: Bearer <patient_token>
Content-Type: application/json

{
  "reason": "Unable to attend"
}
```

### Reschedule
```http
POST /api/appointments/:id/reschedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2026-02-12",
  "timeSlot": "14:00"
}
```

---

## 📹 Consultation APIs

### Start Consultation (Doctor)
```http
POST /api/consultations/:appointmentId/start
Authorization: Bearer <doctor_token>

Response:
{
  "success": true,
  "data": {
    "consultationId": "uuid",
    "roomId": "consultation-xyz",
    "token": "video-token-for-webrtc"
  }
}
```

### Join Consultation (Patient)
```http
POST /api/consultations/:id/join
Authorization: Bearer <patient_token>

Response:
{
  "success": true,
  "data": {
    "consultationId": "uuid",
    "roomId": "consultation-xyz",
    "doctorName": "Dr. Kumar",
    "token": "video-token"
  }
}
```

### End Consultation (Doctor)
```http
PUT /api/consultations/:id/end
Authorization: Bearer <doctor_token>
Content-Type: application/json

{
  "diagnosis": "Viral fever",
  "notes": "Patient advised rest for 3 days",
  "followUpDate": "2026-02-15"
}
```

### Add Prescription (Doctor)
```http
POST /api/consultations/:id/prescription
Authorization: Bearer <doctor_token>
Content-Type: application/json

{
  "notes": "Take with food",
  "items": [
    {
      "medicineName": "Paracetamol 500mg",
      "dosage": "1 tablet",
      "frequency": "Three times daily",
      "duration": "5 days",
      "instructions": "After meals"
    }
  ]
}
```

---

## 🏥 Hospital APIs

### Get Nearby Hospitals
```http
GET /api/hospitals/nearby?latitude=28.6139&longitude=77.2090&radius=10&type=hospital

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "AIIMS Delhi",
      "type": "hospital",
      "address": "Ansari Nagar, New Delhi",
      "distanceText": "2.5 km",
      "eta": "8 min",
      "rating": 4.5,
      "isOpen": true,
      "isEmergencyAvailable": true
    }
  ]
}
```

### Get Emergency Hospitals
```http
GET /api/hospitals/emergency?latitude=28.6139&longitude=77.2090
```

### Get Pharmacies
```http
GET /api/hospitals/pharmacies?latitude=28.6139&longitude=77.2090
```

### Get Clinics
```http
GET /api/hospitals/clinics?latitude=28.6139&longitude=77.2090
```

### Get Diagnostic Centers
```http
GET /api/hospitals/diagnostic-centers?latitude=28.6139&longitude=77.2090
```

### Search Hospitals
```http
GET /api/hospitals/search?q=apollo&latitude=28.6139&longitude=77.2090
```

### Get Hospital Details
```http
GET /api/hospitals/:id

Returns hospital details with doctors and reviews
```

### Add Review
```http
POST /api/hospitals/:id/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "comment": "Excellent service!"
}
```

---

## 🚑 Ambulance APIs

### Request Ambulance (SOS)
```http
POST /api/ambulances/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "emergencyType": "cardiac",
  "patientName": "John Doe",
  "patientPhone": "+919876543210",
  "notes": "Heart attack symptoms"
}

Response:
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "ambulance": {
      "id": "uuid",
      "vehicleNumber": "DL-01-AB-1234",
      "driverName": "Rajesh Kumar",
      "driverPhone": "+919876543211",
      "type": "advanced",
      "currentLocation": { "latitude": 28.62, "longitude": 77.21 }
    },
    "estimatedArrival": "8 min",
    "distance": "3.2 km",
    "status": "dispatched"
  }
}
```

### Get Nearby Ambulances
```http
GET /api/ambulances/nearby?latitude=28.6139&longitude=77.2090
```

### Track Ambulance
```http
GET /api/ambulances/track/:requestId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "en_route",
    "currentLocation": { "latitude": 28.615, "longitude": 77.208 },
    "distance": "1.5 km",
    "estimatedArrival": "4 min"
  }
}
```

### Cancel Request
```http
POST /api/ambulances/cancel/:requestId
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Found alternative transport"
}
```

### Update Location (Driver)
```http
PUT /api/ambulances/location
Authorization: Bearer <driver_token>
Content-Type: application/json

{
  "latitude": 28.6150,
  "longitude": 77.2085,
  "heading": 45.0,
  "speed": 35.5
}
```

### Update Request Status (Driver)
```http
PUT /api/ambulances/request/:requestId/status
Authorization: Bearer <driver_token>
Content-Type: application/json

{
  "status": "arrived"  // en_route, arrived, picked_up, completed
}
```

---

## 💊 Medicine APIs

### Search Medicines
```http
GET /api/medicines/search?q=paracetamol&category=tablet&maxPrice=100

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Paracetamol 500mg",
      "genericName": "Paracetamol",
      "manufacturer": "Cipla",
      "price": 25.00,
      "category": "tablet",
      "requiresPrescription": false
    }
  ]
}
```

### Get Medicine Categories
```http
GET /api/medicines/categories
```

### Get Popular Medicines
```http
GET /api/medicines/popular?limit=10
```

### Get Medicine Availability
```http
GET /api/medicines/:id/availability?latitude=28.6139&longitude=77.2090

Response:
{
  "success": true,
  "data": {
    "medicine": { ... },
    "availability": [
      {
        "pharmacy": { "name": "Apollo Pharmacy", "distanceText": "0.5 km" },
        "stock": 50,
        "price": 25.00
      }
    ]
  }
}
```

### Get Alternatives (Generic)
```http
GET /api/medicines/:id/alternatives
```

---

## 🤖 Chatbot APIs

### Start Chat Session
```http
POST /api/chatbot/session/start
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    }
  }
}
```

### Send Message
```http
POST /api/chatbot/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "uuid",
  "message": "I have a headache and fever since yesterday"
}

Response:
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "I understand you're experiencing headache and fever..."
    },
    "recommendations": {
      "specialists": [{ "type": "general physician" }],
      "actions": [{ "type": "book_appointment", "label": "Book Doctor" }],
      "urgencyLevel": "moderate"
    }
  }
}
```

### Analyze Symptoms
```http
POST /api/chatbot/analyze-symptoms
Authorization: Bearer <token>
Content-Type: application/json

{
  "symptoms": "severe headache, nausea, sensitivity to light"
}

Response:
{
  "success": true,
  "data": {
    "possibleConditions": ["Migraine", "Tension headache"],
    "recommendedSpecialist": "Neurologist",
    "urgencyLevel": 3,
    "selfCareTips": ["Rest in a dark room", "Stay hydrated"],
    "shouldSeeDoctor": true,
    "timeframe": "within 24 hours"
  }
}
```

### Get Health Tips
```http
GET /api/chatbot/health-tips?category=general
```

---

## 📋 Report APIs

### Upload Report
```http
POST /api/reports
Authorization: Bearer <patient_token>
Content-Type: multipart/form-data

file: <report_file>
name: "Blood Test Report"
type: "blood_test"
date: "2026-02-01"
labName: "Dr. Lal PathLabs"
```

### Get Reports
```http
GET /api/reports?type=blood_test&status=normal
Authorization: Bearer <patient_token>
```

### Get Report Types
```http
GET /api/reports/types
```

### Get Prescriptions
```http
GET /api/reports/prescriptions
Authorization: Bearer <patient_token>
```

### Share Report with Doctor
```http
POST /api/reports/:id/share
Authorization: Bearer <patient_token>
Content-Type: application/json

{
  "doctorId": "uuid"
}
```

---

## 🔔 Notification APIs

### Get Notifications
```http
GET /api/notifications?page=1&limit=20
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 5
  }
}
```

### Mark as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

### Mark All as Read
```http
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

### Register Device (for Push Notifications)
```http
POST /api/notifications/register-device
Authorization: Bearer <token>
Content-Type: application/json

{
  "fcmToken": "firebase-cloud-messaging-token",
  "deviceType": "android"  // android, ios, web
}
```

---

## 🔌 WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});
```

### Ambulance Tracking
```javascript
// Track ambulance (patient)
socket.emit('ambulance:track', requestId);
socket.on('ambulance:location-update', (data) => {
  console.log('Ambulance location:', data);
});

// Update location (driver)
socket.emit('ambulance:location', {
  requestId,
  latitude: 28.615,
  longitude: 77.208,
  heading: 45,
  speed: 35
});
```

### Video Consultation
```javascript
// Join room
socket.emit('video:join', roomId);

// WebRTC signaling
socket.emit('video:offer', { roomId, offer });
socket.on('video:answer', ({ answer }) => { ... });
socket.emit('video:ice-candidate', { roomId, candidate });

// Controls
socket.emit('video:toggle-audio', { roomId, enabled: false });
socket.emit('video:toggle-video', { roomId, enabled: false });

// Leave
socket.emit('video:leave', roomId);
```

### Chat (during consultation)
```javascript
socket.emit('chat:join', consultationId);
socket.emit('chat:message', { consultationId, message: 'Hello doctor' });
socket.on('chat:message', (msg) => { ... });
```

---

## 📁 Project Structure

```
swastik-backend/
├── config/
│   ├── index.js          # Main configuration
│   ├── supabase.js       # Supabase client
│   └── minio.js          # MinIO file storage
├── database/
│   └── schema.sql        # PostgreSQL schema for Supabase
├── middleware/
│   ├── auth.js           # JWT authentication
│   ├── validate.js       # Request validation
│   ├── upload.js         # File upload (multer)
│   └── errorHandler.js   # Error handling
├── routes/
│   ├── auth/             # Authentication routes
│   ├── patient/          # Patient routes
│   ├── doctor/           # Doctor routes
│   ├── appointment/      # Appointment routes
│   ├── consultation/     # Video consultation routes
│   ├── hospital/         # Hospital/clinic finder
│   ├── ambulance/        # Ambulance tracking
│   ├── medicine/         # Medicine search
│   ├── chatbot/          # AI health assistant
│   ├── report/           # Medical reports
│   └── notification/     # Notifications
├── services/
│   ├── authService.js
│   ├── patientService.js
│   ├── doctorService.js
│   ├── appointmentService.js
│   ├── consultationService.js
│   ├── hospitalService.js
│   ├── ambulanceService.js
│   ├── medicineService.js
│   ├── chatbotService.js
│   ├── reportService.js
│   └── notificationService.js
├── sockets/
│   └── index.js          # Socket.io events
├── utils/
│   ├── helpers.js        # Utility functions
│   └── geo.js            # Geolocation utilities
├── .env.example
├── package.json
├── server.js             # Entry point
└── README.md
```

---

## 🔒 Security

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (12 rounds)
- Rate limiting (100 requests per 15 minutes)
- Helmet.js security headers
- CORS configuration
- Input validation with express-validator
- SQL injection protection via Supabase

---

## 📊 Health Check

```http
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2026-02-07T10:30:00.000Z",
  "environment": "development",
  "uptime": 3600
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 📞 Support

For support, email support@swastik.com or join our Slack channel.

---

Built with ❤️ by Swastik Healthcare Team
