/* static/js/editor.js */

// Global reference for ide.js to access
window.editorInstance = null;

require(['vs/editor/editor.main'], function () {

    // 1. Initialize Monaco Editor
    var editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: '// Welcome to Ethco Editor!\n// Use the menu to open a folder and begin.',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        contextmenu: false, // Disable default right-click to control it manually
        minimap: { enabled: false }, 
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        scrollbar: {
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
        },
        touchMultiTouchZoom: true
    });

    window.editorInstance = editor;

    // 2. UI Elements & State
    var handleStart = document.getElementById('handle-start');
    var handleEnd = document.getElementById('handle-end');
    var toolbar = document.getElementById('mini-toolbar');
    
    var btnCopy = document.getElementById('btn-copy');
    var btnPaste = document.getElementById('btn-paste');
    var btnMore = document.getElementById('btn-more');
    var toast = document.getElementById('flash-toast');

    // **CRITICAL BUG FIX STATE**: This flag forces the context menu to stay open
    var isContextMenuForced = false;

    // Helper: Toast
    function showToast(message) {
        if(toast) {
            toast.innerHTML = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }
    }

    // 3. Overlay Sync Logic (Handles + Toolbar)
    function updateOverlay() {
        var selection = editor.getSelection();

        // SCENARIO 1: No Selection (Cursor only)
        if (!selection || selection.isEmpty()) {
            handleStart.style.display = 'none';
            handleEnd.style.display = 'none';
            // **BUG FIX**: Only hide the toolbar if it wasn't explicitly forced open by a long press.
            if (!isContextMenuForced) {
                toolbar.style.display = 'none';
            }
            return;
        }

        // SCENARIO 2: Text is Selected
        var startPos = editor.getScrolledVisiblePosition(selection.getStartPosition());
        var endPos = editor.getScrolledVisiblePosition(selection.getEndPosition());

        if (!startPos || !endPos) { // Scrolled out of view
            handleStart.style.display = 'none';
            handleEnd.style.display = 'none';
            toolbar.style.display = 'none';
            return;
        }

        var lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);

        // Position Handles
        handleStart.style.display = 'block';
        handleStart.style.top = (startPos.top + lineHeight) + 'px';
        handleStart.style.left = startPos.left + 'px';

        handleEnd.style.display = 'block';
        handleEnd.style.top = (endPos.top + lineHeight) + 'px';
        handleEnd.style.left = endPos.left + 'px';

        // Position Toolbar
        positionToolbar(startPos.top, startPos.left, endPos.left);
    }

    function positionToolbar(top, left1, left2) {
        var centerX = (left2 !== undefined) ? (left1 + left2) / 2 : left1;

        // Keep inside screen bounds
        if (centerX < 90) centerX = 90;
        if (centerX > window.innerWidth - 90) centerX = window.innerWidth - 90;

        toolbar.style.display = 'flex';
        toolbar.style.top = (top - 50) + 'px';
        toolbar.style.left = centerX + 'px';
    }

    // Sync Events
    editor.onDidChangeCursorSelection(updateOverlay);
    editor.onDidScrollChange(updateOverlay);

    // 4. Toolbar Actions
    function hideToolbarAfterAction() {
        toolbar.style.display = 'none';
        isContextMenuForced = false; // Reset the state
    }

    btnCopy.addEventListener('touchstart', function(e) {
        e.preventDefault();
        editor.focus();
        document.execCommand('copy');
        showToast('<i class="fa-solid fa-clipboard-check"></i> Copied');
        hideToolbarAfterAction();
    });

    btnPaste.addEventListener('touchstart', function(e) {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
            var selection = editor.getSelection();
            var op = { range: selection, text: text, forceMoveMarkers: true };
            editor.executeEdits("paste", [op]);
        }).catch(err => {
            showToast('Clipboard permission required');
        });
        hideToolbarAfterAction();
    });



    btnMore.addEventListener('touchstart', function(e) {
        e.preventDefault();
        hideToolbarAfterAction();
        editor.trigger('source', 'editor.action.showContextMenu');
    });

    // 5. Draggable Handles
    function initDrag(handleElement) {
        var isDragging = false;
        handleElement.addEventListener('touchstart', function(e) {
            isDragging = true;
            e.preventDefault(); e.stopPropagation();
        });

        document.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            var touch = e.touches[0];
            var target = editor.getTargetAtClientPoint(touch.clientX, touch.clientY - 35);
            if (target && target.position) {
                var currentSelection = editor.getSelection();
                var newSelection;
                var isStartHandle = handleElement.id === 'handle-start';

                if (isStartHandle) {
                    newSelection = new monaco.Selection(target.position.lineNumber, target.position.column, currentSelection.endLineNumber, currentSelection.endColumn);
                } else {
                    newSelection = new monaco.Selection(currentSelection.startLineNumber, currentSelection.startColumn, target.position.lineNumber, target.position.column);
                }
                editor.setSelection(newSelection);
            }
        }, { passive: false });

        document.addEventListener('touchend', () => { isDragging = false; });
    }

    initDrag(handleStart);
    initDrag(handleEnd);

    // 6. LONG PRESS LOGIC (With Bug Fix)
    var container = document.getElementById('editor-container');
    var longPressTimer;
    var startX, startY;

    container.addEventListener('touchstart', function(e) {
        if(e.touches.length > 1) return; // Ignore pinch

        var touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        
        // **BUG FIX**: Reset the forced state on every new touch.
        // And hide the toolbar until a long press confirms it should be shown.
        isContextMenuForced = false;
        toolbar.style.display = 'none';

        longPressTimer = setTimeout(function() {
            // **BUG FIX**: A long press has occurred, so we force the context menu to be active.
            isContextMenuForced = true;
            
            var target = editor.getTargetAtClientPoint(startX, startY);
            if (target && target.position) {
                var model = editor.getModel();
                var word = model.getWordAtPosition(target.position);

                if (navigator.vibrate) navigator.vibrate(50);

                if (word) {
                    // CASE A: Word Selected
                    var newSelection = new monaco.Selection(target.position.lineNumber, word.startColumn, target.position.lineNumber, word.endColumn);
                    editor.setSelection(newSelection);
                    // updateOverlay will then correctly show everything
                } else {
                    // CASE B: Empty Space
                    editor.setPosition(target.position);
                    var scrolledPos = editor.getScrolledVisiblePosition(target.position);
                    if (scrolledPos) {
                        positionToolbar(scrolledPos.top, scrolledPos.left);
                    }
                    // Ensure handles are hidden
                    handleStart.style.display = 'none';
                    handleEnd.style.display = 'none';
                }
            }
        }, 500); // 500ms
    }, {passive: false});

    container.addEventListener('touchmove', function(e) {
        var touch = e.touches[0];
        if (Math.abs(touch.clientX - startX) > 10 || Math.abs(touch.clientY - startY) > 10) {
            clearTimeout(longPressTimer);
        }
    });

    container.addEventListener('touchend', function() {
        clearTimeout(longPressTimer);
    });

    // Final clean up of loading screen
    var loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => loadingScreen.remove(), 500);
        }, 800);
    }
});