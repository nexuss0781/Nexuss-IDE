import asyncio
import websockets
from flask import Blueprint, render_template, request
from flask_login import login_required
from flask_socketio import Namespace, emit

# ='=========================================
# 1. CONFIGURATION & STATE
# ==========================================

EXTERNAL_TERMINAL_URL = "wss://bash-terminalbackend.onrender.com"
CONNECTION_TIMEOUT = 180  # 3 minutes in seconds

# In-memory dictionary to map a user's session ID (sid) to their external terminal connection.
connections = {}

# Global reference to the main SocketIO instance
socketio = None

# ==========================================
# 2. FLASK BLUEPRINT FOR THE UI
# ==========================================
terminal_app_blueprint = Blueprint(
    'terminal_app',
    __name__,
    template_folder='templates',
    url_prefix='/terminal'
)

@terminal_app_blueprint.route('/')
@login_required
def index():
    """Serves the main terminal.html user interface."""
    return render_template('terminal.html', socketio_namespace='/terminal_ws')

# ==========================================
# 3. BACKGROUND PROXY TASK (WITH TIMEOUT & FEEDBACK)
# ==========================================

async def proxy_to_terminal_async(sid):
    """
    This is the core async task that connects to the external terminal and
    continuously relays messages back and forth.
    """
    try:
        # **UX FIX**: Inform the user that we are connecting and it might take time.
        socketio.emit('status_update', 'Connecting to external terminal... This may take up to 3 minutes for the service to wake up.', to=sid, namespace='/terminal_ws')
        
        # **BUG FIX**: Apply the generous connection timeout.
        async with websockets.connect(EXTERNAL_TERMINAL_URL, open_timeout=CONNECTION_TIMEOUT) as websocket:
            
            # **UX FIX**: Inform the user of success.
            socketio.emit('status_update', 'Connection successful! Terminal is ready.', to=sid, namespace='/terminal_ws')
            
            print(f"Successfully connected to external terminal for SID: {sid}")
            connections[sid] = websocket
            
            # This loop runs forever, listening for messages from the ttyd server.
            async for message in websocket:
                socketio.emit('terminal_output', message, to=sid, namespace='/terminal_ws')
                
    except asyncio.TimeoutError:
        print(f"Connection timed out for SID {sid} after {CONNECTION_TIMEOUT} seconds.")
        socketio.emit('terminal_error', f"Connection failed: The external terminal did not respond within {CONNECTION_TIMEOUT} seconds.", to=sid, namespace='/terminal_ws')
    except Exception as e:
        print(f"Error in terminal proxy for SID {sid}: {e}")
        socketio.emit('terminal_error', f"An error occurred: {e}", to=sid, namespace='/terminal_ws')
    finally:
        # Clean up if the connection is lost.
        if sid in connections:
            del connections[sid]
        print(f"Proxy task ended for SID: {sid}")

def run_proxy_wrapper(sid):
    """
    Synchronous wrapper to run the async proxy task in a background thread.
    """
    try:
        asyncio.run(proxy_to_terminal_async(sid))
    except Exception as e:
        print(f"Error starting asyncio loop for proxy wrapper: {e}")

# ==========================================
# 4. SOCKET.IO NAMESPACE
# ==========================================

class TerminalNamespace(Namespace):
    """
    Manages the real-time WebSocket communication from the user's browser.
    """

    def on_connect(self):
        """Triggered when a user's browser connects."""
        sid = request.sid
        print(f"Browser connected to Terminal Namespace: {sid}")
        socketio.start_background_task(run_proxy_wrapper, sid)

    def on_disconnect(self):
        """Triggered when a user's browser disconnects."""
        sid = request.sid
        print(f"Browser disconnected from Terminal Namespace: {sid}")
        if sid in connections:
            # **BUG FIX**: Don't use asyncio.run in a running loop.
            # Schedule the close operation on the existing loop.
            asyncio.create_task(connections[sid].close())
            del connections[sid]
            print(f"Scheduled closure of external connection for SID: {sid}")

    def on_terminal_input(self, data):
        """Receives data from the user and forwards it to the external terminal."""
        sid = request.sid
        if sid in connections:
            asyncio.run(connections[sid].send(data))

# ==========================================
# 5. INITIALIZATION FUNCTION
# ==========================================

def create_blueprint(flask_app, database, socketio_instance):
    """Called by the main app.py to initialize the extension."""
    global socketio
    socketio = socketio_instance

    socketio.on_namespace(TerminalNamespace('/terminal_ws'))
    
    print("[+] NexussTerminal Extension: SocketIO Namespace registered.")

    return terminal_app_blueprint