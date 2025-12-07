from flask import Blueprint, render_template, request, redirect, url_for
from flask_login import login_required, current_user

# ==========================================
# 1. PLACEHOLDERS & BLUEPRINT DEFINITION
# ==========================================

# Create global placeholders. These will be populated later.
db = None
Todo = None

# Define the blueprint object. Routes will be attached to this.
todo_app_blueprint = Blueprint(
    'todo_app', 
    __name__, 
    template_folder='templates',
    url_prefix='/todo'
)

# ==========================================
# 2. EXTENSION ROUTES
# ==========================================
# These routes will work because by the time a user accesses them,
# the 'Todo' variable will have been replaced with the real database model.

@todo_app_blueprint.route('/')
@login_required
def index():
    """Main view for the Todo app."""
    if Todo: # Check if the model is initialized
        user_todos = Todo.query.filter_by(user_id=current_user.id).all()
        return render_template('todo.html', todos=user_todos)
    return "Error: Todo extension not initialized correctly.", 500

@todo_app_blueprint.route('/add', methods=['POST'])
@login_required
def add_todo():
    """Handles adding a new todo item."""
    todo_content = request.form.get('content')
    if todo_content and Todo:
        new_todo = Todo(content=todo_content, user_id=current_user.id)
        db.session.add(new_todo)
        db.session.commit()
    return redirect(url_for('todo_app.index'))

@todo_app_blueprint.route('/delete/<int:todo_id>')
@login_required
def delete_todo(todo_id):
    """Deletes a specific todo item."""
    if Todo:
        todo_to_delete = Todo.query.filter_by(id=todo_id, user_id=current_user.id).first()
        if todo_to_delete:
            db.session.delete(todo_to_delete)
            db.session.commit()
    return redirect(url_for('todo_app.index'))

# ==========================================
# 3. INITIALIZATION FUNCTION (THE FIX)
# ==========================================

def create_blueprint(flask_app, database):
    """
    This is the entry point called by the main app.py.
    It receives the live database object and initializes the extension.
    """
    global db, Todo
    db = database # 1. Receive the real database object.

    # 2. **THE FIX**: Define the database model class *inside* this function.
    # Now, `db.Model` is the real thing, not None.
    class TodoModel(db.Model):
        __tablename__ = 'todo' # Best practice to explicitly name the table
        id = db.Column(db.Integer, primary_key=True)
        content = db.Column(db.String(200), nullable=False)
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
        user = db.relationship('User', backref=db.backref('extension_todos', lazy=True))

    # 3. Assign the fully-initialized model to the global placeholder.
    Todo = TodoModel

    print("[+] TodoApp Extension: Database model successfully initialized.")

    # 4. Return the configured blueprint to the main app.
    return todo_app_blueprint