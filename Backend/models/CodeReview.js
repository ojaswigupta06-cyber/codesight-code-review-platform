const mongoose = require("mongoose");

const codeReviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    language: {
        type: String,
        required: true
    },

    originalCode: {
        type: String,
        required: true
    },

    feedback: {
        strengths: [String],
        improvements: [String],
        correctedCode: String
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("CodeReview", codeReviewSchema);