const express = require('express');
const router = express.Router();
const { DoctorFeedback } = require('../../database/models');
const { authenticate, authorize } = require('../../middleware/auth');
const { requireApproval } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const { supabaseAdmin } = require('../../config/supabase');

// Middleware to ensure doctor exists and bind doctor_id
router.use(authenticate, authorize('doctor'), requireApproval, asyncHandler(async (req, res, next) => {
    const { data: doctor } = await supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('user_id', req.user.id)
        .maybeSingle();

    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    req.doctorId = doctor.id;
    next();
}));

// POST /doctor/feedback
router.post('/', asyncHandler(async (req, res) => {
    const {
        type, category, title, description, rating, attachments, context
    } = req.body;

    const pageName = context?.pageName || req.body.pageName;
    const route = context?.route || req.body.route;
    const browser = context?.browser || req.body.browser;
    const device = context?.device || req.body.device;
    const os = context?.os || req.body.os;
    const appVersion = context?.appVersion || req.body.appVersion;

    if (!type || !category || !title || !description) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const feedback = new DoctorFeedback({
        doctorId: req.doctorId,
        type,
        category,
        title,
        description,
        rating,
        pageName,
        route,
        attachments,
        browser,
        device,
        os,
        appVersion,
        status: 'Submitted',
        priority: 'Low'
    });

    await feedback.save();
    res.status(201).json({ success: true, data: feedback });
}));

// GET /doctor/feedback
router.get('/', asyncHandler(async (req, res) => {
    const feedbacks = await DoctorFeedback.find({ doctorId: req.doctorId }).sort({ createdAt: -1 });
    res.json({ success: true, data: feedbacks });
}));

// GET /doctor/feedback/:id
router.get('/:id', asyncHandler(async (req, res) => {
    const feedback = await DoctorFeedback.findOne({ _id: req.params.id, doctorId: req.doctorId });
    if (!feedback) {
        return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    res.json({ success: true, data: feedback });
}));

module.exports = router;
