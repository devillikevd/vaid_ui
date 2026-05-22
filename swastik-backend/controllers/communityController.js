const communityService = require('../services/communityService');

exports.getQuestions = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const result = await communityService.getQuestions(limit, offset);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getQuestionDetails = async (req, res, next) => {
  try {
    const result = await communityService.getQuestionDetails(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.createQuestion = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const result = await communityService.createQuestion(req.user.id, title, content);
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

exports.upvoteQuestion = async (req, res, next) => {
  try {
    const result = await communityService.upvoteQuestion(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
