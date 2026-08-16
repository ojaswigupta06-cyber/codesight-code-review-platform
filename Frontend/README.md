# CodeReview

A full-stack code review application where users can sign up, submit code, receive rule-based feedback, view corrected code for safely fixable issues, and manage their review history.

> This project uses a local rule-based analyzer. It is designed to provide fast, explainable feedback without calling an external AI service.

## Features

- User signup and login with JWT authentication
- Light and dark themes
- Code review support for C++, Java, Python, JavaScript, and C
- Language-specific feedback, including C++ vector-boundary checks
- Safe corrected-code output for detected `i <= container.size()` loop-bound errors
- Review history with open and delete actions
- Responsive React interface with loading and empty states

## Tech Stack

- Frontend: React, Vite, CSS
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Authentication: JSON Web Tokens and bcryptjs

## Project Structure

```text
stack/
├── Backend/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── index.env          # local only — do not commit
│   └── index.js
└── Frontend/
    ├── src/
    │   ├── App.jsx
    │   └── style.css
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- A MongoDB Atlas connection string or local MongoDB instance

### 1. Configure the backend

Open a terminal in the `Backend` folder and install dependencies:

```bash
npm install
npm install dotenv
```

Create `Backend/index.env`:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=replace_this_with_a_long_random_secret
```

Start the backend:

```bash
node index.js
```

The backend runs at `http://localhost:5000`.

### 2. Start the frontend

Open a second terminal in the `Frontend` folder:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## API Overview

All code-review routes require a valid JWT bearer token.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/login` | Sign in and receive a token |
| POST | `/api/code-review` | Submit code for analysis |
| GET | `/api/code-review/history` | Get the signed-in user's reviews |
| DELETE | `/api/code-review/:id` | Delete one review |

### Submit a review

```json
{
  "language": "C++",
  "originalCode": "#include <iostream>\nint main() { return 0; }"
}
```

The response includes a saved review with:

```json
{
  "strengths": ["..."],
  "improvements": ["..."],
  "correctedCode": "..."
}
```

## Testing Checklist

- Sign up, then log in
- Submit C++ code containing `i <= arr.size()` and verify corrected code uses `<`
- Submit `int arr[5]; cout << arr[5];` and verify the out-of-bounds warning
- Submit Python code and verify C++ rules are not shown
- Open and delete reviews from History
- Test light and dark themes, then reduce the browser width to check mobile layout

## Security Notes

- Never commit `Backend/index.env`; it contains private configuration.
- Use a strong, unique JWT secret for deployment.
- Set a restrictive CORS origin before deploying to production.

## Resume Description

Built a full-stack code-review platform using React, Node.js, Express, MongoDB, and JWT authentication. Implemented a rule-based multi-language analyzer with C++ out-of-bounds detection, safe corrected-code suggestions, persistent review history, responsive design, and light/dark themes.
