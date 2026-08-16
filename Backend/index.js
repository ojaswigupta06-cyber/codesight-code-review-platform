const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config({ path: "./index.env" });

const authRoutes = require("./routes/authRoutes");
const codeReviewRoutes = require("./routes/codeReviewRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/code-review", codeReviewRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("AI Code Review Assistant Backend is running!");
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(process.env.PORT || 5000, () => {
            console.log(
                `Server running on http://localhost:${process.env.PORT || 5000}`
            );
        });
    })
    .catch((error) => {
        console.log("MongoDB connection failed:");
        console.log(error.message);
    });