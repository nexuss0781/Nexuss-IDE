---

# Nexuss-IDE Extension Development Guide

Welcome, developer! This guide will walk you through the process of creating and integrating your own custom applications (extensions) into Nexuss-IDE. The platform supports two types of extensions, allowing for a range of complexity from simple static pages to powerful, database-integrated Python applications.

## Table of Contents

1.  [Understanding the Extension System](#understanding-the-extension-system)
2.  [Type 1: Static HTML/JS Extensions](#type-1-static-htmljs-extensions)
    *   [When to Use](#when-to-use)
    *   [Folder Structure](#folder-structure)
    *   [Example: Creating a "Notes" App](#example-creating-a-notes-app)
3.  [Type 2: Python (Flask Blueprint) Extensions](#type-2-python-flask-blueprint-extensions)
    *   [When to Use](#when-to-use-1)
    *   [The Extension SDK](#the-extension-sdk)
    *   [Folder Structure](#folder-structure-1)
    *   [Step-by-Step Guide: Creating a "Todo List" App](#step-by-step-guide-creating-a-todo-list-app)
        *   [Step 1: The `manifest.json` File](#step-1-the-manifestjson-file)
        *   [Step 2: The `main.py` Backend Logic](#step-2-the-mainpy-backend-logic)
        *   [Step 3: The `todo.html` Template](#step-3-the-todohtml-template)
4.  [Best Practices & Tips](#best-practices--tips)

---

## Understanding the Extension System

All extensions live inside the `/extensions` directory of your Nexuss-IDE project. The IDE's backend automatically scans this directory on startup to discover and load your applications.

The key difference between a "Static" and a "Python" extension is the presence of a `manifest.json` file.
*   **No `manifest.json`**: The IDE treats it as a simple Static Extension.
*   **`manifest.json` present**: The IDE treats it as a powerful Python Extension.

---

## Type 1: Static HTML/JS Extensions

This is the simplest way to create an extension. It's essentially a self-contained, client-side web page that runs inside the IDE's app drawer.

### When to Use
*   Creating simple tools like a calculator, a unit converter, or a color picker.
*   Displaying static information, like a cheatsheet or project documentation.
*   Building a simple client-side application that uses browser APIs (like `localStorage`).

### Folder Structure
The structure is minimal. Create a folder inside `/extensions` and place your files inside it.

```text
/extensions
  └── MyStaticApp/
      ├── index.html     (Required - This is the entry point)
      ├── style.css      (Optional)
      ├── script.js      (Optional)
      └── icon.png       (Optional - Recommended for the app drawer)
```

### Example: Creating a "Notes" App
1.  **Create the folder:** `extensions/MyNotes/`
2.  **Add an icon:** Save a 60x60 `icon.png` in the folder.
3.  **Create `index.html`:**
    ```html
    <!-- extensions/MyNotes/index.html -->
    <!DOCTYPE html>
    <html>
    <head>
        <title>Simple Notes</title>
        <style>
            body { font-family: sans-serif; background: #2d2d30; color: white; padding: 15px; }
            textarea { width: 100%; height: 80vh; background: #1e1e1e; color: white; border: 1px solid #444; }
        </style>
    </head>
    <body>
        <h2>My Local Notes</h2>
        <textarea id="notes-area"></textarea>
        <script>
            const area = document.getElementById('notes-area');
            area.value = localStorage.getItem('my-notes-app-data') || 'Type here...';
            area.onkeyup = () => {
                localStorage.setItem('my-notes-app-data', area.value);
            };
        </script>
    </body>
    </html>
    ```
4.  **Done!** Restart the Nexuss-IDE server. Your "MyNotes" app will now appear in the App Drawer and will function, saving data locally in the browser.

---

## Type 2: Python (Flask Blueprint) Extensions

This is the most powerful way to extend Nexuss-IDE. It allows you to write server-side logic, interact with the main application's database, and create fully dynamic web applications.

### When to Use
*   When you need to save data persistently on the server (e.g., a todo list, a project management tool).
*   When you need to perform server-side computations or interact with external APIs.
*   When you need to create multi-user applications that are aware of the currently logged-in user.

### The Extension SDK
When Nexuss-IDE loads your Python extension, it provides an "SDK" by passing two critical objects from the core application to your extension's initialization function:
*   `flask_app`: The main Flask application instance.
*   `database`: The core SQLAlchemy database object (`db`). This allows your extension to define its own database models and interact with existing ones (like the `User` model).

### Folder Structure
A Python extension is identified by its `manifest.json` file.

```text
/extensions
  └── MyPythonApp/
      ├── manifest.json      (Required)
      ├── main.py            (Required - The backend logic)
      ├── templates/         (Optional - For your HTML templates)
      │   └── my_page.html
      └── icon.png           (Optional - Defined in manifest)
```

### Step-by-Step Guide: Creating a "Todo List" App

This guide will recreate the `TodoApp` example, explaining each part.

#### Step 1: The `manifest.json` File
This file is the "passport" for your extension. It tells Nexuss-IDE how to load and run it.

*   **Create the file:** `extensions/TodoApp/manifest.json`

```json
{
  "name": "Todo List",
  "icon": "icon.png",
  "entry_point": "main.py",
  "base_route": "/todo/",
  "init_function": "create_blueprint"
}
```*   `name`: The display name in the App Drawer.
*   `icon`: The icon file within your extension's folder.
*   `entry_point`: The name of your main Python file.
*   `base_route`: The URL prefix for all routes in your extension (e.g., `http://.../todo/add`).
*   `init_function`: The name of the function inside `entry_point` that Nexuss-IDE must call to initialize your extension.

#### Step 2: The `main.py` Backend Logic
This is the heart of your extension. It defines the database model, the web routes, and the initialization bridge to the core application.

*   **Create the file:** `extensions/TodoApp/main.py`

```python
from flask import Blueprint, render_template, request, redirect, url_for
from flask_login import login_required, current_user

# Global reference to the database object
db = None

# 1. Define your Database Model (inherits from a placeholder initially)
class Todo(db.Model if db else object):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(200), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id')) # Link to core User model
    user = db.relationship('User', backref=db.backref('todos', lazy=True))

# 2. Create your Flask Blueprint
# This tells Flask how to group your extension's routes and templates.
todo_app_blueprint = Blueprint(
    'todo_app',          # A unique name for the blueprint
    __name__,
    template_folder='templates', # Points to your local templates folder
    url_prefix='/todo'   # Must match 'base_route' in manifest
)

# 3. Define your Routes
# These are the URLs that power your application.
@todo_app_blueprint.route('/')
@login_required
def index():
    user_todos = Todo.query.filter_by(user_id=current_user.id).all()
    return render_template('todo.html', todos=user_todos)

@todo_app_blueprint.route('/add', methods=['POST'])
@login_required
def add_todo():
    # ... logic to add a todo ...
    return redirect(url_for('todo_app.index'))

# ... other routes like delete ...

# 4. Create the Initialization Function (The SDK Entry Point)
def create_blueprint(flask_app, database):
    """This function is called by Nexuss-IDE on startup."""
    global db
    db = database # Receive the real database object

    # Re-initialize your model with the real db object to make it work
    class InitializedTodo(db.Model):
        __tablename__ = 'todo'
        id = db.Column(db.Integer, primary_key=True)
        content = db.Column(db.String(200), nullable=False)
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
        user = db.relationship('User', backref=db.backref('extension_todos', lazy=True))
    
    global Todo
    Todo = InitializedTodo

    # IMPORTANT: Return the blueprint to the main app to be registered.
    return todo_app_blueprint
```

#### Step 3: The `todo.html` Template
This is the frontend UI for your extension. It's standard HTML with Jinja2 templating.

*   **Create the folder:** `extensions/TodoApp/templates/`
*   **Create the file:** `extensions/TodoApp/templates/todo.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Tasks</title>
    <!-- Add some simple styling -->
</head>
<body>
    <h1>My Tasks for {{ current_user.username }}</h1>
    
    <form action="{{ url_for('todo_app.add_todo') }}" method="POST">
        <input type="text" name="content" placeholder="New task...">
        <button type="submit">Add</button>
    </form>
    
    <ul>
        {% for todo in todos %}
            <li>{{ todo.content }}</li>
        {% endfor %}
    </ul>
</body>
</html>
```

After creating these three files and restarting the server, Nexuss-IDE will automatically discover your extension, create the `todo` table in the database, and make your new application available in the App Drawer.

---

## Best Practices & Tips
*   **Isolate Dependencies:** Try to keep your extensions self-contained. If you need a specific Python library, it's best to manage it carefully.
*   **Security:** When building routes, always use `@login_required` and check that the data belongs to the `current_user` to prevent users from seeing or modifying each other's data.
*   **Error Handling:** Your extension's code runs within the main application. Unhandled errors can crash the entire IDE, so use `try...except` blocks for risky operations.
*   **Keep it Simple:** The power of Nexuss-IDE is its simplicity. Build extensions that are focused and solve one problem well.
