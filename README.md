# DevSync: Technical Architecture & Development Guide

## 1. Project Overview
**DevSync** is a collaborative Markdown editor designed for developers and technical writers. It operates like a "Google Docs for Code," allowing users to write documentation, see live previews, and sync changes.

What makes this application unique is its **Hybrid Architecture**:
1.  **Offline Mode (Local):** It works entirely in the browser using `localStorage`. No internet or server is required.
2.  **Server Mode (Cloud):** It connects to a Node.js/MongoDB backend for permanent storage and authentication across devices.

---

## 2. Technology Stack

### Frontend ( The User Interface )
*   **React 19:** The core library for building the user interface. We use Functional Components and Hooks (`useState`, `useEffect`, `useRef`) exclusively.
*   **TypeScript:** Adds strict typing (e.g., defining what a `User` or `Document` looks like) to prevent bugs.
*   **Tailwind CSS:** A utility-first CSS framework. We use it for:
    *   **Dark/Light Mode:** Handling `dark:` classes.
    *   **Styling:** Gradients, blurs (glassmorphism), and responsiveness.
*   **Lucide React:** A clean, modern icon set.
*   **Google GenAI SDK:** Used to connect to the Gemini API for the AI writing assistant.

### Backend ( The Server - Optional )
*   **Node.js & Express:** Handles API requests (Login, Save, Load).
*   **MongoDB & Mongoose:** A NoSQL database used to store users and documents.
*   **JWT (JSON Web Tokens):** Handles security. When you log in, the server gives you a "badge" (Token) that proves who you are for subsequent requests.

---

## 3. Architecture Deep Dive

### The "Service Layer" Pattern
The application uses a **Service Layer** pattern to abstract away data sources. This is how the app switches between Offline and Online modes without breaking the UI.

*   **`components/` (UI):** The visual parts (Dashboard, Editor) **do not know** where data comes from. They simply call `docService.saveDocument()`.
*   **`services/` (Logic):**
    *   **`authService.ts`**: Checks `localStorage` to see if we are in 'local' or 'server' mode.
    *   **`docService.ts`**:
        *   *If Local:* Saves data to the browser's IndexedDB/LocalStorage.
        *   *If Server:* Sends a `fetch()` request to the Node.js backend.

### Real-Time Synchronization
Syncing happens in two ways:
1.  **Tab-to-Tab (Local):** We use the **BroadcastChannel API**. If you have two tabs open, they talk directly to each other without needing a server.
2.  **Polling (Server):** The `Editor` component periodically asks the server, "Are there any changes?" and updates the UI if a peer has modified the document.

---

## 4. Key Features Explained

### A. Authentication
*   **Local Mode:** We simulate a login by creating a fake user object and storing it in browser storage.
*   **Server Mode:**
    1.  User sends Email/Password.
    2.  Server verifies hash.
    3.  Server returns a **JWT Token**.
    4.  Frontend stores this token and sends it in the `Authorization` header for every request.

### B. The Editor & Markdown Preview
The editor is a "Split View":
*   **Input:** A standard HTML `<textarea>`.
*   **Output:** A custom React component (`MarkdownPreview`) that takes the text and uses **Regular Expressions (Regex)** to convert `# Title` into `<h1>Title</h1>`, `**bold**` into `<b>bold</b>`, etc. This was built manually to be lightweight, rather than using a heavy library.

### C. AI Integration
We use the `@google/genai` library.
1.  User clicks the "Sparkles" icon.
2.  App sends the current document context + user prompt to Gemini.
3.  Gemini returns markdown text.
4.  The app inserts this text into the document stream.

---

## 5. File Structure
```
/
├── index.html          # Entry point, imports Tailwind & React
├── App.tsx             # Main Router (Handles URL navigation)
├── index.tsx           # Mounts React to the DOM
├── types.ts            # TypeScript definitions (Data Models)
├── TECHNICAL_DOCS.md   # This file
│
├── components/         # Visual Building Blocks
│   ├── Auth.tsx        # Login/Register Screen
│   ├── Dashboard.tsx   # List of documents
│   ├── Editor.tsx      # The writing interface
│   └── ThemeToggle.tsx # Light/Dark mode switcher
│
├── services/           # Business Logic
│   ├── authService.ts  # Handles Login/Logout logic
│   ├── docService.ts   # Handles CRUD (Create, Read, Update, Delete)
│   ├── syncService.ts  # Handles BroadcastChannel communication
│   └── db.ts           # Mock Database for Offline Mode
│
└── server/             # Backend Code
    └── index.js        # Express Server & MongoDB connection
```

## 6. How to Run

### Frontend (React)
Since this project uses ES Modules via CDN (in `index.html`), you don't need a build step (like Webpack or Vite) for the frontend code provided here. You just need a static server.

### Backend (Node.js)
1.  Create a `.env` file with `MONGODB_URI`.
2.  Run `npm install` inside the root to install backend dependencies.
3.  Run `node server/index.js`.
4.  In the app login screen, toggle "Offline Mode" to "Server Online".
