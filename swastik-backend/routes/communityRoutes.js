const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const auth = require('../middleware/auth');

// Public routes (anyone can read questions and answers)
router.get('/questions', communityController.getQuestions);
router.get('/questions/:id', communityController.getQuestionDetails);

// Protected routes (require login)
router.use(auth.authenticate);
router.post('/questions', communityController.createQuestion);
router.post('/questions/:id/answers', communityController.addAnswer);
router.post('/questions/:id/upvote', communityController.upvoteQuestion);

module.exports = router;
