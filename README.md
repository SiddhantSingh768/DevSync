# DevSync: Intelligent Collaborative Documentation Platform

## Executive Summary

**DevSync** is a modern, full-stack Markdown editing environment engineered to bridge the gap between local-first performance and cloud-based collaboration. Built with **React 19** and **TypeScript**, it demonstrates advanced frontend architectural patterns, including offline capabilities, hybrid state management, and Generative AI integration.

This project was designed to showcase proficiency in building scalable, resilient web applications that prioritize user experience and performance.

---

## Interface Previews

### 1. The Intelligent Workspace

_A clean, glassmorphic dashboard for managing documentation, featuring real-time search and document status indicators._
![Dashboard Interface](/screenshots/dashboard.png)

### 2. Split-Pane Editor & AI Assistant

_Seamless writing experience with real-time Markdown rendering. The integrated Gemini AI assistant helps generate code snippets and technical summaries instantly._
![Editor Interface](/screenshots/editor.png)

### 3. Adaptive Dark Mode

_Fully responsive dark mode designed with high-contrast syntax highlighting to reduce eye strain during late-night coding sessions._
![Dark Mode Interface](/screenshots/workspace.png)

---

## Architecture & Technical Highlights

### 1. Hybrid "Local-First" Architecture

DevSync implements a unique **Dual-Mode Data Strategy** that decouples the UI from the data source via a strict Service Layer abstraction.

- **Offline Mode (Default)**: Leverages `IndexedDB` and `localStorage` to provide zero-latency interactions. Syncs state across browser tabs instantly using the **BroadcastChannel API**.
- **Server Mode**: Seamlessly switches to a **Node.js/Express + MongoDB** backend for persistent, cross-device synchronization and JWT-based authentication.

### 2. AI-Augmented Workflow

Integrated with **Google's Gemini 3.5 Pro** model (via `@google/genai`), DevSync offers an intelligent writing assistant that acts as a pair programmer for technical documentation.

- **Context-Aware**: The AI analyzes the active document's content to generate relevant continuations, code snippets, or summaries.
- **Streamlined UX**: AI interactions are embedded directly into the editor flow, reducing context switching.

### 3. Modern React Patterns

- **React 19**: Utilizes the latest concurrent features and hooks for optimized rendering.
- **Custom Hooks**: Encapsulates complex logic for authentication (`useAuth`), synchronization, and theme management.
- **Optimistic UI**: Interface updates immediately upon user action, handling data persistence in the background to ensure perceived performance remains high.

---

## Technology Stack

### Frontend Ecosystem

- **Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (Dark/Light mode, Glassmorphism design system)
- **Icons**: Lucide React
- **AI**: Google GenAI SDK

### Backend & Data

- **Runtime**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Security**: JSON Web Tokens (JWT), BCrypt (hashing simulation)

---

## Key Features

- **📝 Split-Pane Editor**: Real-time Markdown rendering with syntax highlighting support.
- **🌗 Adaptive Theming**: System-aware Dark and Light modes with smooth transitions.
- **⚡ Real-Time Sync**:
  - _Local_: Tab-to-tab sync via BroadcastChannel.
  - _Remote_: Polling-based sync with presence detection (Active Peers visualization).
- **🔒 Security**: Protected routes, session management, and environment variable isolation.

---

## Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/devsync.git
    cd devsync
    ```

2.  **Install Dependencies**

    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:

    ```env
    # Required for AI Features
    API_KEY=your_google_gemini_api_key

    # Optional: For Server Mode
    MONGODB_URI=mongodb://localhost:27017/devsync
    ```

4.  **Run Application**

    ```bash
    # Run Frontend (Local Mode)
    npm run dev

    # Run Backend (Optional - for Server Mode)
    node server/index.js
    ```

---

## Author

**Siddhant singh**  
Full Stack Developer  
[LinkedIn](https://www.linkedin.com/in/siddhantsingh768/) • [Portfolio](https://siddhantsingh.vercel.app/)
