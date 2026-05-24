const express = require("express");
const { createRecommendation } = require("../controllers/aiController");

const router = express.Router();

router.post("/recommendation", createRecommendation);

module.exports = router;
