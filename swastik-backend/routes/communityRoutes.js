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
router.post('/questions/:id/answers', communityController.addAnswer);
router.put('/answers/:id', communityController.updateAnswer);
router.post('/questions/:id/upvote', communityController.upvoteQuestion);
router.post('/answers/:id/upvote', communityController.upvoteAnswer);
router.post('/questions/:id/bookmark', communityController.toggleBookmark);
router.delete('/questions/:id', communityController.deleteQuestion);
router.delete('/answers/:id', communityController.deleteAnswer);

module.exports = router;
