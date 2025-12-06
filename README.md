# 🚀 Nexuss-IDE

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-orange)](https://github.com)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com)

A lightweight, self-hosted, full-stack IDE designed for touchscreens and modern browsers. Nexuss-IDE combines the power of Monaco Editor with a Python backend to create a seamless, mobile-first coding environment.

![Nexuss-IDE Screenshot](/.github/screenshot.png) 
*(Suggestion: Add a screenshot of the editor in action here)*

---

## ✨ Core Features

*   **Mobile-First Monaco Editor:** The core editor is enhanced with a custom, native-like touch experience, including draggable selection handles, a long-press context menu, and a floating action toolbar.
*   **Full Stack Environment:** Powered by a **Flask (Python)** backend that handles file I/O, user authentication, and serves the entire application.
*   **Complete File System Management:** Use the "Open Folder" feature to upload and edit entire projects directly from your device.
*   **Autosave Functionality:** Never lose your work. Changes are automatically saved to the server seconds after you stop typing.
*   **Secure User Authentication:** A robust login and registration system using a local SQLite database keeps your workspace private.
*   **🚀 Application Extension Engine:** The standout feature of Nexuss-IDE. A powerful, general-purpose interface to run self-contained web applications directly within the IDE.

---

## 🔌 The Application Extension Engine

Nexuss-IDE is more than just an editor; it's an extensible platform. The Application Extension system allows you to build and run your own custom tools, viewers, or utilities in an isolated environment, accessible from the IDE's App Drawer.

### How It Works

The system is designed for simplicity and power:

1.  **Create a Folder:** Simply add a new folder inside the `/extensions` directory of the project. The name of the folder becomes the name of your application.
2.  **Add an Icon:** Place an `icon.png` or `icon.jpg` file in your app's folder. Nexuss-IDE will automatically use this as the app's icon in the grid view.
3.  **Build Your App:** The entry point for your application is an `index.html` file. You can build any client-side web application (using HTML, CSS, and JavaScript) and place its files within this folder.
4.  **Automatic Discovery:** The Flask backend automatically detects your app folder, serves its content, and displays it in the App Drawer.

When you click your app's icon, it opens in a sandboxed `<iframe>` overlay, giving you a native-like experience.

### Why is this powerful?

This architecture allows you to create custom tools tailored to your workflow, such as:
*   A Markdown previewer.
*   An API testing client (like a mini-Postman).
*   A project-specific documentation viewer.
*   A simple database browser.
*   Any custom utility you can build with web technologies.

---

## 💻 Tech Stack

| Backend        | Frontend            | Database | Editor          |
|----------------|---------------------|----------|-----------------|
| ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) | ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) | ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white) | **Monaco Editor** |
| ![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white) | ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)      |          |                 |
|                | ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)        |          |                 |

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
3.  **Place Monaco Editor:**
    *   Download the Monaco Editor package.
    *   Extract and place the folder into `/static/` so the final path is `/static/monaco-editor/`.

### 3. Running the Server
1.  **Start the Flask application:**
    ```bash
    python app.py
    ```
2.  **Access the IDE:**
    *   Open your browser and navigate to `http://127.0.0.1:5000`.
    *   To access from a mobile device on the same network, use your computer's local IP address (e.g., `http://192.168.1.10:5000`).

---

## 🗺️ Future Roadmap

*   [ ] Real-time File/Folder creation and deletion from the UI.
*   [ ] Integrated Terminal (xterm.js).
*   [ ] Git Integration (View changes, commit, push).
*   [ ] User-configurable editor settings (themes, font size, etc.).

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
