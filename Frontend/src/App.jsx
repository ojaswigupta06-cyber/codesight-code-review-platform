import { useState, useEffect } from "react";
import "./style.css";

function App() {
    // =========================
    // AUTH STATE
    // =========================

    const [authMode, setAuthMode] = useState("login");

    const [isLoggedIn, setIsLoggedIn] = useState(
        !!localStorage.getItem("token")
    );

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // =========================
    // APP STATE
    // =========================

    const [page, setPage] = useState("dashboard");

    const [theme, setTheme] = useState(
        localStorage.getItem("theme") || "light"
    );

    const [language, setLanguage] = useState("C++");
    const [code, setCode] = useState("");
    const lineCount = code
    ? code.split("\n").length
    : 0;

const characterCount = code.length;
    const [feedback, setFeedback] = useState(null);

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // =========================
    // SAVE THEME
    // =========================

    useEffect(() => {
        localStorage.setItem("theme", theme);
    }, [theme]);

    // =========================
    // LOGIN / SIGNUP
    // =========================

   const handleAuth = async (e) => {
    e.preventDefault();
    setMessage("");

    // =========================
    // FRONTEND VALIDATION
    // =========================

    if (authMode === "signup" && !name.trim()) {
        setMessage("Please enter your full name.");
        return;
    }

    if (!email.trim()) {
        setMessage("Please enter your email address.");
        return;
    }

    if (!email.includes("@")) {
        setMessage("Please enter a valid email address.");
        return;
    }

    if (!password) {
        setMessage("Please enter your password.");
        return;
    }

    if (password.length < 6) {
        setMessage(
            "Password must be at least 6 characters long."
        );
        return;
    }

    // =========================
    // API URL
    // =========================

    const url =
        authMode === "login"
            ? "http://localhost:5000/api/auth/login"
            : "http://localhost:5000/api/auth/signup";

    const body =
        authMode === "login"
            ? {
                  email: email.trim(),
                  password,
              }
            : {
                  name: name.trim(),
                  email: email.trim(),
                  password,
              };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        // =========================
        // BACKEND ERROR
        // =========================

        if (!response.ok) {
            setMessage(
                data.message ||
                    "Something went wrong. Please try again."
            );
            return;
        }

        // =========================
        // SIGNUP SUCCESS
        // =========================

        if (authMode === "signup") {
            setMessage(
                "Account created successfully! Please login."
            );

            setAuthMode("login");

            setName("");
            setPassword("");

            return;
        }

        // =========================
        // LOGIN SUCCESS
        // =========================

        if (data.token) {
            localStorage.setItem("token", data.token);

            setIsLoggedIn(true);
            setPage("dashboard");

            setMessage("Login successful!");

            setName("");
            setEmail("");
            setPassword("");
        } else {
            setMessage(
                "Login failed. No authentication token received."
            );
        }

    } catch (error) {
        console.error(
            "Authentication error:",
            error
        );

        setMessage(
            "Could not connect to backend. Make sure your server is running."
        );
    }
};

    // =========================
    // LOGOUT
    // =========================

    const handleLogout = () => {
        localStorage.removeItem("token");

        setIsLoggedIn(false);
        setFeedback(null);
        setHistory([]);
        setCode("");
        setMessage("");
        setPage("dashboard");
    };

    // =========================
    // CODE REVIEW
    // =========================

    const handleReview = async () => {
        if (!code.trim()) {
            setMessage(
                "Please enter some code first."
            );
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            setIsLoggedIn(false);
            return;
        }

        setLoading(true);
        setMessage("");
        setFeedback(null);

        try {
            const response = await fetch(
                "http://localhost:5000/api/code-review",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        language,
                        originalCode: code,
                    }),
                }
            );

            const data = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("token");
                setIsLoggedIn(false);
                return;
            }

            if (response.ok) {
                setFeedback(
                    data.review?.feedback || null
                );

                setMessage(
                    "Code analysis completed successfully!"
                );

                fetchHistory();
            } else {
                setMessage(
                    data.message ||
                    "Code review failed."
                );
            }
        } catch (error) {
            console.error("Code review error:", error);

            setMessage(
                "Could not connect to backend."
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // GET HISTORY
    // =========================

    const fetchHistory = async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            setIsLoggedIn(false);
            return;
        }

        setHistoryLoading(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/code-review/history",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("token");
                setIsLoggedIn(false);
                return;
            }

            if (response.ok) {
                setHistory(data.reviews || []);
            }
        } catch (error) {
            console.error("History error:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    // =========================
    // DELETE REVIEW
    // =========================

    const deleteReview = async (id) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this review?"
        );

        if (!confirmDelete) {
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            setIsLoggedIn(false);
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:5000/api/code-review/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("token");
                setIsLoggedIn(false);
                return;
            }

            if (response.ok) {
                setMessage(
                    "Review deleted successfully."
                );

                fetchHistory();
            } else {
                const data = await response.json();

                setMessage(
                    data.message ||
                    "Could not delete review."
                );
            }
        } catch (error) {
            console.error("Delete review error:", error);

            setMessage(
                "Could not connect to backend."
            );
        }
    };

    // =========================
    // OPEN REVIEW
    // =========================

    const openReview = (review) => {
        setLanguage(review.language || "C++");
        setCode(review.originalCode || "");
        setFeedback(review.feedback || null);

        setPage("review");

        setMessage(
            "Previous review opened."
        );
    };

    // =========================
    // LOAD HISTORY WHEN LOGGED IN
    // =========================

    useEffect(() => {
        if (isLoggedIn) {
            fetchHistory();
        }
    }, [isLoggedIn]);

    // =========================
    // DASHBOARD STATS
    // =========================

    const totalReviews = history.length;

    const uniqueLanguages = new Set(
        history.map(
            (review) => review.language
        )
    ).size;

    const latestReview =
        history.length > 0
            ? history[0].language
            : "—";

    // =========================
    // AUTH SCREEN
    // =========================

    if (!isLoggedIn) {
        return (
            <div className={`auth-container ${theme}-theme`}>

                <div className="auth-card">

                    <div className="logo">
                        Code<span>Review</span>
                    </div>

                    <h1 className="auth-title">
                        {authMode === "login"
                            ? "Welcome back"
                            : "Create your account"}
                    </h1>

                    <p className="auth-subtitle">
                        {authMode === "login"
                            ? "Login to continue reviewing your code."
                            : "Start improving your coding skills."}
                    </p>

                    <form onSubmit={handleAuth}>

                        {authMode === "signup" && (
                            <input
                                className="auth-input"
                                type="text"
                                placeholder="Full name"
                                value={name}
                                onChange={(e) =>
                                    setName(e.target.value)
                                }
                                required
                            />
                        )}

                        <input
                            className="auth-input"
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            required
                        />

                        <input
                            className="auth-input"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            required
                        />

                        <button
                            className="auth-button"
                            type="submit"
                        >
                            {authMode === "login"
                                ? "Login"
                                : "Create Account"}
                        </button>

                    </form>

                    {message && (
                        <p className="message">
                            {message}
                        </p>
                    )}

                    <div className="auth-switch">

                        {authMode === "login"
                            ? "Don't have an account? "
                            : "Already have an account? "}

                        <button
                            type="button"
                            onClick={() => {
                                setAuthMode(
                                    authMode === "login"
                                        ? "signup"
                                        : "login"
                                );

                                setMessage("");
                            }}
                        >
                            {authMode === "login"
                                ? "Sign up"
                                : "Login"}
                        </button>

                    </div>

                    {/* AUTH THEME SWITCH */}

                    <button
                        type="button"
                        className="auth-theme-toggle"
                        onClick={() =>
                            setTheme(
                                theme === "light"
                                    ? "dark"
                                    : "light"
                            )
                        }
                    >
                        {theme === "light"
                            ? "🌙 Dark Mode"
                            : "☀️ Light Mode"}
                    </button>

                </div>

            </div>
        );
    }

    // =========================
    // MAIN APP
    // =========================

    return (
        <div className={`app ${theme}-theme`}>

            {/* =========================
                NAVBAR
            ========================= */}

            <nav className="navbar">

                <div className="logo">
                    Code<span>Review</span>
                </div>

                <div className="nav-buttons">

                    <button
                        className={`nav-button ${
                            page === "dashboard"
                                ? "active"
                                : ""
                        }`}
                        onClick={() => {
                            setPage("dashboard");
                            setMessage("");
                        }}
                    >
                        Dashboard
                    </button>

                    <button
                        className={`nav-button ${
                            page === "review"
                                ? "active"
                                : ""
                        }`}
                        onClick={() => {
                            setPage("review");
                            setMessage("");
                        }}
                    >
                        Code Review
                    </button>

                    <button
                        className={`nav-button ${
                            page === "history"
                                ? "active"
                                : ""
                        }`}
                        onClick={() => {
                            setPage("history");
                            setMessage("");
                        }}
                    >
                        History
                    </button>

                </div>

                {/* NAV RIGHT */}

                <div className="nav-right">

                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={() =>
                            setTheme(
                                theme === "light"
                                    ? "dark"
                                    : "light"
                            )
                        }
                        title={
                            theme === "light"
                                ? "Switch to dark mode"
                                : "Switch to light mode"
                        }
                    >

                        <span className="theme-icon">
                            {theme === "light"
                                ? "🌙"
                                : "☀️"}
                        </span>

                        <span>
                            {theme === "light"
                                ? "Dark"
                                : "Light"}
                        </span>

                    </button>

                    <button
                        type="button"
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </nav>

            <main className="main-content">

                {/* =========================
                    DASHBOARD
                ========================= */}

                {page === "dashboard" && (
                    <>

                        <div className="dashboard-header">

                            <div>

                                <p className="dashboard-small-title">
                                  CODE REVIEW ASSISTANT
                                </p>

                                <h1 className="page-title">
                                    Welcome to CodeReview 👋
                                </h1>

                                <p className="page-description">
                                    Review your code, understand
                                    your mistakes, and improve
                                    your programming skills.
                                </p>

                            </div>

                        </div>

                        {/* STATS */}

                        <div className="stats-grid">

                            <div className="stat-card">

                                <div className="stat-label">
                                    Total Reviews
                                </div>

                                <div className="stat-value">
                                    {totalReviews}
                                </div>

                                <div className="stat-description">
                                    Code reviews completed
                                </div>

                            </div>

                            <div className="stat-card">

                                <div className="stat-label">
                                    Languages Used
                                </div>

                                <div className="stat-value">
                                    {uniqueLanguages}
                                </div>

                                <div className="stat-description">
                                    Different languages
                                </div>

                            </div>

                            <div className="stat-card">

                                <div className="stat-label">
                                    Latest Review
                                </div>

                                <div className="stat-value stat-language">
                                    {latestReview}
                                </div>

                                <div className="stat-description">
                                    Most recent language
                                </div>

                            </div>

                        </div>

                        {/* QUICK ACTIONS */}

                        <h2 className="section-title">
                            Quick Actions
                        </h2>

                        <div className="quick-actions">

                            <div
                                className="action-card"
                                onClick={() => {
                                    setPage("review");
                                    setMessage("");
                                }}
                            >

                                <div className="action-icon">
                                    {"</>"}
                                </div>

                                <div className="action-content">

                                    <h3>
                                        Start Code Review
                                    </h3>

                                    <p>
                                        Paste your code and get
                                        detailed feedback.
                                    </p>

                                </div>

                                <div className="action-arrow">
                                    →
                                </div>

                            </div>

                            <div
                                className="action-card"
                                onClick={() => {
                                    setPage("history");
                                    setMessage("");
                                }}
                            >

                                <div className="action-icon">
                                    ↗
                                </div>

                                <div className="action-content">

                                    <h3>
                                        View Review History
                                    </h3>

                                    <p>
                                        Check your previous code
                                        reviews and progress.
                                    </p>

                                </div>

                                <div className="action-arrow">
                                    →
                                </div>

                            </div>

                        </div>

                        {/* RECENT REVIEWS */}

                        <h2 className="section-title recent-title">
                            Recent Reviews
                        </h2>

                        {historyLoading && (
                            <div className="panel">

                                <p className="page-description">
                                    Loading reviews...
                                </p>

                            </div>
                        )}

                        {!historyLoading &&
                            history.length === 0 && (
                                <div className="panel empty-dashboard">

                                    <p>
                                        You haven't reviewed any
                                        code yet.
                                    </p>

                                    <button
                                        className="open-button"
                                        onClick={() =>
                                            setPage("review")
                                        }
                                    >
                                        Start Your First Review
                                    </button>

                                </div>
                            )}

                        {!historyLoading &&
                            history.length > 0 && (
                                <div className="recent-list">

                                    {history
                                        .slice(0, 3)
                                        .map((review) => (

                                            <div
                                                className="recent-card"
                                                key={review._id}
                                                onClick={() =>
                                                    openReview(
                                                        review
                                                    )
                                                }
                                            >

                                                <div>

                                                    <span className="language-badge">
                                                        {review.language}
                                                    </span>

                                                    <span className="recent-date">
                                                        {new Date(
                                                            review.createdAt
                                                        ).toLocaleString()}
                                                    </span>

                                                </div>

                                                <p>
                                                    {review.originalCode
                                                        ?.replace(
                                                            /\s+/g,
                                                            " "
                                                        )
                                                        .trim()
                                                        .substring(
                                                            0,
                                                            100
                                                        ) ||
                                                        "No code preview"}
                                                    ...
                                                </p>

                                            </div>

                                        ))}

                                </div>
                            )}

                    </>
                )}

                {/* =========================
                    GLOBAL STATS
                ========================= */}

                {page !== "dashboard" && (
                    <div className="stats-grid">

                        <div className="stat-card">

                            <div className="stat-label">
                                Total Reviews
                            </div>

                            <div className="stat-value">
                                {totalReviews}
                            </div>

                        </div>

                        <div className="stat-card">

                            <div className="stat-label">
                                Languages Used
                            </div>

                            <div className="stat-value">
                                {uniqueLanguages}
                            </div>

                        </div>

                        <div className="stat-card">

                            <div className="stat-label">
                                Latest Review
                            </div>

                            <div className="stat-value stat-language">
                                {latestReview}
                            </div>

                        </div>

                    </div>
                )}

                {/* MESSAGE */}

                {message && (
                    <div className="message">
                        {message}
                    </div>
                )}

                {/* =========================
                    REVIEW PAGE
                ========================= */}

                {page === "review" && (
                    <>

                        <h1 className="page-title">
                            Review your code
                        </h1>

                        <p className="page-description">
                            Analyze your code and get actionable
                            suggestions to improve it.
                        </p>

                        <div className="review-grid">

                            {/* CODE INPUT */}

                            <div className="panel">

                                <h2 className="panel-title">
                                    Your Code
                                </h2>

                                <select
                                    className="language-select"
                                    value={language}
                                    onChange={(e) =>
                                        setLanguage(
                                            e.target.value
                                        )
                                    }
                                >
                                    <option>C++</option>
                                    <option>Java</option>
                                    <option>Python</option>
                                    <option>JavaScript</option>
                                    <option>C</option>
                                </select>

                              <div className="editor-wrapper">

    <textarea
        className="code-editor"
        placeholder="Paste your code here..."
        value={code}
        onChange={(e) =>
            setCode(e.target.value)
        }
    />

    <div className="editor-footer">

        <span>
            {lineCount} lines
        </span>

        <span>
            {characterCount} characters
        </span>

        {code && (
            <button
                type="button"
                className="clear-code-button"
                onClick={() => {
                    setCode("");
                    setFeedback(null);
                    setMessage("");
                }}
            >
                Clear
            </button>
        )}

    </div>

</div>

                                <button
                                    className="review-button"
                                    onClick={handleReview}
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Analyzing..."
                                        : "Review Code"}
                                </button>

                            </div>

                            {/* ANALYSIS */}

                            <div className="panel">

                                <h2 className="panel-title">
                                    Analysis
                                </h2>

                                {!feedback && !loading && (
                                    <p className="page-description">
                                        Your review results will
                                        appear here.
                                    </p>
                                )}

                             {loading && (
    <div className="review-loading">
        <div className="loading-spinner"></div>

        <h3>Analyzing your code...</h3>

        <p>
            Our analyzer is reviewing your code and preparing suggestions.
        </p>
    </div>
)}

                                {feedback && (
                                    <>
                                    {/* REVIEW SUMMARY */}

<div className="review-summary">

    <div className="review-status">
        <span className="status-dot"></span>
        Analysis Complete
    </div>

    <div className="review-counts">

        <div className="review-count">
            <strong>
                {feedback.strengths?.length || 0}
            </strong>
            <span>Strengths</span>
        </div>

        <div className="review-count">
            <strong>
                {feedback.improvements?.length || 0}
            </strong>
            <span>Improvements</span>
        </div>

    </div>

</div>

                                        {/* STRENGTHS */}

                                        <div className="feedback-section">

                                            <h3 className="feedback-title">
                                                Strengths
                                            </h3>

                                            <ul className="feedback-list">

                                                {(
                                                    feedback.strengths ||
                                                    []
                                                ).map(
                                                    (
                                                        item,
                                                        index
                                                    ) => (
                                                        <li
                                                            className="strength-item"
                                                            key={index}
                                                        >
                                                            {item}
                                                        </li>
                                                    )
                                                )}

                                            </ul>

                                        </div>

                                        {/* IMPROVEMENTS */}

                                        <div className="feedback-section">

                                            <h3 className="feedback-title">
                                                Improvements
                                            </h3>

                                            <ul className="feedback-list">

                                                {(
                                                    feedback.improvements ||
                                                    []
                                                ).map(
                                                    (
                                                        item,
                                                        index
                                                    ) => (
                                                        <li
                                                            className="improvement-item"
                                                            key={index}
                                                        >
                                                            {item}
                                                        </li>
                                                    )
                                                )}

                                            </ul>

                                        </div>

                                        {/* CORRECTED CODE */}

                                        <div className="feedback-section">

                                            <h3 className="feedback-title">
                                                Corrected Code
                                            </h3>

                                            <pre className="code-output">
                                                <code>
                                                    {
                                                        feedback.correctedCode ||
                                                        "No corrected code provided."
                                                    }
                                                </code>
                                            </pre>

                                            <button
                                                className="copy-button"
                                                onClick={() => {

                                                    navigator.clipboard.writeText(
                                                        feedback.correctedCode ||
                                                        ""
                                                    );

                                                    setMessage(
                                                        "Corrected code copied!"
                                                    );

                                                }}
                                            >
                                                Copy Code
                                            </button>

                                        </div>

                                    </>
                                )}

                            </div>

                        </div>

                    </>
                )}

                {/* =========================
                    HISTORY PAGE
                ========================= */}

                {page === "history" && (
                    <>

                        <h1 className="page-title">
                            Review History
                        </h1>

                        <p className="page-description">
                            Track your previous code reviews
                            and monitor your progress.
                        </p>

                        {historyLoading && (
                            <div className="panel">

                                <p className="page-description">
                                    Loading your reviews...
                                </p>

                            </div>
                        )}

                        {!historyLoading &&
                            history.length === 0 && (
                                <div className="panel empty-history">

                                    <div className="empty-icon">
                                        {"</>"}
                                    </div>

                                    <h2>
                                        No reviews yet
                                    </h2>

                                    <p className="page-description">
                                        Submit your first piece of
                                        code to start building your
                                        review history.
                                    </p>

                                    <button
                                        className="open-button"
                                        onClick={() =>
                                            setPage("review")
                                        }
                                    >
                                        Start a Review
                                    </button>

                                </div>
                            )}

                        {!historyLoading &&
                            history.length > 0 && (
                                <div className="history-list">

                                    {history.map(
                                        (review) => {

                                            const preview =
                                                review.originalCode
                                                    ? review.originalCode
                                                        .replace(
                                                            /\s+/g,
                                                            " "
                                                        )
                                                        .trim()
                                                    : "No code preview available.";

                                            const strengthsCount =
                                                review.feedback?.strengths
                                                    ?.length ||
                                                0;

                                            const improvementsCount =
                                                review.feedback?.improvements
                                                    ?.length ||
                                                0;

                                            return (
                                                <div
                                                    className="history-card"
                                                    key={
                                                        review._id
                                                    }
                                                >

                                                    <div className="history-header">

                                                        <div className="history-language-area">

                                                            <span className="language-badge">
                                                                {
                                                                    review.language
                                                                }
                                                            </span>

                                                            <span className="review-label">
                                                                Code Review
                                                            </span>

                                                        </div>

                                                        <span className="history-date">
                                                            {new Date(
                                                                review.createdAt
                                                            ).toLocaleString()}
                                                        </span>

                                                    </div>

                                                    <div className="history-code-preview">
                                                        {preview.length >
                                                        180
                                                            ? preview.substring(
                                                                0,
                                                                180
                                                            ) + "..."
                                                            : preview}
                                                    </div>

                                                    <div className="history-summary">

                                                        <div className="summary-item">

                                                            <span className="summary-number">
                                                                {
                                                                    strengthsCount
                                                                }
                                                            </span>

                                                            <span>
                                                                Strengths
                                                            </span>

                                                        </div>

                                                        <div className="summary-item">

                                                            <span className="summary-number">
                                                                {
                                                                    improvementsCount
                                                                }
                                                            </span>

                                                            <span>
                                                                Improvements
                                                            </span>

                                                        </div>

                                                    </div>

                                                    <div className="history-actions">

                                                        <button
                                                            className="open-button"
                                                            onClick={() =>
                                                                openReview(
                                                                    review
                                                                )
                                                            }
                                                        >
                                                            Open Review
                                                        </button>

                                                        <button
                                                            className="delete-button"
                                                            onClick={() =>
                                                                deleteReview(
                                                                    review._id
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </button>

                                                    </div>

                                                </div>
                                            );
                                        }
                                    )}

                                </div>
                            )}

                    </>
                )}

            </main>

        </div>
    );
}

export default App;
