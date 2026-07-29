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

// Chat Message Schema - high volume, append-only
const chatMessageSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system', 'doctor', 'patient'], required: true },
    content: { type: String, required: true },
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now, index: true },
});

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

// Meal Log Schema - diet & nutrition tracker
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
    medical_conditions: [String],
    medicalConditions: [String],
    latencyMs: Number,
    timestamp: { type: Date, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
}, { collection: 'meal_logs' });


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
    query: { type: String, required: true },
    result_count: { type: Number, default: 0 },
    searched_at: { type: Date, default: Date.now },
});


// Create models only if mongoose is connected
let AuditLog, ChatMessage, AnalyticsEvent, AmbulanceLocation, SearchLog, MealLog, Disease, Category, HealthSearchStat;

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
};
