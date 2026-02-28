# Swastik Healthcare App - Codebase Review & Backend Plan

## 📋 Executive Summary

This is a healthcare app built with Jetpack Compose for Android that includes features like:
- Patient authentication (login/register with OTP)
- Patient dashboard with health metrics
- Doctor consultations (video calls)
- Medicine finder
- Hospital/Pharmacy locator
- Appointment booking
- Medical reports & prescriptions
- AI Chatbot for health assistance
- Emergency SOS functionality

---

## 🔍 Current Codebase Analysis

### Architecture Overview

```
com.example.swastik/
├── data/
│   ├── model/          # Data classes (PatientProfile, MedicalModels)
│   └── repository/     # PatientRepository (currently using mock data)
├── navigation/
│   └── Screen.kt       # Navigation route definitions
└── ui/
    ├── components/     # Shared UI components
    ├── theme/          # Color, Theme definitions
    └── screens/
        ├── auth/       # Login, Register, OTP screens
        ├── consultation/ # Video call flow
        ├── doctor/     # Doctor-related screens
        └── patient/    # Patient dashboard & features
```

---

## ⚠️ Issues & Improvements Needed

### 1. **Architecture Issues**

#### ❌ No Proper Navigation Library
**Current:** Manual navigation using `currentScreen` state in `MainActivity.kt`
```kotlin
var currentScreen by remember { mutableStateOf(Screen.Home.route) }
when (currentScreen) { ... }
```

**Recommendation:** Use Jetpack Navigation Compose
```kotlin
// Add to build.gradle.kts
implementation("androidx.navigation:navigation-compose:2.7.7")

// Use NavHost for proper navigation with backstack support
```

#### ❌ No ViewModel Layer
**Current:** UI directly interacts with Repository
```kotlin
PatientRepository.initializePatientData(phoneNumber, name)
```

**Recommendation:** Add ViewModels for state management
```kotlin
class PatientViewModel : ViewModel() {
    private val repository: PatientRepository
    // Proper state management with LiveData/StateFlow
}
```

#### ❌ Singleton Repository Pattern
**Current:** `object PatientRepository` - hard to test, no DI
```kotlin
object PatientRepository { ... }
```

**Recommendation:** Use Dependency Injection (Hilt/Koin)
```kotlin
@Singleton
class PatientRepository @Inject constructor(
    private val apiService: SwastikApiService,
    private val localDatabase: SwastikDatabase
)
```

---

### 2. **Data Layer Issues**

#### ❌ No Network Layer
**Current:** All data is hardcoded/mock
```kotlin
fun loadSampleData() {
    _reminders.value = listOf(
        Reminder("Metformin 500mg", "8:00 AM", ...)
    )
}
```

**Recommendation:** Add Retrofit for API calls
```kotlin
interface SwastikApiService {
    @POST("auth/login")
    suspend fun login(@Body loginRequest: LoginRequest): Response<AuthResponse>
    
    @GET("patients/profile")
    suspend fun getProfile(): Response<PatientProfile>
}
```

#### ❌ No Local Database
**Recommendation:** Add Room for offline caching
```kotlin
@Entity(tableName = "patients")
data class PatientEntity(...)

@Dao
interface PatientDao {
    @Query("SELECT * FROM patients WHERE id = :id")
    suspend fun getPatient(id: String): PatientEntity?
}
```

---

### 3. **Security Issues**

#### ❌ No Token Management
**Current:** Login just initializes data without actual authentication
```kotlin
Button(onClick = {
    PatientRepository.initializePatientData(phoneNumber, name)
    onLoginSuccess()
})
```

**Recommendation:** Implement proper token handling
```kotlin
class AuthRepository @Inject constructor(
    private val tokenManager: TokenManager,
    private val apiService: SwastikApiService
) {
    suspend fun login(email: String, password: String): Result<AuthToken>
}
```

#### ❌ No Input Validation
**Current:** Minimal validation
```kotlin
enabled = email.isNotEmpty() && password.isNotEmpty()
```

**Recommendation:** Add proper validation
```kotlin
fun validateEmail(email: String): ValidationResult
fun validatePassword(password: String): ValidationResult
```

---

### 4. **Code Organization Issues**

#### ❌ Mixed Data Models
Models are scattered across different packages:
- `data/model/PatientProfile.kt`
- `ui/screens/patient/dashboard/DashboardModels.kt`
- `ui/screens/patient/medicine/MedicineRepository.kt`

**Recommendation:** Consolidate in `data/model/`

#### ❌ Repository in UI Package
`MedicineRepository.kt` is in `ui/screens/patient/medicine/`

**Recommendation:** Move to `data/repository/`

---

### 5. **Missing Features for Production**

- [ ] Error handling & retry logic
- [ ] Loading states
- [ ] Pull-to-refresh
- [ ] Pagination for lists
- [ ] Image loading (Coil/Glide)
- [ ] Push notifications (FCM)
- [ ] Analytics integration
- [ ] Crash reporting (Firebase Crashlytics)
- [ ] ProGuard rules for release

---

## 🏗️ Recommended Project Structure

```
com.example.swastik/
├── SwastikApplication.kt     # Application class with Hilt
├── MainActivity.kt
├── data/
│   ├── local/
│   │   ├── database/
│   │   │   ├── SwastikDatabase.kt
│   │   │   ├── dao/
│   │   │   │   ├── PatientDao.kt
│   │   │   │   └── AppointmentDao.kt
│   │   │   └── entity/
│   │   │       ├── PatientEntity.kt
│   │   │       └── AppointmentEntity.kt
│   │   └── preferences/
│   │       └── UserPreferences.kt
│   ├── remote/
│   │   ├── api/
│   │   │   └── SwastikApiService.kt
│   │   ├── dto/
│   │   │   ├── request/
│   │   │   │   ├── LoginRequest.kt
│   │   │   │   └── RegisterRequest.kt
│   │   │   └── response/
│   │   │       ├── AuthResponse.kt
│   │   │       └── PatientResponse.kt
│   │   └── interceptors/
│   │       └── AuthInterceptor.kt
│   ├── repository/
│   │   ├── AuthRepository.kt
│   │   ├── PatientRepository.kt
│   │   ├── DoctorRepository.kt
│   │   └── AppointmentRepository.kt
│   └── model/
│       ├── Patient.kt
│       ├── Doctor.kt
│       ├── Appointment.kt
│       └── Medicine.kt
├── domain/
│   ├── usecase/
│   │   ├── auth/
│   │   │   ├── LoginUseCase.kt
│   │   │   └── RegisterUseCase.kt
│   │   ├── patient/
│   │   │   └── GetPatientProfileUseCase.kt
│   │   └── appointment/
│   │       └── BookAppointmentUseCase.kt
│   └── repository/
│       └── interfaces...
├── di/
│   ├── AppModule.kt
│   ├── NetworkModule.kt
│   └── DatabaseModule.kt
├── navigation/
│   └── SwastikNavGraph.kt
├── ui/
│   ├── components/
│   ├── theme/
│   └── screens/
│       ├── auth/
│       │   ├── login/
│       │   │   ├── LoginScreen.kt
│       │   │   └── LoginViewModel.kt
│       │   └── register/
│       │       ├── RegisterScreen.kt
│       │       └── RegisterViewModel.kt
│       └── patient/
│           └── dashboard/
│               ├── DashboardScreen.kt
│               └── DashboardViewModel.kt
└── util/
    ├── Constants.kt
    ├── Resource.kt
    └── Extensions.kt
```

---

## 🖥️ Node.js Backend Architecture

### Recommended Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ LTS |
| Framework | Express.js or Fastify |
| Database | PostgreSQL (primary) + Redis (cache) |
| ORM | Prisma or TypeORM |
| Authentication | JWT + Refresh tokens |
| Validation | Joi or Zod |
| Documentation | Swagger/OpenAPI |
| Real-time | Socket.io (for video call signaling) |
| File Storage | AWS S3 / Cloudinary |
| Video Calls | WebRTC + Twilio/Agora |
| SMS/OTP | Twilio / MSG91 |
| Email | SendGrid / Nodemailer |

---

### Backend Project Structure

```
swastik-backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── env.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.validation.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   ├── patient/
│   │   │   ├── patient.controller.ts
│   │   │   ├── patient.service.ts
│   │   │   ├── patient.routes.ts
│   │   │   └── dto/
│   │   ├── doctor/
│   │   │   ├── doctor.controller.ts
│   │   │   ├── doctor.service.ts
│   │   │   └── doctor.routes.ts
│   │   ├── appointment/
│   │   │   ├── appointment.controller.ts
│   │   │   ├── appointment.service.ts
│   │   │   └── appointment.routes.ts
│   │   ├── medicine/
│   │   │   ├── medicine.controller.ts
│   │   │   ├── medicine.service.ts
│   │   │   └── medicine.routes.ts
│   │   ├── hospital/
│   │   │   ├── hospital.controller.ts
│   │   │   ├── hospital.service.ts
│   │   │   └── hospital.routes.ts
│   │   ├── consultation/
│   │   │   ├── consultation.controller.ts
│   │   │   ├── consultation.service.ts
│   │   │   ├── video-signaling.gateway.ts
│   │   │   └── consultation.routes.ts
│   │   ├── report/
│   │   │   ├── report.controller.ts
│   │   │   ├── report.service.ts
│   │   │   └── report.routes.ts
│   │   └── notification/
│   │       ├── notification.service.ts
│   │       ├── push-notification.service.ts
│   │       └── sms.service.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── utils/
│   │   ├── jwt.util.ts
│   │   ├── otp.util.ts
│   │   ├── password.util.ts
│   │   └── response.util.ts
│   ├── types/
│   │   └── express.d.ts
│   ├── app.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   └── integration/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── .env.example
```

---

### Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ AUTH & USERS ============

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  phone         String    @unique
  passwordHash  String
  role          UserRole  @default(PATIENT)
  isVerified    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  patient       Patient?
  doctor        Doctor?
  refreshTokens RefreshToken[]
}

enum UserRole {
  PATIENT
  DOCTOR
  ADMIN
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model OtpVerification {
  id        String   @id @default(uuid())
  phone     String
  otp       String
  expiresAt DateTime
  verified  Boolean  @default(false)
  createdAt DateTime @default(now())
}

// ============ PATIENT ============

model Patient {
  id              String    @id @default(uuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  age             Int?
  gender          Gender?
  bloodGroup      String?
  weight          Float?
  height          Float?
  location        String?
  abhaNumber      String?   @unique
  profileImageUrl String?
  
  appointments    Appointment[]
  consultations   Consultation[]
  reports         Report[]
  prescriptions   Prescription[]
  reminders       Reminder[]
  emergencyContacts EmergencyContact[]
  familyMembers   FamilyMember[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

model EmergencyContact {
  id        String  @id @default(uuid())
  patientId String
  patient   Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  name      String
  phone     String
  relation  String
}

model FamilyMember {
  id        String  @id @default(uuid())
  patientId String
  patient   Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  name      String
  phone     String
  relation  String
}

// ============ DOCTOR ============

model Doctor {
  id              String    @id @default(uuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  specialization  String
  experience      Int       // Years
  qualifications  String[]
  registrationNo  String    @unique
  hospitalId      String?
  hospital        Hospital? @relation(fields: [hospitalId], references: [id])
  consultationFee Int
  rating          Float     @default(0)
  reviewCount     Int       @default(0)
  profileImageUrl String?
  languages       String[]
  isAvailable     Boolean   @default(true)
  
  availableSlots  DoctorSlot[]
  appointments    Appointment[]
  consultations   Consultation[]
  prescriptions   Prescription[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model DoctorSlot {
  id         String    @id @default(uuid())
  doctorId   String
  doctor     Doctor    @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  dayOfWeek  Int       // 0-6 (Sunday-Saturday)
  startTime  String    // "09:00"
  endTime    String    // "17:00"
  isActive   Boolean   @default(true)
}

// ============ HOSPITAL ============

model Hospital {
  id                  String   @id @default(uuid())
  name                String
  type                FacilityType
  address             String
  city                String
  latitude            Float
  longitude           Float
  phone               String
  email               String?
  rating              Float    @default(0)
  reviewCount         Int      @default(0)
  openTime            String
  closeTime           String
  isEmergencyAvailable Boolean @default(false)
  specializations     String[]
  imageUrl            String?
  
  doctors             Doctor[]
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

enum FacilityType {
  HOSPITAL
  CLINIC
  MEDICAL_STORE
  DIAGNOSTIC_CENTER
}

// ============ APPOINTMENT ============

model Appointment {
  id              String            @id @default(uuid())
  patientId       String
  patient         Patient           @relation(fields: [patientId], references: [id])
  doctorId        String
  doctor          Doctor            @relation(fields: [doctorId], references: [id])
  type            AppointmentType
  date            DateTime
  timeSlot        String
  status          AppointmentStatus @default(SCHEDULED)
  notes           String?
  cancellationReason String?
  
  consultation    Consultation?
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

enum AppointmentType {
  VIDEO_CONSULTATION
  CLINIC_VISIT
  HOME_VISIT
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

// ============ CONSULTATION ============

model Consultation {
  id            String      @id @default(uuid())
  appointmentId String      @unique
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  patientId     String
  patient       Patient     @relation(fields: [patientId], references: [id])
  doctorId      String
  doctor        Doctor      @relation(fields: [doctorId], references: [id])
  
  diagnosis     String?
  notes         String?
  followUpDate  DateTime?
  duration      Int?        // Minutes
  
  prescriptions Prescription[]
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

// ============ PRESCRIPTION ============

model Prescription {
  id              String        @id @default(uuid())
  consultationId  String
  consultation    Consultation  @relation(fields: [consultationId], references: [id])
  patientId       String
  patient         Patient       @relation(fields: [patientId], references: [id])
  doctorId        String
  doctor          Doctor        @relation(fields: [doctorId], references: [id])
  
  items           PrescriptionItem[]
  notes           String?
  fileUrl         String?
  
  createdAt       DateTime      @default(now())
}

model PrescriptionItem {
  id             String       @id @default(uuid())
  prescriptionId String
  prescription   Prescription @relation(fields: [prescriptionId], references: [id], onDelete: Cascade)
  medicineName   String
  dosage         String
  frequency      String
  duration       String
  instructions   String?
}

// ============ REPORTS ============

model Report {
  id          String        @id @default(uuid())
  patientId   String
  patient     Patient       @relation(fields: [patientId], references: [id])
  name        String
  type        ReportType
  date        DateTime
  labName     String?
  status      ReportStatus  @default(PENDING)
  fileUrl     String?
  fileSize    String?
  doctorNotes String?
  
  parameters  ReportParameter[]
  
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

enum ReportType {
  BLOOD_TEST
  URINE_TEST
  X_RAY
  MRI
  CT_SCAN
  ECG
  ULTRASOUND
  OTHER
}

enum ReportStatus {
  PENDING
  NORMAL
  ABNORMAL
  CRITICAL
}

model ReportParameter {
  id          String  @id @default(uuid())
  reportId    String
  report      Report  @relation(fields: [reportId], references: [id], onDelete: Cascade)
  name        String
  value       String
  unit        String
  normalRange String
  status      ParameterStatus
}

enum ParameterStatus {
  NORMAL
  LOW
  HIGH
  CRITICAL
}

// ============ MEDICINE ============

model Medicine {
  id                  String           @id @default(uuid())
  name                String
  genericName         String?
  manufacturer        String
  category            MedicineCategory
  price               Float
  description         String?
  requiresPrescription Boolean         @default(false)
  imageUrl            String?
  
  inventory           MedicineInventory[]
  
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
}

enum MedicineCategory {
  TABLET
  CAPSULE
  SYRUP
  INJECTION
  OINTMENT
  DROPS
  POWDER
}

model MedicineInventory {
  id          String   @id @default(uuid())
  medicineId  String
  medicine    Medicine @relation(fields: [medicineId], references: [id])
  pharmacyId  String
  pharmacy    Pharmacy @relation(fields: [pharmacyId], references: [id])
  stock       Int
  price       Float
  updatedAt   DateTime @updatedAt
}

model Pharmacy {
  id        String   @id @default(uuid())
  name      String
  address   String
  latitude  Float
  longitude Float
  phone     String
  isOpen    Boolean  @default(true)
  
  inventory MedicineInventory[]
}

// ============ REMINDERS ============

model Reminder {
  id          String       @id @default(uuid())
  patientId   String
  patient     Patient      @relation(fields: [patientId], references: [id], onDelete: Cascade)
  title       String
  type        ReminderType
  time        String
  isCompleted Boolean      @default(false)
  isActive    Boolean      @default(true)
  
  createdAt   DateTime     @default(now())
}

enum ReminderType {
  MEDICINE
  APPOINTMENT
  TEST
}

// ============ NOTIFICATIONS ============

model Notification {
  id        String           @id @default(uuid())
  userId    String
  title     String
  message   String
  type      NotificationType
  isRead    Boolean          @default(false)
  data      Json?
  createdAt DateTime         @default(now())
}

enum NotificationType {
  APPOINTMENT
  MEDICINE_REMINDER
  REPORT_READY
  PRESCRIPTION
  OFFER
  SYSTEM
}
```

---

### API Endpoints

```yaml
# Authentication
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login with email/password
POST   /api/auth/send-otp          # Send OTP to phone
POST   /api/auth/verify-otp        # Verify OTP
POST   /api/auth/refresh-token     # Refresh access token
POST   /api/auth/logout            # Logout user
POST   /api/auth/forgot-password   # Initiate password reset
POST   /api/auth/reset-password    # Reset password

# Patient
GET    /api/patients/profile       # Get patient profile
PUT    /api/patients/profile       # Update profile
PUT    /api/patients/profile/image # Upload profile image
GET    /api/patients/dashboard     # Get dashboard data
GET    /api/patients/health-stats  # Get health statistics

# Doctors
GET    /api/doctors                # List doctors (with filters)
GET    /api/doctors/:id            # Get doctor details
GET    /api/doctors/:id/slots      # Get available slots
GET    /api/doctors/specialties    # List all specialties

# Appointments
POST   /api/appointments           # Book appointment
GET    /api/appointments           # List appointments
GET    /api/appointments/:id       # Get appointment details
PUT    /api/appointments/:id       # Update appointment
DELETE /api/appointments/:id       # Cancel appointment

# Consultations
POST   /api/consultations/:appointmentId/start   # Start consultation
PUT    /api/consultations/:id/end                # End consultation
GET    /api/consultations                        # List past consultations
GET    /api/consultations/:id                    # Get consultation details

# Video Call (WebRTC Signaling)
WS     /ws/video/:consultationId   # WebSocket for video signaling

# Medicines
GET    /api/medicines              # Search medicines
GET    /api/medicines/:id          # Get medicine details
GET    /api/medicines/nearby       # Get nearby pharmacies with stock

# Hospitals
GET    /api/hospitals              # List hospitals (with filters)
GET    /api/hospitals/:id          # Get hospital details
GET    /api/hospitals/nearby       # Get nearby hospitals

# Reports
GET    /api/reports                # List reports
POST   /api/reports                # Upload report
GET    /api/reports/:id            # Get report details
DELETE /api/reports/:id            # Delete report

# Prescriptions
GET    /api/prescriptions          # List prescriptions
GET    /api/prescriptions/:id      # Get prescription details
GET    /api/prescriptions/:id/pdf  # Download prescription PDF

# Reminders
GET    /api/reminders              # List reminders
POST   /api/reminders              # Create reminder
PUT    /api/reminders/:id          # Update reminder
DELETE /api/reminders/:id          # Delete reminder

# Notifications
GET    /api/notifications          # List notifications
PUT    /api/notifications/:id/read # Mark as read
DELETE /api/notifications/:id      # Delete notification

# Emergency
POST   /api/emergency/sos          # Trigger SOS
GET    /api/emergency/ambulances   # Get nearby ambulances
```

---

### Step-by-Step Backend Implementation

#### Phase 1: Project Setup (Day 1-2)
1. Initialize Node.js project with TypeScript
2. Set up Express/Fastify
3. Configure ESLint, Prettier
4. Set up PostgreSQL with Prisma
5. Docker compose for local dev

#### Phase 2: Authentication (Day 3-5)
1. User registration/login
2. JWT token management
3. OTP verification (Twilio/MSG91)
4. Password hashing (bcrypt)
5. Refresh token rotation

#### Phase 3: Core Patient Features (Day 6-10)
1. Patient profile CRUD
2. Dashboard data aggregation
3. Reminders management
4. Emergency contacts

#### Phase 4: Doctor & Appointments (Day 11-15)
1. Doctor listing and search
2. Slot management
3. Appointment booking flow
4. Appointment status management

#### Phase 5: Consultation & Video (Day 16-20)
1. Consultation management
2. WebRTC signaling server (Socket.io)
3. Integration with Twilio/Agora
4. Prescription generation

#### Phase 6: Medicine & Hospital (Day 21-25)
1. Medicine search with filters
2. Nearby pharmacy with stock
3. Hospital listing with geospatial queries
4. Emergency services

#### Phase 7: Reports & Files (Day 26-28)
1. File upload (S3/Cloudinary)
2. Report management
3. PDF generation for prescriptions

#### Phase 8: Notifications (Day 29-30)
1. Push notifications (FCM)
2. SMS notifications
3. Email notifications
4. Real-time updates

---

### Quick Start Commands

```bash
# Create backend project
mkdir swastik-backend && cd swastik-backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express cors helmet morgan dotenv
npm install prisma @prisma/client
npm install jsonwebtoken bcryptjs
npm install zod express-validator
npm install socket.io
npm install -D typescript @types/node @types/express
npm install -D ts-node nodemon
npm install -D @types/jsonwebtoken @types/bcryptjs

# Initialize TypeScript
npx tsc --init

# Initialize Prisma
npx prisma init

# Development
npm run dev

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

---

## 📱 Android App Changes for Backend Integration

### Add Dependencies

```kotlin
// app/build.gradle.kts
dependencies {
    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    
    // Dependency Injection
    implementation("com.google.dagger:hilt-android:2.50")
    kapt("com.google.dagger:hilt-compiler:2.50")
    implementation("androidx.hilt:hilt-navigation-compose:1.1.0")
    
    // Room Database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")
    
    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.7")
    
    // DataStore
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    
    // Image Loading
    implementation("io.coil-kt:coil-compose:2.5.0")
    
    // Video Call
    implementation("io.agora.rtc:full-sdk:4.2.6")
}
```

---

## ✅ Action Items

### Immediate (Before Backend)
1. [ ] Add Jetpack Navigation
2. [ ] Implement ViewModel pattern
3. [ ] Add Hilt for DI
4. [ ] Create API service interfaces
5. [ ] Add loading/error states to UI

### Backend Development
1. [ ] Set up Node.js project
2. [ ] Configure PostgreSQL + Prisma
3. [ ] Implement auth module
4. [ ] Implement patient module
5. [ ] Implement doctor module
6. [ ] Implement appointment module
7. [ ] Add video call signaling
8. [ ] Deploy to cloud (AWS/GCP/Heroku)

### Final Integration
1. [ ] Connect Android app to backend
2. [ ] Implement token refresh
3. [ ] Add offline support with Room
4. [ ] Testing & bug fixes

---

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [WebRTC with Socket.io](https://socket.io/get-started/chat)
- [Android Clean Architecture](https://developer.android.com/topic/architecture)

---

*Generated on: February 7, 2026*
