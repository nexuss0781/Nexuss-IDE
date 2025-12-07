# 🚀 Nexuss-IDE

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.1.0-orange)](https://github.com)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com)

A self-hosted, mobile-first, full-stack IDE with a powerful Python-based plugin architecture. Nexuss-IDE combines the versatility of Monaco Editor with a robust Flask backend to create a seamless, extensible coding environment accessible from any modern browser.

> This project is designed to be a lightweight, personal cloud development environment that you can run on any machine and access from anywhere.

---

## ✨ Core Features

*   **Mobile-First Monaco Editor:** A custom, native-like touch experience with draggable selection handles, a long-press context menu, and a floating action toolbar.
*   **Full Stack Environment:** Powered by a **Flask (Python)** backend that handles file I/O, user authentication, and the plugin system.
*   **Workspace Management:** Use the "Open Folder" feature to upload and manage entire project directories directly from your device.
*   **Autosave & Feedback:** Changes are automatically saved to the server seconds after you stop typing, with subtle, non-intrusive notifications.
*   **Secure User Authentication:** A robust login and registration system using a local SQLite database keeps your workspace private.
*   **Extensible Plugin Architecture:** The core of Nexuss-IDE. Create and integrate your own server-side applications using a simple but powerful Flask Blueprint system.

---

## 🔌 The Power of Extensibility

Nexuss-IDE is not just a tool; it's a platform. The core of the IDE is its plugin architecture, allowing developers to create and integrate their own server-side applications using **Flask Blueprints**.

This system allows you to extend the IDE with custom tools tailored to your workflow, such as:

*   A real-time Markdown previewer.
*   A database management tool for your projects.
*   An API testing client (like a mini-Postman).
*   Project-specific dashboards and documentation viewers.

Your custom Python code gets access to the core application's database and authentication, allowing for deep and powerful integrations.

> ### **Want to build your own extension?**
>
> We have written a complete guide to help you get started. Please read our **[Extension-doc.md](./Extension-doc.md)**.

---

## 💻 Tech Stack

| Category | Technology |
|---|---|
| **Backend** | ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) ![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white) |
| **Frontend** | ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white) |
| **Database** | ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white) with **Flask-Migrate** |
| **Editor** | **Monaco Editor** (from CDN) |
| **Icons** | **FontAwesome** |

---

## 🚀 Getting Started

Follow these steps to run your own instance of Nexuss-IDE.

### 1. Prerequisites
*   Python 3.x
*   `pip` package manager

### 2. Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/Nexuss-IDE.git
    cd Nexuss-IDE
    ```
2.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

### 3. Database Setup (Flask-Migrate)
This is a one-time setup. The migration system will handle all future database changes.

1.  **Set the Flask App environment variable:**
    *   On Linux/macOS: `export FLASK_APP=app.py`
    *   On Windows: `set FLASK_APP=app.py`

2.  **Initialize the migration directory:**
    ```bash
    flask db init
    ```

3.  **Create the initial migration (This scans all models, including extensions):**
    ```bash
    flask db migrate -m "Initial migration"
    ```

4.  **Apply the migration to the database:**
    ```bash
    flask db upgrade
    ```

### 4. Running the Server
1.  **Start the Flask application:**
    ```bash
    python app.py
    ```
2.  **Access the IDE:**
    *   Open your browser and navigate to `http://127.0.0.1:5000`.
    *   To access from a mobile device on the same network, use your computer's local IP address (e.g., `http://192.168.1.10:5000`).

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
