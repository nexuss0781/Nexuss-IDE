import os
import shutil
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# Initialize Flask
app = Flask(__name__)
app.config['SECRET_KEY'] = 'ethco-secure-key-998877' 
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ethco.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configuration for Folders
BASE_DIR = os.getcwd()
WORKSPACE_DIR = os.path.join(BASE_DIR, 'workspace')
EXTENSIONS_DIR = os.path.join(BASE_DIR, 'extensions')
STATIC_IMAGES_DIR = os.path.join(BASE_DIR, 'static', 'images')

# Create directories if they don't exist
os.makedirs(WORKSPACE_DIR, exist_ok=True)
os.makedirs(EXTENSIONS_DIR, exist_ok=True)
os.makedirs(STATIC_IMAGES_DIR, exist_ok=True)

# Initialize Database & Login Manager
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# ==========================================
# DATABASE MODELS
# ==========================================
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

with app.app_context():
    db.create_all()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('ide'))
        else:
            flash('Login Failed. Check your credentials.', 'error')
            
    return render_template('login.html', page='login')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        if User.query.filter_by(username=username).first():
            flash('Username already exists.', 'error')
        else:
            hashed_pw = generate_password_hash(password)
            new_user = User(username=username, password=hashed_pw)
            db.session.add(new_user)
            db.session.commit()
            flash('Account created successfully! Please login.', 'success')
            return redirect(url_for('login'))
            
    return render_template('login.html', page='register')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# ==========================================
# SETTINGS ROUTES
# ==========================================
@app.route('/settings')
@login_required
def settings():
    return render_template('settings.html')

@app.route('/settings/upload-wallpaper', methods=['POST'])
@login_required
def upload_wallpaper():
    if 'wallpaper' not in request.files:
        flash('No file selected', 'error')
        return redirect(url_for('settings'))
    
    file = request.files['wallpaper']
    if file.filename == '':
        flash('No file selected', 'error')
        return redirect(url_for('settings'))

    if file:
        # Save as a fixed name so we can always load it easily
        # or use secure_filename(file.filename) if you want to keep original names
        filename = 'app_wallpaper.jpg' 
        file.save(os.path.join(STATIC_IMAGES_DIR, filename))
        flash('Wallpaper updated successfully!', 'success')
        return redirect(url_for('settings'))

# ==========================================
# IDE & API ROUTES
# ==========================================
@app.route('/')
@login_required
def ide():
    return render_template('ide.html', user=current_user)

# --- File System API ---

def scan_directory(path):
    tree = []
    try:
        with os.scandir(path) as it:
            entries = sorted(list(it), key=lambda e: (not e.is_dir(), e.name.lower()))
            for entry in entries:
                node = {
                    'name': entry.name,
                    'path': os.path.relpath(entry.path, WORKSPACE_DIR),
                    'type': 'folder' if entry.is_dir() else 'file'
                }
                if entry.is_dir():
                    node['children'] = scan_directory(entry.path)
                tree.append(node)
    except Exception as e:
        print(f"Error scanning directory: {e}")
    return tree

@app.route('/api/files/tree', methods=['GET'])
@login_required
def get_file_tree():
    tree = scan_directory(WORKSPACE_DIR)
    return jsonify(tree)

@app.route('/api/files/read', methods=['POST'])
@login_required
def read_file():
    data = request.json
    rel_path = data.get('path')
    if '..' in rel_path or rel_path.startswith('/'):
        return jsonify({'error': 'Invalid path'}), 400

    file_path = os.path.join(WORKSPACE_DIR, rel_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({'content': content})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'File not found'}), 404

@app.route('/api/files/save', methods=['POST'])
@login_required
def save_file():
    data = request.json
    rel_path = data.get('path')
    content = data.get('content')
    if '..' in rel_path or rel_path.startswith('/'):
        return jsonify({'error': 'Invalid path'}), 400

    file_path = os.path.join(WORKSPACE_DIR, rel_path)
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/upload', methods=['POST'])
@login_required
def upload_file_api():
    """Handles single file upload from the 'Open Folder' action"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    rel_path = request.form.get('path') # Relative path from client

    if not rel_path:
        rel_path = file.filename

    if '..' in rel_path or rel_path.startswith('/'):
        return jsonify({'error': 'Invalid path'}), 400

    full_path = os.path.join(WORKSPACE_DIR, rel_path)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    try:
        file.save(full_path)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================================
# APP EXTENSION SYSTEM
# ==========================================
@app.route('/api/extensions', methods=['GET'])
@login_required
def list_extensions():
    apps = []
    if os.path.exists(EXTENSIONS_DIR):
        for app_name in os.listdir(EXTENSIONS_DIR):
            app_path = os.path.join(EXTENSIONS_DIR, app_name)
            if os.path.isdir(app_path):
                icon_file = None
                for file in os.listdir(app_path):
                    if file.lower() in ['icon.png', 'icon.jpg', 'icon.jpeg']:
                        icon_file = file
                        break
                apps.append({
                    'name': app_name,
                    'icon': icon_file if icon_file else 'default'
                })
    return jsonify(apps)

@app.route('/extension/<app_name>/')
@login_required
def serve_extension_index(app_name):
    app_folder = os.path.join(EXTENSIONS_DIR, app_name)
    return send_from_directory(app_folder, 'index.html')

@app.route('/extension/<app_name>/<path:filename>')
@login_required
def serve_extension_asset(app_name, filename):
    app_folder = os.path.join(EXTENSIONS_DIR, app_name)
    return send_from_directory(app_folder, filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)