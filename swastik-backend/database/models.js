/**
 * MongoDB Models
 * Used for high-volume data that doesn't need relational queries
 */
const { mongoose } = require('../config/mongodb');

// Audit Log Schema - tracks all important actions
const auditLogSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    userRole: { type: String, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, index: true }, // user, doctor, patient, appointment, etc.
    entityId: { type: String, index: true },
    oldData: mongoose.Schema.Types.Mixed,
    newData: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now, index: true },
});

// M007: compound indexes for the most common audit-log query patterns
// (admin audit log page filters by action/entityType/userId and sorts by createdAt desc).
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
const chatMessageSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system', 'doctor', 'patient', 'wellness_coach'], required: true },
    content: { type: String, required: true },
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now, index: true },
});

// Compound index so wellness-chat history pages resolve on (session, createdAt) only
chatMessageSchema.index({ sessionId: 1, createdAt: -1 });
// M007: recent-chat list per user (chatbotServiceV2 session aggregation, patientService history)
chatMessageSchema.index({ userId: 1, role: 1, createdAt: -1 });

// Analytics Event Schema - for tracking user behavior
const analyticsEventSchema = new mongoose.Schema({
    eventType: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    userRole: String,
    sessionId: String,
    properties: mongoose.Schema.Types.Mixed,
    deviceInfo: {
        platform: String, // web, android, ios
        version: String,
        userAgent: String,
    },
    location: {
        latitude: Number,
        longitude: Number,
        city: String,
    },
    createdAt: { type: Date, default: Date.now, index: true },
});

// M007: analytics event queries filter by eventType/userId and sort by createdAt desc
analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ userId: 1, createdAt: -1 });

// Ambulance Location Ping Schema - very high volume
const ambulanceLocationSchema = new mongoose.Schema({
    ambulanceId: { type: String, required: true, index: true },
    requestId: { type: String, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    heading: Number,
    speed: Number,
    accuracy: Number,
    createdAt: { type: Date, default: Date.now, index: true, expires: 86400 }, // TTL 24 hours
});

// M007: recent pings per ambulance (tracking) resolve on (ambulanceId, createdAt desc)
ambulanceLocationSchema.index({ ambulanceId: 1, createdAt: -1 });

// Search Log Schema - for improving search
const searchLogSchema = new mongoose.Schema({
    userId: String,
    searchType: { type: String, index: true }, // doctor, medicine, hospital
    query: { type: String, required: true },
    filters: mongoose.Schema.Types.Mixed,
    resultsCount: Number,
    clickedResultId: String,
    createdAt: { type: Date, default: Date.now, index: true },
});

// M007: search-log history per user + recent searches per type
searchLogSchema.index({ userId: 1, createdAt: -1 });
searchLogSchema.index({ searchType: 1, createdAt: -1 });
const mealLogSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    items: [{
        name: String,
        hindi_name: String,
        quantity: Number,
        unit: String,
        standard_weight_g: Number,
        calories: Number,
        protein_g: Number,
        carbs_g: Number,
        fat_g: Number,
        fiber_g: Number,
        source: { type: String, enum: ['icmr_database', 'ai_estimated'], default: 'icmr_database' },
    }],
    totals: {
        calories: Number,
        protein_g: Number,
        carbs_g: Number,
        fat_g: Number,
        fiber_g: Number,
    },
    advice: mongoose.Schema.Types.Mixed,
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack', 'unknown'], default: 'unknown' },
    // L010: canonical field (written by the AI service). Reads still tolerate
    // the legacy camelCase `medicalConditions` shape via dietService fallback.
    medical_conditions: [String],
    latencyMs: Number,
    timestamp: { type: Date, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
}, { collection: 'meal_logs' });

// M007: meal history per user is fetched by (userId) sorted by createdAt/timestamp desc
mealLogSchema.index({ userId: 1, createdAt: -1 });
mealLogSchema.index({ userId: 1, timestamp: -1 });


// Disease Schema - Health Library
const diseaseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    first_letter: { type: String, required: true, index: true },
    chapter: { type: String, required: true, index: true },
    body_system: { type: String, required: true },
    severity: { type: String, default: 'General', index: true },
    keywords: { type: String, default: '' },
    source: { type: String, default: 'ICD-10-CM' },
    variant_count: { type: Number, default: 1 },
    summary: String,
    overview: String,
    types: String,
    symptoms: String,
    causes: String,
    risk_factors: String,
    diagnosis: String,
    medicines: String,
    home_remedies: String,
    complications: String,
    prevention: String,
    when_to_see_doctor: String,
    faqs: String,
});

// Category Schema - Health Library
const categorySchema = new mongoose.Schema({
    chapter: { type: String, required: true, unique: true, index: true },
    body_system: { type: String, required: true },
    disease_count: { type: Number, default: 0 },
    icon: { type: String, default: '' },
});

// Health Search Stat Schema - Health Library
const healthSearchStatSchema = new mongoose.Schema({
    query: { type: String, required: true, index: true },
    result_count: { type: Number, default: 0 },
    searched_at: { type: Date, default: Date.now, index: true },
});

// M007: trending-search aggregation filters by result_count/searched_at
healthSearchStatSchema.index({ searched_at: -1, result_count: -1 });

// Doctor Goal Schema - Tracks personal targets for Doctor Growth Dashboard
const doctorGoalSchema = new mongoose.Schema({
    doctorId: { type: String, required: true, unique: true, index: true },
    monthlyConsultations: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 },
    profileCompletion: { type: Number, default: 100 },
    updatedAt: { type: Date, default: Date.now },
});

// Doctor Feedback Schema - internal feedback from doctors to admins
const doctorFeedbackSchema = new mongoose.Schema({
    doctorId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    rating: Number,
    pageName: String,
    route: String,
    attachments: [String],
    browser: String,
    device: String,
    os: String,
    appVersion: String,
    status: { type: String, default: 'Submitted', index: true },
    priority: { type: String, default: 'Low', index: true },
    adminResponse: String,
    adminId: String,
    resolvedAt: Date,
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
});

doctorFeedbackSchema.index({ status: 1, createdAt: -1 });
doctorFeedbackSchema.index({ doctorId: 1, createdAt: -1 });

// Create models only if mongoose is connected
let AuditLog, ChatMessage, AnalyticsEvent, AmbulanceLocation, SearchLog, MealLog, Disease, Category, HealthSearchStat, DoctorGoal, DoctorFeedback;

try {
    AuditLog = mongoose.model('AuditLog', auditLogSchema);
    ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
    AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
    AmbulanceLocation = mongoose.model('AmbulanceLocation', ambulanceLocationSchema);
    SearchLog = mongoose.model('SearchLog', searchLogSchema);
    MealLog = mongoose.model('MealLog', mealLogSchema);
    Disease = mongoose.model('Disease', diseaseSchema);
    Category = mongoose.model('Category', categorySchema);
    HealthSearchStat = mongoose.model('HealthSearchStat', healthSearchStatSchema);
    DoctorGoal = mongoose.model('DoctorGoal', doctorGoalSchema);
    DoctorFeedback = mongoose.model('DoctorFeedback', doctorFeedbackSchema);
} catch (error) {
    // Models might already exist
    AuditLog = mongoose.models.AuditLog;
    ChatMessage = mongoose.models.ChatMessage;
    AnalyticsEvent = mongoose.models.AnalyticsEvent;
    AmbulanceLocation = mongoose.models.AmbulanceLocation;
    SearchLog = mongoose.models.SearchLog;
    MealLog = mongoose.models.MealLog;
    Disease = mongoose.models.Disease;
    Category = mongoose.models.Category;
    HealthSearchStat = mongoose.models.HealthSearchStat;
    DoctorGoal = mongoose.models.DoctorGoal;
    DoctorFeedback = mongoose.models.DoctorFeedback;
}

module.exports = {
    AuditLog,
    ChatMessage,
    AnalyticsEvent,
    AmbulanceLocation,
    SearchLog,
    MealLog,
    Disease,
    Category,
    HealthSearchStat,
    DoctorGoal,
    DoctorFeedback
};
