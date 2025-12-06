/* static/js/ide.js */

document.addEventListener('DOMContentLoaded', function() {
    
    // ==========================================
    // 1. VARIABLES & REFS
    // ==========================================
    var currentFilePath = null;
    var saveTimer = null;
    var isAutosaveAttached = false;

    // UI Elements
    var sidebarLeft = document.getElementById('sidebar-left');
    var sidebarRight = document.getElementById('sidebar-right');
    var fileTreeContainer = document.getElementById('file-tree');
    var openFolderBtn = document.getElementById('btn-open-folder');
    var openFolderArea = document.querySelector('.sidebar-action-area');
    var folderInput = document.getElementById('folder-input');
    
    var appGridContainer = document.getElementById('app-grid');
    var appOverlay = document.getElementById('app-overlay');
    var appFrame = document.getElementById('app-frame');
    var appTitle = document.getElementById('app-title');
    var labelFileName = document.getElementById('current-file-label');
    var toast = document.getElementById('flash-toast');

    // Toggles
    var btnMenu = document.getElementById('btn-menu');
    var btnApps = document.getElementById('btn-apps');
    var btnCloseLeft = document.getElementById('btn-close-left');
    var btnCloseRight = document.getElementById('btn-close-right');
    var btnCloseApp = document.getElementById('btn-close-app');

    // ==========================================
    // 2. HELPER FUNCTIONS
    // ==========================================
    
    function showToast(msg, isPersistent) {
        toast.innerHTML = msg; // Support HTML for icons
        toast.classList.add('show');
        if (!isPersistent) {
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }

    function hideToast() {
        toast.classList.remove('show');
    }

    // ==========================================
    // 3. SIDEBAR LOGIC
    // ==========================================
    
    // Left (Files)
    btnMenu.addEventListener('click', () => {
        sidebarLeft.classList.add('open');
        sidebarRight.classList.remove('open');
    });
    btnCloseLeft.addEventListener('click', () => sidebarLeft.classList.remove('open'));

    // Right (Apps) + Wallpaper Load
    btnApps.addEventListener('click', () => {
        sidebarRight.classList.add('open');
        sidebarLeft.classList.remove('open');
        
        // Load Wallpaper with timestamp to prevent caching
        var timestamp = new Date().getTime();
        var bgUrl = "/static/images/app_wallpaper.jpg?t=" + timestamp;
        
        // Check if image exists (visually handled by CSS fallback if 404, 
        // but here we force the style)
        var img = new Image();
        img.onload = function() {
            sidebarRight.style.backgroundImage = "url('" + bgUrl + "')";
        };
        img.onerror = function() {
            // If no custom wallpaper, CSS default applies
            sidebarRight.style.backgroundImage = "none"; 
        };
        img.src = bgUrl;

        fetchApps();
    });
    btnCloseRight.addEventListener('click', () => sidebarRight.classList.remove('open'));

    // Close on Center Click
    document.getElementById('editor-wrapper').addEventListener('click', () => {
        sidebarLeft.classList.remove('open');
        sidebarRight.classList.remove('open');
    });

    // ==========================================
    // 4. FILE SYSTEM: OPEN FOLDER & UPLOAD
    // ==========================================

    openFolderBtn.addEventListener('click', function() {
        folderInput.click();
    });

    folderInput.addEventListener('change', function(e) {
        var files = e.target.files;
        if (files.length === 0) return;

        showToast('<i class="fa-solid fa-spinner fa-spin"></i> Importing files...', true);

        var uploadPromises = [];

        // Iterate and upload files
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var formData = new FormData();
            formData.append('file', file);
            // webkitRelativePath gives "Folder/Subfolder/file.txt"
            formData.append('path', file.webkitRelativePath); 

            var p = fetch('/api/files/upload', {
                method: 'POST',
                body: formData
            });
            uploadPromises.push(p);
        }

        // Wait for all uploads
        Promise.all(uploadPromises)
            .then(() => {
                showToast('<i class="fa-solid fa-check"></i> Folder Imported');
                // Hide the button area to simulate "Project Opened" state
                openFolderArea.style.display = 'none';
                fetchFileTree(); // Refresh tree
                setTimeout(hideToast, 2000);
            })
            .catch(err => {
                showToast('<i class="fa-solid fa-triangle-exclamation"></i> Import Partial/Failed');
                console.error(err);
                fetchFileTree();
            });
    });

    // ==========================================
    // 5. FILE SYSTEM: TREE & READ
    // ==========================================

    function fetchFileTree() {
        fetch('/api/files/tree')
            .then(res => res.json())
            .then(data => {
                fileTreeContainer.innerHTML = '';
                if(data.length === 0) {
                    fileTreeContainer.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.5; font-size:0.8rem;">Empty Workspace</div>';
                } else {
                    renderTree(data, fileTreeContainer);
                }
            });
    }

    function renderTree(nodes, container) {
        var ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.paddingLeft = '10px';
        ul.style.margin = '0';

        nodes.forEach(node => {
            var li = document.createElement('li');
            var itemDiv = document.createElement('div');
            itemDiv.className = 'tree-item ' + (node.type === 'folder' ? 'folder' : 'file');
            
            var iconClass = node.type === 'folder' ? 'fa-folder' : 'fa-file-code';
            if (node.name.endsWith('.html')) iconClass = 'fa-brands fa-html5';
            if (node.name.endsWith('.js')) iconClass = 'fa-brands fa-js';
            if (node.name.endsWith('.css')) iconClass = 'fa-brands fa-css3-alt';
            if (node.name.endsWith('.py')) iconClass = 'fa-brands fa-python';

            itemDiv.innerHTML = `<i class="fa-regular ${iconClass}"></i> <span>${node.name}</span>`;

            itemDiv.addEventListener('click', function(e) {
                e.stopPropagation();
                if (node.type === 'folder') {
                    // Toggle
                    var childrenUl = li.querySelector('ul');
                    if (childrenUl) {
                        var isHidden = childrenUl.style.display === 'none';
                        childrenUl.style.display = isHidden ? 'block' : 'none';
                        // Toggle Folder Icon
                        var icon = itemDiv.querySelector('i');
                        icon.className = isHidden ? 'fa-regular fa-folder-open' : 'fa-regular fa-folder';
                    }
                } else {
                    loadFile(node.path, node.name);
                    // Mobile UX: Close sidebar
                    if (window.innerWidth < 768) sidebarLeft.classList.remove('open');
                }
            });

            li.appendChild(itemDiv);
            if (node.children) {
                renderTree(node.children, li);
                // Default collapse subfolders? No, keep open for now or hidden via CSS
            }
            ul.appendChild(li);
        });

        container.appendChild(ul);
    }

    function loadFile(path, name) {
        fetch('/api/files/read', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({path: path})
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                showToast('Error: ' + data.error);
            } else {
                if (window.editorInstance) {
                    window.editorInstance.setValue(data.content);
                    window.editorInstance.setScrollTop(0);
                    currentFilePath = path;
                    labelFileName.textContent = name;
                    
                    // Attach Autosave listener if not already
                    attachAutosave();
                }
            }
        });
    }

    // ==========================================
    // 6. AUTOSAVE LOGIC
    // ==========================================
    
    function attachAutosave() {
        if (isAutosaveAttached || !window.editorInstance) return;
        
        window.editorInstance.onDidChangeModelContent(() => {
            // User is typing...
            // 1. Clear existing timer
            if (saveTimer) clearTimeout(saveTimer);
            
            // 2. Show "Typing/Saving" status immediately? Or wait?
            // Let's show nothing while typing, but trigger save after pause.
            
            // 3. Set new timer (Debounce 2 seconds)
            saveTimer = setTimeout(performAutosave, 2000);
        });

        isAutosaveAttached = true;
    }

    function performAutosave() {
        if (!currentFilePath) return;

        showToast('<i class="fa-solid fa-floppy-disk"></i> Saving...', true);
        var content = window.editorInstance.getValue();

        fetch('/api/files/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({path: currentFilePath, content: content})
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast('<i class="fa-solid fa-check"></i> All changes saved');
                setTimeout(hideToast, 2000);
            } else {
                showToast('<i class="fa-solid fa-circle-xmark"></i> Save Failed');
            }
        })
        .catch(err => showToast('Network Error'));
    }

    // ==========================================
    // 7. APP EXTENSIONS
    // ==========================================

    function fetchApps() {
        fetch('/api/extensions')
            .then(res => res.json())
            .then(apps => renderApps(apps));
    }

    function renderApps(apps) {
        appGridContainer.innerHTML = '';
        apps.forEach(app => {
            var div = document.createElement('div');
            div.className = 'app-icon';
            
            var imgSrc = (app.icon === 'default') 
                ? 'https://ui-avatars.com/api/?name=' + app.name + '&background=007acc&color=fff' 
                : '/extension/' + app.name + '/' + app.icon;

            div.innerHTML = `
                <img src="${imgSrc}" class="app-icon-img">
                <span class="app-name">${app.name}</span>
            `;

            div.addEventListener('click', () => {
                openApp(app.name);
                sidebarRight.classList.remove('open');
            });
            appGridContainer.appendChild(div);
        });
    }

    function openApp(name) {
        appTitle.textContent = name;
        appFrame.src = '/extension/' + name + '/';
        appOverlay.classList.add('active');
    }

    btnCloseApp.addEventListener('click', () => {
        appOverlay.classList.remove('active');
        appFrame.src = '';
    });

    // ==========================================
    // INIT
    // ==========================================
    fetchFileTree();
});