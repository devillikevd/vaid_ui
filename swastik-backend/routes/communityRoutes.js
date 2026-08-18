const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const auth = require('../middleware/auth');

// Public routes (anyone can read questions and answers)
router.get('/questions', auth.optionalAuth, communityController.getQuestions);
router.get('/trending', communityController.getTrendingTopics);
router.get('/questions/:id', auth.optionalAuth, communityController.getQuestionDetails);

// Protected routes (require login)
router.use(auth.authenticate);
router.post('/questions', communityController.createQuestion);
router.post('/questions/:id/answers', auth.authorize('doctor', 'patient', 'hospital_owner', 'hospital_manager', 'clinic_owner', 'pharmacy_owner', 'diagnostic_center_owner'), communityController.addAnswer);
router.put('/answers/:id', auth.authorize('doctor', 'patient', 'hospital_owner', 'hospital_manager', 'clinic_owner', 'pharmacy_owner', 'diagnostic_center_owner'), communityController.updateAnswer);
router.post('/questions/:id/upvote', communityController.upvoteQuestion);
router.post('/answers/:id/upvote', communityController.upvoteAnswer);
router.post('/questions/:id/bookmark', communityController.toggleBookmark);
router.delete('/questions/:id', communityController.deleteQuestion);
router.delete('/answers/:id', communityController.deleteAnswer);
router.post('/questions/:id/report', communityController.reportQuestion);
router.post('/answers/:id/report', communityController.reportAnswer);

// Admin Moderation Routes
router.get('/admin/reports', auth.authorize('admin'), communityController.getReports);
router.put('/admin/reports/:id/status', auth.authorize('admin'), communityController.updateReportStatus);
router.post('/admin/moderate', auth.authorize('admin'), communityController.moderateContent);

module.exports = router;
