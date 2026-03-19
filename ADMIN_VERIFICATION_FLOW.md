# Admin Registration Verification & End-to-End Flow

Complete documentation of how admin verifies all provider registrations and how data flows through the healthcare ecosystem to reach patients.

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Registration Flow by Role](#registration-flow-by-role)
3. [Admin Verification Process](#admin-verification-process)
4. [Data Flow to Patient App](#data-flow-to-patient-app)
5. [Database Schema](#database-schema)
6. [Real-Time Updates](#real-time-updates)
7. [Complete End-to-End Journey](#complete-end-to-end-journey)

---

## Overview

The Swastik healthcare ecosystem uses a **centralized admin approval workflow** that manages registrations from 6 provider types:

```
Provider Registration → Pending Status → Admin Review → Approval/Rejection → Patient Visibility
     (Step 1)            (Step 2)        (Step 3)      (Step 4)           (Step 5)
```

### Key Approval Fields (Across All Provider Tables)

```javascript
// Every provider table has these fields
is_approved: boolean              // Overall approval flag
approval_status: string           // 'pending' | 'approved' | 'rejected' | 'suspended'
approval_notes: string            // Admin's feedback/reason
approved_by: UUID                 // Admin user ID who approved
approved_at: timestamp            // When approval occurred
is_active: boolean                // Active status (not for doctors)
```

---

## Registration Flow by Role

### 1️⃣ DOCTOR Registration

**Endpoint:** `POST /api/auth/register`

```javascript
{
  email: "dr.smith@example.com",
  password: "SecurePass123",
  name: "Dr. Smith",
  role: "doctor",
  specialization: "Cardiology",
  licenseNumber: "MCI/12345",
  experienceYears: 5,
  consultationFee: 500
}
```

**Flow:**
1. User calls auth register endpoint
2. System creates `users` entry with `role: 'doctor'`, `is_verified: false`
3. System creates `doctors` entry with:
   ```javascript
   {
     user_id: UUID,
     name: "Dr. Smith",
     specialization: "Cardiology",
     license_number: "MCI/12345",
     experience_years: 5,
     consultation_fee: 500,
     is_approved: false,
     approval_status: 'pending'  // ← Awaiting admin review
   }
   ```
4. Verification email sent to doctor
5. Doctor is **NOT visible** to patients until approved

---

### 2️⃣ HOSPITAL Owner Registration

**Endpoint:** `POST /api/auth/register`

```javascript
{
  email: "owner@hospital.com",
  password: "SecurePass123",
  name: "City Hospital",
  role: "hospital_owner",
  licenseNumber: "REG/2024/001",
  phone: "+91-9876543210",
  address: "123 Medical Road, Mumbai",
  city: "Mumbai",
  latitude: 19.0760,
  longitude: 72.8777
}
```

**Flow:**
1. Creates `users` entry with `role: 'hospital_owner'`
2. Creates `hospitals` entry with:
   ```javascript
   {
     owner_id: UUID,
     name: "City Hospital",
     license_number: "REG/2024/001",
     phone: "+91-9876543210",
     address: "123 Medical Road, Mumbai",
     city: "Mumbai",
     latitude: 19.0760,
     longitude: 72.8777,
     is_approved: false,
     approval_status: 'pending',  // ← Awaiting admin review
     is_active: false             // Disabled until approved
   }
   ```
3. Coordinates stored for geolocation search
4. Not searchable by patients until approved

---

### 3️⃣ CLINIC Owner Registration

**Endpoint:** `POST /api/auth/register`

```javascript
{
  email: "clinic@example.com",
  password: "SecurePass123",
  name: "wellness Clinic",
  role: "clinic_owner",
  registrationNumber: "CLINIC/2024/001",
  licenseNumber: "LIC/2024/001",
  phone: "+91-9876543210",
  address: "456 Health Street, Mumbai",
  city: "Mumbai"
}
```

**Flow:**
1. Creates `users` entry with `role: 'clinic_owner'`
2. Creates `clinics` entry with:
   ```javascript
   {
     owner_id: UUID,
     name: "Wellness Clinic",
     registration_number: "CLINIC/2024/001",
     license_number: "LIC/2024/001",
     phone: "+91-9876543210",
     address: "456 Health Street, Mumbai",
     city: "Mumbai",
     is_approved: false,
     approval_status: 'pending',  // ← Awaiting admin review
     is_active: false
   }
   ```
3. Pending until admin verification

---

### 4️⃣ PHARMACY Owner Registration

**Endpoint:** `POST /api/auth/register`

```javascript
{
  email: "pharma@example.com",
  password: "SecurePass123",
  name: "HealthPharma",
  role: "pharmacy_owner",
  licenseNumber: "PHARMA/2024/001",
  phone: "+91-9876543210",
  address: "789 Medicine Road, Mumbai",
  city: "Mumbai"
}
```

**Flow:**
1. Creates `users` entry with `role: 'pharmacy_owner'`
2. Creates `pharmacies` entry with:
   ```javascript
   {
     owner_id: UUID,
     name: "HealthPharma",
     license_number: "PHARMA/2024/001",
     phone: "+91-9876543210",
     address: "789 Medicine Road, Mumbai",
     city: "Mumbai",
     is_approved: false,
     approval_status: 'pending',  // ← Awaiting admin review
     is_active: false
   }
   ```
3. Inventory not visible to patients until approved

---

### 5️⃣ DIAGNOSTIC CENTER Owner Registration

**Endpoint:** `POST /api/auth/register`

```javascript
{
  email: "diagnostics@example.com",
  password: "SecurePass123",
  name: "Advanced Diagnostics",
  role: "diagnostic_center_owner",
  registrationNumber: "DIAG/2024/001",
  licenseNumber: "LIC/DIAG/2024/001",
  phone: "+91-9876543210",
  address: "321 Test Road, Mumbai",
  city: "Mumbai"
}
```

**Flow:**
1. Creates `users` entry with `role: 'diagnostic_center_owner'`
2. Creates `diagnostic_centers` entry with:
   ```javascript
   {
     owner_id: UUID,
     name: "Advanced Diagnostics",
     registration_number: "DIAG/2024/001",
     license_number: "LIC/DIAG/2024/001",
     phone: "+91-9876543210",
     address: "321 Test Road, Mumbai",
     city: "Mumbai",
     is_approved: false,
     approval_status: 'pending',  // ← Awaiting admin review
     is_active: false
   }
   ```
4. Test packages hidden from patients until approved

---

### 6️⃣ AMBULANCE Operator Registration

**Endpoint:** `POST /api/auth/register`

```javascript
{
  email: "ambulance@operator.com",
  password: "SecurePass123",
  name: "Emergency Ambulance Service",
  role: "ambulance_operator",
  companyName: "Emergency Ambulance Service",
  phone: "+91-9876543210"
}
```

**Flow:**
1. Creates `users` entry with `role: 'ambulance_operator'`
2. Creates `ambulance_operators` entry with:
   ```javascript
   {
     user_id: UUID,
     name: "Emergency Ambulance Service",
     company_name: "Emergency Ambulance Service",
     phone: "+91-9876543210",
     is_approved: false,
     approval_status: 'pending',  // ← Awaiting admin review
     is_active: false              // Disabled until approved
   }
   ```
3. Cannot receive emergency dispatch requests until approved

---

## Admin Verification Process

### Step 1: Admin Views Pending Approvals

**Endpoint:** `GET /api/admin/approvals/pending?type=all&page=1&limit=20`

**Admin UI:** [swastik-web/src/app/admin/approvals/page.tsx](swastik-web/src/app/admin/approvals/page.tsx)

**Response Structure:**
```javascript
{
  success: true,
  data: {
    doctors: [
      {
        id: UUID,
        user_id: UUID,
        name: "Dr. Smith",
        specialization: "Cardiology",
        license_number: "MCI/12345",
        experience_years: 5,
        consultation_fee: 500,
        email: "dr.smith@example.com",
        approval_status: 'pending',
        created_at: "2024-03-19T10:30:00Z"
      },
      // ... more doctors
    ],
    hospitals: [
      {
        id: UUID,
        owner_id: UUID,
        name: "City Hospital",
        license_number: "REG/2024/001",
        address: "123 Medical Road, Mumbai",
        email: "owner@hospital.com",
        approval_status: 'pending',
        created_at: "2024-03-19T11:00:00Z"
      },
      // ... more hospitals
    ],
    clinics: [...],
    pharmacies: [...],
    diagnostic_centers: [...],
    ambulances: [...]
  },
  pagination: { page: 1, limit: 20 }
}
```

### Step 2: Admin Reviews Provider Details

**Endpoint:** `GET /api/admin/providers/:type/:id`

**Example:** `GET /api/admin/providers/doctor/uuid-123`

**Response:**
```javascript
{
  success: true,
  data: {
    id: UUID,
    user_id: UUID,
    name: "Dr. Smith",
    specialization: "Cardiology",
    license_number: "MCI/12345",
    experience_years: 5,
    consultation_fee: 500,
    email: "dr.smith@example.com",
    phone: "+91-9876543210",
    address: "Hospital Address",
    profile_image: "https://...",
    approval_status: 'pending',
    approval_notes: null,
    created_at: "2024-03-19T10:30:00Z",
    // Additional fields for verification
    registration_documents: [...],
    verification_status: "pending"
  }
}
```

### Step 3A: Admin APPROVES Provider

**Endpoint:** `POST /api/admin/providers/:type/:id/approve`

**Request Body:**
```javascript
{
  notes: "License verified. All documents in order."
}
```

**Backend Process (enhancedAdminService.js):**

```javascript
const approveProvider = async (type, id, adminId, notes) => {
  // 1. Get provider snapshot (for audit logging)
  const before = await getProviderSnapshot(type, id);
  
  // 2. Update provider record
  const updatePayload = {
    is_approved: true,
    approval_status: 'approved',  // ← Status changes to 'approved'
    approval_notes: notes,
    approved_by: adminId,         // ← Admin ID recorded
    approved_at: new Date().toISOString(),  // ← Timestamp recorded
  };
  
  // 3. For non-doctor providers, also set is_active
  if (type !== 'doctor') {
    updatePayload.is_active = true;  // ← NOW VISIBLE TO PATIENTS
  }
  
  // 4. Update provider in database
  const { data: approvedProvider } = await supabaseAdmin
    .from(PROVIDER_TABLES[type])  // e.g., 'doctors' table
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();
  
  // 5. Mark user as verified
  const userId = approvedProvider.user_id || approvedProvider.owner_id;
  await supabaseAdmin
    .from('users')
    .update({ is_verified: true })
    .eq('id', userId);
  
  // 6. Invalidate caches
  await Promise.allSettled([
    cacheDel('admin:dashboard'),
    cacheDel(`auth_user:${userId}`)
  ]);
  
  // 7. Notify provider (email + in-app notification)
  await notifyProviderStatusChange({
    provider: approvedProvider,
    type,
    status: 'approved',
    notes
  });
  
  // 8. Broadcast catalog update (real-time socket event)
  eventEmitter.emitProviderCatalogUpdated({
    providerId: id,
    providerType: type,
    status: 'approved'
  });
  
  // 9. Log audit trail
  await logAudit({
    userId: adminId,
    action: 'provider.approved',
    entityType: type,
    entityId: id,
    oldData: before,
    newData: approvedProvider
  });
  
  return { data: approvedProvider, message: `${type} approved successfully` };
};
```

**Provider Receives Notification:**

```javascript
// In-app notification
{
  title: "Registration Approved! 🎉",
  message: "Your doctor registration has been approved. You can now start managing your clinic.",
  type: "system",
  data: { providerId: UUID, providerType: "doctor", action: "approved" }
}

// Email notification (via nodemailer/Gmail SMTP)
Subject: "Your Doctor Registration Has Been Approved"
Body: "Welcome to Swastik! Your registration has been approved. You can now start accepting patients..."
```

**Response:**
```javascript
{
  success: true,
  data: {
    id: UUID,
    user_id: UUID,
    name: "Dr. Smith",
    specialization: "Cardiology",
    is_approved: true,
    approval_status: 'approved',  // ← Changed
    approved_by: "admin-uuid",
    approved_at: "2024-03-19T14:30:00Z",
    is_verified: true
  },
  message: "doctor approved successfully"
}
```

### Step 3B: Admin REJECTS Provider

**Endpoint:** `POST /api/admin/providers/:type/:id/reject`

**Request Body:**
```javascript
{
  reason: "License number could not be verified. Please resubmit with updated documents."
}
```

**Backend Process:**

```javascript
const rejectProvider = async (type, id, adminId, reason) => {
  // Similar to approve, but:
  const updatePayload = {
    is_approved: false,
    approval_status: 'rejected',  // ← Status changes to 'rejected'
    approval_notes: reason,
    is_active: false              // For non-doctors
  };
  
  // Doctor-specific field
  if (type === 'doctor') {
    updatePayload.rejection_reason = reason;
  }
  
  // Update, notify, audit...
  // Provider receives rejection email with reason
};
```

### Step 3C: Admin SUSPENDS Active Provider

**Endpoint:** `POST /api/admin/providers/:type/:id/suspend`

**Request Body:**
```javascript
{
  reason: "Multiple patient complaints. Under investigation."
}
```

**Backend Process:**

```javascript
const suspendProvider = async (type, id, adminId, reason) => {
  const updatePayload = {
    is_approved: false,
    approval_status: 'suspended',  // ← Status changes to 'suspended'
    approval_notes: `Suspended: ${reason}`,
    is_active: false                // No longer visible to patients
  };
  
  // Doctor-specific fields
  if (type === 'doctor') {
    updatePayload.suspension_reason = reason;
    updatePayload.suspended_at = new Date().toISOString();
  }
  
  // Provider can no longer accept appointments
  // Existing appointments marked as cancelled
};
```

### Step 3D: Admin REACTIVATES Suspended Provider

**Endpoint:** `POST /api/admin/providers/:type/:id/reactivate`

**Request Body:**
```javascript
{
  notes: "Investigation complete. Provider cleared to resume operations."
}
```

**Backend Process:**

```javascript
const reactivateProvider = async (type, id, adminId, notes) => {
  const updatePayload = {
    is_approved: true,
    approval_status: 'approved',  // ← Back to approved
    approval_notes: notes,
    approved_by: adminId,
    approved_at: new Date().toISOString()
  };
  
  // For non-doctors
  if (type !== 'doctor') {
    updatePayload.is_active = true;  // ← Back to visible
  }
  
  // Provider can resume accepting appointments
};
```

---

## Data Flow to Patient App

### Query 1: Patient Views Available Doctors

**Patient App Endpoint:** `GET /api/doctors?page=1&limit=10&specialization=Cardiology`

**Backend (doctorService.getAllDoctors):**

```javascript
// Only return APPROVED doctors to patients
const { data: doctors } = await supabaseAdmin
  .from('doctors')
  .select('id, name, specialization, experience_years, consultation_fee, is_available, rating, profile_image')
  .eq('approval_status', 'approved')  // ← CRITICAL: Only approved
  .eq('is_approved', true)            // ← Double-check
  .eq('specialization', 'Cardiology')
  .order('rating', { ascending: false })
  .range(offset, offset + limit - 1);

// Filter that FILTERS OUT rejected/suspended/pending doctors
const filtered = doctors.filter(d => 
  d.approval_status === 'approved' && d.is_approved === true
);

return { data: filtered, total: doctors.length };
```

**Patient Receives:**
```javascript
{
  success: true,
  data: [
    {
      id: UUID,
      name: "Dr. Smith",
      specialization: "Cardiology",
      experience_years: 5,
      consultation_fee: 500,
      is_available: true,
      rating: 4.8,
      profile_image: "https://..."
      // ← NO approval_status field sent to patient
    },
    // ... more approved doctors
  ],
  total: 15,
  page: 1,
  limit: 10
}
```

### Query 2: Patient Views Available Hospitals

**Patient App Endpoint:** `GET /api/hospital?type=General&city=Mumbai`

**Backend (hospitalService.getHospitals):**

```javascript
// Only return APPROVED and ACTIVE hospitals
const { data: hospitals } = await supabaseAdmin
  .from('hospitals')
  .select('id, name, address, city, phone, latitude, longitude, type, rating')
  .eq('approval_status', 'approved')  // ← Only approved
  .eq('is_approved', true)
  .eq('is_active', true)              // ← Must be active
  .eq('city', 'Mumbai')
  .order('rating', { ascending: false });
```

### Query 3: Patient Books Appointment with Approved Doctor

**Patient App Endpoint:** `POST /api/appointments`

**Request:**
```javascript
{
  doctorId: "uuid-doctor-123",
  slotId: "uuid-slot-456",
  symptoms: "Chest pain, shortness of breath"
}
```

**Backend Validation (appointmentService.createAppointment):**

```javascript
// VALIDATE: Doctor must be approved
const { data: doctor } = await supabaseAdmin
  .from('doctors')
  .select('*')
  .eq('id', doctorId)
  .eq('approval_status', 'approved')  // ← Verify approved
  .eq('is_approved', true)
  .single();

if (!doctor) {
  throw new ApiError(400, 'Doctor is not available or not approved');
}

// VALIDATE: Slot must belong to approved doctor
const { data: slot } = await supabaseAdmin
  .from('doctor_slots')
  .select('*')
  .eq('id', slotId)
  .eq('doctor_id', doctorId)
  .single();

if (!slot) {
  throw new ApiError(400, 'Slot not found for this doctor');
}

// Create appointment only if all validations pass
const { data: appointment } = await supabaseAdmin
  .from('appointments')
  .insert({
    patient_id: patientId,
    doctor_id: doctorId,
    slot_id: slotId,
    symptoms: symptoms,
    status: 'scheduled',
    created_at: new Date().toISOString()
  })
  .select('*')
  .single();

// Notify doctor + broadcast
eventEmitter.emitAppointmentCreated(appointment);
```

### Query 4: Patient Orders Medicines from Approved Pharmacy

**Patient App Endpoint:** `POST /api/pharmacy/orders`

**Request:**
```javascript
{
  pharmacyId: "uuid-pharmacy-789",
  medicines: [
    { medicineId: "med-1", quantity: 1 },
    { medicineId: "med-2", quantity: 2 }
  ]
}
```

**Backend Validation:**

```javascript
// VALIDATE: Pharmacy must be approved and active
const { data: pharmacy } = await supabaseAdmin
  .from('pharmacies')
  .select('*')
  .eq('id', pharmacyId)
  .eq('approval_status', 'approved')  // ← Verify approved
  .eq('is_approved', true)
  .eq('is_active', true)
  .single();

if (!pharmacy) {
  throw new ApiError(400, 'Pharmacy is not available');
}

// Create order
const { data: order } = await supabaseAdmin
  .from('pharmacy_orders')
  .insert({
    patient_id: patientId,
    pharmacy_id: pharmacyId,
    medicines: medicines,
    status: 'pending',
    created_at: new Date().toISOString()
  })
  .select('*')
  .single();

// Notify pharmacy owner
eventEmitter.emitPharmacyOrderCreated(order);
```

### Query 5: Patient Requests Emergency Ambulance

**Patient App Endpoint:** `POST /api/emergency/dispatch`

**Request:**
```javascript
{
  latitude: 19.0760,
  longitude: 72.8777,
  symptoms: "Severe chest pain"
}
```

**Backend (dispatchService.dispatchEmergency):**

```javascript
// 1. Find APPROVED and ACTIVE ambulance operators
const { data: ambulances } = await supabaseAdmin
  .from('ambulance_operators')
  .select('id, name, phone')
  .eq('approval_status', 'approved')  // ← Only approved
  .eq('is_approved', true)
  .eq('is_active', true)              // ← Must be active
  .order('created_at', { ascending: false });

if (!ambulances || ambulances.length === 0) {
  throw new ApiError(503, 'No ambulances available. Please contact emergency services.');
}

// 2. Create emergency request
const { data: emergency } = await supabaseAdmin
  .from('emergency_requests')
  .insert({
    patient_id: patientId,
    latitude: latitude,
    longitude: longitude,
    symptoms: symptoms,
    status: 'broadcasting',  // Broadcasting to available ambulances
    created_at: new Date().toISOString()
  })
  .select('*')
  .single();

// 3. Broadcast to approved operators
ambulances.forEach(ambulance => {
  eventEmitter.emitEmergencyBroadcast({
    emergencyId: emergency.id,
    ambulanceId: ambulance.id,
    latitude: latitude,
    longitude: longitude,
    symptoms: symptoms
  });
});

return { data: emergency };
```

### Query 6: Patient Books Diagnostic Test from Approved Center

**Patient App Endpoint:** `POST /api/diagnostic/bookings`

**Request:**
```javascript
{
  diagnosticCenterId: "uuid-diag-456",
  testIds: ["test-1", "test-2"]
}
```

**Backend Validation:**

```javascript
// VALIDATE: Diagnostic center must be approved
const { data: center } = await supabaseAdmin
  .from('diagnostic_centers')
  .select('*')
  .eq('id', diagnosticCenterId)
  .eq('approval_status', 'approved')  // ← Verify approved
  .eq('is_approved', true)
  .eq('is_active', true)
  .single();

if (!center) {
  throw new ApiError(400, 'Diagnostic center is not available');
}

// Create booking
const { data: booking } = await supabaseAdmin
  .from('diagnostic_bookings')
  .insert({
    patient_id: patientId,
    diagnostic_center_id: diagnosticCenterId,
    tests: testIds,
    status: 'pending',
    created_at: new Date().toISOString()
  })
  .select('*')
  .single();

// Notify center
eventEmitter.emitDiagnosticBookingCreated(booking);
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('patient', 'doctor', 'hospital_owner', 'clinic_owner', 
            'pharmacy_owner', 'diagnostic_center_owner', 'ambulance_operator',
            'hospital_manager', 'ambulance_driver', 'admin', 'super_admin'),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,  -- Email verified
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Doctors Table
```sql
CREATE TABLE doctors (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  specialization VARCHAR(100),
  license_number VARCHAR(50),
  experience_years INT,
  consultation_fee INT,
  is_available BOOLEAN DEFAULT true,
  rating DECIMAL(3,2) DEFAULT 0,
  -- Approval workflow fields
  is_approved BOOLEAN DEFAULT false,           -- ← Admin approval
  approval_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approval_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,                       -- For rejections
  suspension_reason TEXT,                      -- For suspensions
  suspended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Hospitals Table
```sql
CREATE TABLE hospitals (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),  -- 'General', 'Specialized', 'Multi-specialty'
  address TEXT NOT NULL,
  city VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  license_number VARCHAR(50),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_emergency_available BOOLEAN DEFAULT false,
  is_24_hours BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0,
  -- Approval workflow fields
  is_approved BOOLEAN DEFAULT false,           -- ← Admin approval
  approval_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approval_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  is_active BOOLEAN DEFAULT false,             -- Also checks is_active for visibility
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Clinics Table
```sql
CREATE TABLE clinics (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  registration_number VARCHAR(50),
  license_number VARCHAR(50),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  rating DECIMAL(3,2) DEFAULT 0,
  -- Approval workflow fields
  is_approved BOOLEAN DEFAULT false,           -- ← Admin approval
  approval_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approval_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Pharmacies Table
```sql
CREATE TABLE pharmacies (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  license_number VARCHAR(50),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  rating DECIMAL(3,2) DEFAULT 0,
  -- Approval workflow fields
  is_approved BOOLEAN DEFAULT false,           -- ← Admin approval
  approval_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approval_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Diagnostic Centers Table
```sql
CREATE TABLE diagnostic_centers (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  registration_number VARCHAR(50),
  license_number VARCHAR(50),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  rating DECIMAL(3,2) DEFAULT 0,
  -- Approval workflow fields
  is_approved BOOLEAN DEFAULT false,           -- ← Admin approval
  approval_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approval_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Ambulance Operators Table
```sql
CREATE TABLE ambulance_operators (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  rating DECIMAL(3,2) DEFAULT 0,
  -- Approval workflow fields
  is_approved BOOLEAN DEFAULT false,           -- ← Admin approval
  approval_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approval_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

---

## Real-Time Updates

### Socket.IO Events Broadcast on Approval

When admin approves a provider, the system broadcasts real-time updates:

```javascript
// 1. Provider receives approval notification
socket.emit('provider.approved', {
  providerId: UUID,
  providerType: 'doctor',  // or 'hospital', 'pharmacy', etc.
  approvalTime: '2024-03-19T14:30:00Z',
  message: 'Your registration has been approved!'
});

// 2. Admin receives dashboard update
socket.emit('admin.pendingApprovalsUpdated', {
  doctorsPending: 2,
  hospitalsPending: 1,
  clinicsPending: 3,
  // ... all provider types
});

// 3. Patients receive provider catalog update
socket.emit('catalog.providerAvailable', {
  providerId: UUID,
  providerType: 'doctor',
  providerName: 'Dr. Smith',
  action: 'added'  // or 'removed' on rejection/suspension
});

// 4. Provider location services updated (if applicable)
socket.emit('geography.providerLocationUpdated', {
  providerId: UUID,
  latitude: 19.0760,
  longitude: 72.8777,
  action: 'available'  // Now searchable by patients nearby
});
```

---

## Complete End-to-End Journey

### Example: Doctor Registration to Patient Booking

```
Timeline of Events:
═══════════════════════════════════════════════════════════════════════════════

[Day 1] 10:00 AM - Doctor Registration
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dr. Smith registers via mobile app                                          │
│ • Submits form: name, specialization, license, fees                         │
│ • POST /api/auth/register → Creates users + doctors record                  │
│ • Status: approval_status = 'pending'                                       │
│ • Email sent: "Verify your email address"                                   │
│ • Dr. Smith: Can login but sees "Approval Pending" banner                   │
│ • Patients: Cannot see Dr. Smith in search results (not approved)           │
└─────────────────────────────────────────────────────────────────────────────┘

[Day 1] 10:30 AM - Email Verification
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dr. Smith clicks email verification link                                    │
│ • GET /api/auth/verify-email?token=... → users.is_verified = true          │
│ • Still pending admin approval (two different flags)                        │
└─────────────────────────────────────────────────────────────────────────────┘

[Day 1] 11:00 AM - Admin Receives Alert
┌─────────────────────────────────────────────────────────────────────────────┐
│ Admin sees pending approvals in dashboard                                   │
│ • GET /api/admin/dashboard → Shows 5 pending approvals                      │
│ • GET /api/admin/approvals/pending → Lists Dr. Smith                       │
│ • Admin clicks on Dr. Smith to review documents                             │
│ • GET /api/admin/providers/doctor/uuid-smith                                │
│   Response: License verified ✓, Registration valid ✓                        │
└─────────────────────────────────────────────────────────────────────────────┘

[Day 1] 11:30 AM - Admin Approves Doctor
┌─────────────────────────────────────────────────────────────────────────────┐
│ Admin clicks "Approve" button with optional notes                           │
│ • POST /api/admin/providers/doctor/uuid-smith/approve                       │
│ • Request: { notes: "License verified. All documents in order." }           │
│                                                                              │
│ Backend Update:                                                              │
│ • doctors table: is_approved = true ✅                                      │
│ • doctors table: approval_status = 'approved' ✅                            │
│ • doctors table: approved_by = admin-uuid ✅                                │
│ • doctors table: approved_at = 2024-03-19T11:30:00Z ✅                      │
│ • users table: is_verified = true ✅                                        │
│ • Cache invalidated: admin:dashboard, auth_user:doctor-uuid                 │
│ • Audit logged: provider.approved action with before/after data             │
│                                                                              │
│ Notifications Sent:                                                          │
│ • Email: "Your registration has been approved!"                             │
│ • In-app: Notification badge appears                                        │
│ • Socket: provider.approved event                                           │
│ • Socket: catalog.providerAvailable event to all patients                   │
└─────────────────────────────────────────────────────────────────────────────┘

[Day 1] 11:45 AM - Dr. Smith Sees Approval
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dr. Smith opens mobile app                                                  │
│ • GET /api/doctors/me/profile → Returns approval_status = 'approved'        │
│ • "Approval Pending" banner disappears ✅                                   │
│ • Can now access dashboard, set availability, manage slots                  │
│ • Email received: "Welcome! You're now live on Swastik"                     │
└─────────────────────────────────────────────────────────────────────────────┘

[Day 2] 8:00 AM - Patient Discovers Doctor
┌─────────────────────────────────────────────────────────────────────────────┐
│ Patient opens Swastik app and searches for "Cardiologist"                   │
│ • GET /api/doctors?specialization=Cardiology&page=1                         │
│                                                                              │
│ Backend Query:                                                               │
│ • Query doctors table WHERE                                                  │
│   - approval_status = 'approved' ✅                                         │
│   - is_approved = true ✅                                                   │
│   - specialization = 'Cardiology'                                            │
│                                                                              │
│ Response Includes: Dr. Smith                                                 │
│ {                                                                             │
│   id: "uuid-smith",                                                          │
│   name: "Dr. Smith",                                                         │
│   specialization: "Cardiology",                                              │
│   experience_years: 5,                                                       │
│   consultation_fee: 500,                                                     │
│   is_available: true,                                                        │
│   rating: 4.8,                                                               │
│   profile_image: "https://..."                                              │
│   // Note: approval_status NOT sent to patient                              │
│ }                                                                             │
│                                                                              │
│ Patient sees: "Dr. Smith - Cardiology - ₹500 - 4.8 ⭐"                     │
└─────────────────────────────────────────────────────────────────────────────┘

[Day 2] 9:00 AM - Patient Books Appointment
┌─────────────────────────────────────────────────────────────────────────────┐
│ Patient selects Dr. Smith and books a slot                                  │
│ • POST /api/appointments                                                     │
│ • Request: { doctorId: "uuid-smith", slotId: "uuid-slot-123" }             │
│                                                                              │
│ Backend Validation:                                                          │
│ • Query doctors WHERE id = uuid-smith AND approval_status = 'approved' ✅  │
│ • Query slots WHERE doctor_id = uuid-smith ✅                               │
│ • Create appointments record ✅                                              │
│ • Emit Socket: appointment.created → Dr. Smith receives notification        │
│                                                                              │
│ Patient Receives:                                                            │
│ {                                                                             │
│   success: true,                                                             │
│   data: {                                                                     │
│     id: "appointment-123",                                                   │
│     doctorId: "uuid-smith",                                                  │
│     slotId: "uuid-slot-123",                                                 │
│     status: "scheduled",                                                     │
│     appointmentTime: "2024-03-19T14:00:00Z"                                 │
│   }                                                                           │
│ }                                                                             │
│                                                                              │
│ Dr. Smith Receives (via Socket):                                            │
│ {                                                                             │
│   eventType: 'appointment.created',                                          │
│   appointment: { id: "appointment-123", patientName: "Patient Name", ... }  │
│ }                                                                             │
│                                                                              │
│ SMS/Email: Confirmation sent to both                                         │
└─────────────────────────────────────────────────────────────────────────────┘

[Day 3] 14:00 - Appointment Happens
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dr. Smith and Patient meet (consultation happens)                           │
│ • Dr. Smith marks appointment as "completed"                                │
│ • System updates appointments.status = 'completed'                          │
│ • Post-consultation: Doctor can upload prescription                         │
│ • Patient: Can see prescription, book medicines from pharmacy               │
│ • Only APPROVED pharmacies appear in patient's pharmacy search              │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
Total Flow: Registration → Email Verify → Admin Approve → Patient Discovery → Booking
Time: ~25 hours from registration to first booking
│
Key Checkpoints:
✅ Approval status checked at EVERY patient-facing query
✅ Only approved providers visible to patients
✅ Real-time updates via Socket.IO
✅ Audit trail maintained for all actions
✅ Notifications at each major milestone
```

---

## Security & Compliance

### 1. Data Isolation
- Pending/rejected providers are **never** returned to patients
- `approval_status` field is **never** sent to patient API responses
- Separate admin API endpoints (starts with `/api/admin`)

### 2. Audit Trail
Every provider action is logged:
```javascript
{
  userId: "admin-uuid",
  action: "provider.approved",
  entityType: "doctor",
  entityId: "doctor-uuid",
  oldData: { approval_status: "pending", is_approved: false },
  newData: { approval_status: "approved", is_approved: true },
  timestamp: "2024-03-19T11:30:00Z"
}
```

### 3. Role-Based Access Control
```javascript
// All admin approval endpoints require:
router.use(authenticate);                      // Must be logged in
router.use(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN));  // Must be admin
```

### 4. Real-Time Enforcement
When provider is suspended/rejected:
- All future appointments cancelled
- Active appointments marked as "provider_unavailable"
- Emergency dispatch no longer routes to operator
- Search queries exclude immediately (cached invalidated)

---

## Summary

The Swastik ecosystem has a **rigorous approval workflow** ensuring only verified healthcare providers are visible to patients:

| Role | Registration | Approval Status | Visibility to Patients | Can Accept Work |
|------|--------------|-----------------|------------------------|-----------------|
| Doctor | Immediate | pending | ❌ No | ❌ No |
| Doctor | (approved) | approved | ✅ Yes | ✅ Yes |
| Hospital | Immediate | pending | ❌ No | ❌ No |
| Hospital | (approved) | approved | ✅ Yes | ✅ Yes |
| Clinic | Immediate | pending | ❌ No | ❌ No |
| Clinic | (approved) | approved | ✅ Yes | ✅ Yes |
| Pharmacy | Immediate | pending | ❌ No | ❌ No |
| Pharmacy | (approved) | approved | ✅ Yes | ✅ Yes |
| Diagnostic | Immediate | pending | ❌ No | ❌ No |
| Diagnostic | (approved) | approved | ✅ Yes | ✅ Yes |
| Ambulance | Immediate | pending | ❌ No | ❌ No |
| Ambulance | (approved) | approved | ✅ Yes | ✅ Yes |

Every provider transaction (appointments, orders, emergency dispatch) **validates approval status** ensuring a trustworthy healthcare marketplace for patients.
