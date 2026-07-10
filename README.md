# 📖 Soma Side

> *An African literature platform where stories, poems, and songs find a home.*

Soma Side is a full-stack web application built for African writers and readers. Users can publish, read, like, and bookmark stories — all tied to real accounts and a real database.

---

## ✨ What It Does

- Browse a feed of stories, poems, and songs from African writers
- Read full works on a clean, distraction-free story page
- Publish your own writing with a cover image
- Like and bookmark pieces that move you
- View your profile — your published works and saved collection
- Secure accounts with login and registration

---

## 🗂️ Project Structure

```
somaside1/
├── server.js              — Entry point: connects DB, registers all routes
├── .env                   — Secret keys (never commit this)
├── .gitignore
├── seed.js                — Populates DB with 7 sample stories (run once)
├── package.json
│
├── models/
│   ├── story.js           — Story schema (title, content, genre, likes…)
│   └── user.js            — User schema (name, email, password, bookmarks)
│
├── middleware/
│   └── auth.js            — JWT verification (requireAuth)
│
├── routes/
│   ├── auth.js            — Register, login, get current user
│   ├── stories.js         — CRUD, like, bookmark, filter by genre
│   └── upload.js          — Cloudinary image upload
│
└── public/                — Frontend served statically by Express
    ├── index.html         — Landing page
    ├── home.html          — Story feed
    ├── story.html         — Single story reader
    ├── upload.html        — Publish form
    ├── profile.html       — User profile + their works
    ├── about.html
    └── js/
        ├── api.js         — All fetch calls to the backend
        ├── auth-modal.js  — Login/register modal
        ├── home.js        — Feed rendering, filters, likes, bookmarks
        ├── story.js       — Single story view, prev/next navigation
        ├── upload.js      — Form handling, validation, image preview
        ├── profile.js     — Profile stats and user's works
        └── main.js        — Shared utilities
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB Atlas (via Mongoose) |
| Authentication | JWT + bcryptjs |
| Image Storage | Cloudinary |
| File Uploads | Multer + multer-storage-cloudinary |
| Environment | dotenv |

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/somaside1.git
cd somaside1
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root of the project:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/somaside
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> 🔒 Never commit `.env` to GitHub. It is already listed in `.gitignore`.

### 4. Seed the database (first time only)

```bash
node seed.js
```

This inserts 7 sample stories (poems, stories, songs) from across Africa.
⚠️ Warning: It deletes all existing stories before inserting. Do not run in production.

### 5. Start the server

```bash
node server.js
```

Open `http://localhost:3000` in your browser.

---

## 🛣️ API Reference

### Auth — `/api/auth`

| Method | Route | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create a new account |
| POST | `/api/auth/login` | No | Log in, receive JWT token |
| GET | `/api/auth/me` | Yes | Get the current logged-in user |

**Login / Register response:**
```json
{
  "token": "eyJhbGci...",
  "user": { "id": "...", "name": "Jane", "email": "jane@example.com" }
}
```

---

### Stories — `/api/stories`

| Method | Route | Auth Required | Description |
|---|---|---|---|
| GET | `/api/stories` | No | Get all stories (supports `?genre=Poem`) |
| GET | `/api/stories/:id` | No | Get a single story by ID |
| POST | `/api/stories` | Yes | Publish a new story |
| DELETE | `/api/stories/:id` | Yes | Delete your own story |
| POST | `/api/stories/:id/like` | Yes | Like a story |
| POST | `/api/stories/:id/bookmark` | Yes | Bookmark or unbookmark a story |
| GET | `/api/stories/user/mine` | Yes | Stories published by the logged-in user |
| GET | `/api/stories/user/bookmarked` | Yes | Bookmarked stories |

**Publishing a story (request body):**
```json
{
  "title": "Harmattan Daughter",
  "genre": "Poem",
  "excerpt": "Short hook...",
  "content": "Full text...",
  "coverImage": "https://cloudinary.com/...",
  "readTime": "2 min",
  "country": "Nigeria",
  "city": "Lagos"
}
```

> Note: `author` and `authorId` are set automatically from the logged-in user's token — do not send them from the frontend.

---

### Upload — `/api/upload`

| Method | Route | Auth Required | Description |
|---|---|---|---|
| POST | `/api/upload/image` | Yes | Upload a cover image to Cloudinary |

**Request:** `multipart/form-data` with field name `image`

**Response:**
```json
{ "url": "https://res.cloudinary.com/your_cloud/image/upload/..." }
```

---

## 🗄️ Data Models

### Story

| Field | Type | Notes |
|---|---|---|
| title | String | Required |
| author | String | Auto-set from logged-in user |
| authorId | ObjectId | References User |
| genre | String | Enum: `Poem`, `Story`, `Song` |
| excerpt | String | Short hook, max 160 chars |
| content | String | Full text, required |
| coverImage | String | Cloudinary URL |
| likes | Number | Default 0 |
| readTime | String | e.g. `"2 min"` |
| country | String | Optional |
| city | String | Optional |
| createdAt | Date | Auto set |

### User

| Field | Type | Notes |
|---|---|---|
| name | String | Required |
| email | String | Required, unique |
| password | String | Hashed with bcryptjs before saving |
| bookmarks | [ObjectId] | Array of Story references |
| createdAt | Date | Auto set |

---

## 🔐 Authentication

Soma Side uses **JWT (JSON Web Tokens)**. On login or register, the server returns a token valid for **7 days**. The frontend stores it in `localStorage` as `ss_token`.

Protected routes require the token in the request header:

```
Authorization: Bearer eyJhbGci...
```

The `requireAuth` middleware verifies the token and attaches the user to `req.user` for all downstream route handlers.

---

## 🖼️ Image Uploads

Cover images go to **Cloudinary** via `/api/upload/image`. The flow:

1. User selects an image in the publish form
2. Frontend sends `multipart/form-data` to `/api/upload/image`
3. Multer + CloudinaryStorage uploads it directly to Cloudinary
4. Cloudinary returns a URL
5. Frontend includes that URL as `coverImage` when publishing

Images are stored in the `somaside` folder on Cloudinary and auto-resized to a max width of 1200px.

> ⚠️ When displaying cover images in the frontend, always use `story.coverImage` — not `story.imageUrl`.

---

## 📦 Packages

```bash
npm install express mongoose cors dotenv
npm install jsonwebtoken bcryptjs
npm install multer cloudinary@1.41.3 multer-storage-cloudinary
```

> Cloudinary is pinned to `v1.41.3` because `multer-storage-cloudinary` requires Cloudinary v1.

---

## 🗺️ Roadmap

### ✅ Done
- Project structure and static file serving
- MongoDB models (Story, User)
- JWT authentication (register, login, protected routes)
- Story CRUD (create, read, delete)
- Like and bookmark system
- Cloudinary image uploads
- Database seeding

### 🔨 In Progress / Next Steps
- Profile page — display user's stories and bookmarks in the UI
- Delete button — frontend UI for removing your own stories
- Location fields — city/country input on the publish form
- Deployment — Railway, Render, or similar

---

## 🌍 About

Soma Side started as a personal project — a teachable moment. The name comes from *kusoma*, Swahili for *to read*. The goal is a platform where African voices in literature get a real, beautiful home on the internet.

This is version 2. It began as a static HTML/CSS/JS site and is now a full-stack application. The notes and comments throughout the codebase are intentional — they mark the journey from zero backend knowledge to a working server.

---

*Built with intention. Growing toward millions. 🚀*



###################





