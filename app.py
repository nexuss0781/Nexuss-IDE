import os
import json
import importlib.util
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_migrate import Migrate
from flask_socketio import SocketIO

# ==========================================
# 1. INITIAL SETUP
# ==========================================
app = Flask(__name__)
app.config['SECRET_KEY'] = 'ethco-secure-key-998877'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ethco.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configuration for Folders
BASE_DIR = os.getcwd()
WORKSPACE_DIR = os.path.join(BASE_DIR, 'workspace')
EXTENSIONS_DIR = os.path.join(BASE_DIR, 'extensions')
STATIC_IMAGES_DIR = os.path.join(BASE_DIR, 'static', 'images')

# Create directories
for d in [WORKSPACE_DIR, EXTENSIONS_DIR, STATIC_IMAGES_DIR]:
    os.makedirs(d, exist_ok=True)

# Initialize Database, Login Manager, and SocketIO
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
migrate = Migrate(app, db)
socketio = SocketIO(app)

# ==========================================
# 2. DATABASE MODELS & AUTH
# ==========================================
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    """
    **CODE QUALITY FIX**: Replaced legacy `User.query.get()` with `db.session.get()`.
    """
    return db.session.get(User, int(user_id))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form.get('username')).first()
        if user and check_password_hash(user.password, request.form.get('password')):
            login_user(user)
            return redirect(url_for('ide'))
        flash('Login Failed. Check credentials.', 'error')
    return render_template('login.html', page='login')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        if User.query.filter_by(username=request.form.get('username')).first():
            flash('Username already exists.', 'error')
        else:
            new_user = User(username=request.form.get('username'), password=generate_password_hash(request.form.get('password')))
            db.session.add(new_user)
            db.session.commit()
            flash('Account created! Please login.', 'success')
            return redirect(url_for('login'))
    return render_template('login.html', page='register')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# ==========================================
# 3. CORE IDE & SETTINGS ROUTES
# ==========================================
@app.route('/')
@login_required
def ide():
    return render_template('ide.html', user=current_user)

@app.route('/settings')
@login_required
def settings():
    return render_template('settings.html')

@app.route('/settings/upload-wallpaper', methods=['POST'])
@login_required
def upload_wallpaper():
    file = request.files.get('wallpaper')
    if file and file.filename:
        file.save(os.path.join(STATIC_IMAGES_DIR, 'app_wallpaper.jpg'))
        flash('Wallpaper updated!', 'success')
    else:
        flash('No file selected', 'error')
    return redirect(url_for('settings'))

# ==========================================
# 4. FILE SYSTEM API
# ==========================================
def scan_directory(path):
    tree = []
    try:
        with os.scandir(path) as it:
            entries = sorted(list(it), key=lambda e: (not e.is_dir(), e.name.lower()))
            for entry in entries:
                node = {'name': entry.name, 'path': os.path.relpath(entry.path, WORKSPACE_DIR), 'type': 'folder' if entry.is_dir() else 'file'}
                if entry.is_dir(): node['children'] = scan_directory(entry.path)
                tree.append(node)
    except Exception as e: print(f"Scan Error: {e}")
    return tree

@app.route('/api/files/tree', methods=['GET'])
@login_required
def get_file_tree(): return jsonify(scan_directory(WORKSPACE_DIR))

@app.route('/api/files/read', methods=['POST'])
@login_required
def read_file():
    rel_path = request.json.get('path')
    if '..' in rel_path or rel_path.startswith('/'): return jsonify({'error': 'Invalid path'}), 400
    file_path = os.path.join(WORKSPACE_DIR, rel_path)
    if os.path.isfile(file_path):
        with open(file_path, 'r', encoding='utf-8') as f: return jsonify({'content': f.read()})
    return jsonify({'error': 'File not found'}), 404

@app.route('/api/files/save', methods=['POST'])
@login_required
def save_file():
    rel_path, content = request.json.get('path'), request.json.get('content')
    if '..' in rel_path or rel_path.startswith('/'): return jsonify({'error': 'Invalid path'}), 400
    file_path = os.path.join(WORKSPACE_DIR, rel_path)
    with open(file_path, 'w', encoding='utf-8') as f: f.write(content)
    return jsonify({'success': True})

@app.route('/api/files/upload', methods=['POST'])
@login_required
def upload_file_api():
    file = request.files.get('file')
    if not file: return jsonify({'error': 'No file part'}), 400
    rel_path = request.form.get('path', file.filename)
    if '..' in rel_path or rel_path.startswith('/'): return jsonify({'error': 'Invalid path'}), 400
    full_path = os.path.join(WORKSPACE_DIR, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    file.save(full_path)
    return jsonify({'success': True})

# ==========================================
# 5. EXTENSION SYSTEM (PLUGIN LOADER & API)
# ==========================================
def load_extensions(flask_app, database):
    print("--- Starting Extension Discovery ---")
    for item_name in os.listdir(EXTENSIONS_DIR):
        ext_path = os.path.join(EXTENSIONS_DIR, item_name)
        manifest_path = os.path.join(ext_path, 'manifest.json')
        if os.path.isdir(ext_path) and os.path.exists(manifest_path):
            try:
                with open(manifest_path, 'r') as f: manifest = json.load(f)
                entry_point = manifest.get('entry_point')
                if not entry_point: continue
                
                module_name = f"extensions.{item_name}.{entry_point.replace('.py', '')}"
                spec = importlib.util.spec_from_file_location(module_name, os.path.join(ext_path, entry_point))
                ext_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(ext_module)
                
                init_function_name = manifest.get('init_function', 'create_blueprint')
                init_function = getattr(ext_module, init_function_name, None)
                if not init_function: continue
                
                blueprint = init_function(flask_app, database, socketio)
                if blueprint:
                    flask_app.register_blueprint(blueprint)
                    print(f"[+] Successfully loaded Python extension: '{manifest.get('name', item_name)}'")
            except Exception as e:
                print(f"[!] FAILED to load Python extension '{item_name}': {e}")

@app.route('/api/extensions', methods=['GET'])
@login_required
def list_extensions():
    apps = []
    for folder_name in os.listdir(EXTENSIONS_DIR):
        app_path = os.path.join(EXTENSIONS_DIR, folder_name)
        manifest_path = os.path.join(app_path, 'manifest.json')
        if os.path.isdir(app_path):
            app_info = {'folder_name': folder_name, 'display_name': folder_name, 'icon_filename': 'default', 'type': 'static', 'launch_url': url_for('serve_extension_index', app_name=folder_name)}
            if os.path.exists(manifest_path):
                with open(manifest_path, 'r') as f: manifest = json.load(f)
                app_info.update({'display_name': manifest.get('name', folder_name), 'icon_filename': manifest.get('icon', 'default'), 'type': 'python', 'launch_url': manifest.get('base_route', f'/{folder_name}/')})
            else:
                for file in os.listdir(app_path):
                    if file.lower() in ['icon.png', 'icon.jpg', 'icon.jpeg']:
                        app_info['icon_filename'] = file
                        break
            apps.append(app_info)
    return jsonify(apps)

@app.route('/extension/<app_name>/')
@login_required
def serve_extension_index(app_name):
    return send_from_directory(os.path.join(EXTENSIONS_DIR, app_name), 'index.html')

@app.route('/extension/<app_name>/<path:filename>')
@login_required
def serve_extension_asset(app_name, filename):
    return send_from_directory(os.path.join(EXTENSIONS_DIR, app_name), filename)

# ==========================================
# 6. APP INITIALIZATION
# ==========================================

# Load extensions so their models are registered before the app runs
with app.app_context():
    load_extensions(app, db)

if __name__ == '__main__':
    print("--- Starting Nexuss-IDE Server with SocketIO ---")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)