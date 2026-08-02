const communityService = require('../services/communityService');

exports.getQuestions = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    let offset = parseInt(req.query.offset) || 0;
    
    // If 'page' is provided, override offset calculation (page is 1-indexed)
    if (req.query.page) {
      const page = parseInt(req.query.page) || 1;
      offset = (page - 1) * limit;
    }
    
    const filter = req.query.filter || 'All';
    const topic = req.query.topic || null;
    const search = req.query.search || null;
    const sortBy = req.query.sortBy || 'recent';
    const userId = req.user?.id || null;
    
    const result = await communityService.getQuestions(limit, offset, filter, topic, search, userId, sortBy);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getQuestionDetails = async (req, res, next) => {
  try {
    const result = await communityService.getQuestionDetails(req.params.id, req.user?.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.createQuestion = async (req, res, next) => {
  try {
    const { title, content, topic, is_anonymous, attachments } = req.body;
    const result = await communityService.createQuestion(req.user.id, title, content, topic, is_anonymous, attachments);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.addAnswer = async (req, res, next) => {
  try {
    const { content } = req.body;
    const result = await communityService.addAnswer(req.user.id, req.params.id, content);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateAnswer = async (req, res, next) => {
  try {
    const { content } = req.body;
    const result = await communityService.updateAnswer(req.user.id, req.params.id, content);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.upvoteQuestion = async (req, res, next) => {
  try {
    const action = req.query.action || 'upvote';
    const result = await communityService.upvoteQuestion(req.params.id, req.user?.id, action);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.upvoteAnswer = async (req, res, next) => {
  try {
    const action = req.query.action || 'upvote';
    const result = await communityService.upvoteAnswer(req.params.id, req.user?.id, action);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const result = await communityService.deleteQuestion(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.deleteAnswer = async (req, res, next) => {
  try {
    const result = await communityService.deleteAnswer(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.toggleBookmark = async (req, res, next) => {
  try {
    const result = await communityService.toggleBookmark(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getTrendingTopics = async (req, res, next) => {
  try {
    const result = await communityService.getTrendingTopics();
    res.json(result);
  } catch (error) {
    next(error);
  }
};
