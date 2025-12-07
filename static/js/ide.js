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
        toast.innerHTML = msg;
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
    
    btnMenu.addEventListener('click', () => {
        sidebarLeft.classList.add('open');
        sidebarRight.classList.remove('open');
    });
    btnCloseLeft.addEventListener('click', () => sidebarLeft.classList.remove('open'));

    btnApps.addEventListener('click', () => {
        sidebarRight.classList.add('open');
        sidebarLeft.classList.remove('open');
        
        var timestamp = new Date().getTime();
        var bgUrl = "/static/images/app_wallpaper.jpg?t=" + timestamp;
        
        var img = new Image();
        img.onload = () => { sidebarRight.style.backgroundImage = "url('" + bgUrl + "')"; };
        img.onerror = () => { sidebarRight.style.backgroundImage = "none"; };
        img.src = bgUrl;

        fetchApps();
    });
    btnCloseRight.addEventListener('click', () => sidebarRight.classList.remove('open'));

    document.getElementById('editor-wrapper').addEventListener('click', () => {
        sidebarLeft.classList.remove('open');
        sidebarRight.classList.remove('open');
    });

    // ==========================================
    // 4. FILE SYSTEM: OPEN FOLDER & UPLOAD
    // ==========================================

    openFolderBtn.addEventListener('click', () => folderInput.click());

    folderInput.addEventListener('change', function(e) {
        var files = e.target.files;
        if (files.length === 0) return;

        showToast('<i class="fa-solid fa-spinner fa-spin"></i> Importing files...', true);

        var uploadPromises = Array.from(files).map(file => {
            var formData = new FormData();
            formData.append('file', file);
            formData.append('path', file.webkitRelativePath);
            return fetch('/api/files/upload', { method: 'POST', body: formData });
        });

        Promise.all(uploadPromises)
            .then(() => {
                showToast('<i class="fa-solid fa-check"></i> Folder Imported');
                openFolderArea.style.display = 'none';
                fetchFileTree();
            })
            .catch(err => {
                showToast('<i class="fa-solid fa-triangle-exclamation"></i> Import Partial/Failed');
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
                    fileTreeContainer.innerHTML = '<div class="empty-workspace">Empty Workspace</div>';
                } else {
                    renderTree(data, fileTreeContainer);
                }
            });
    }

    function renderTree(nodes, container) {
        var ul = document.createElement('ul');
        ul.className = 'tree-level';

        nodes.forEach(node => {
            var li = document.createElement('li');
            var itemDiv = document.createElement('div');
            itemDiv.className = 'tree-item ' + node.type;
            
            var iconClass = {
                '.html': 'fa-brands fa-html5',
                '.js': 'fa-brands fa-js',
                '.css': 'fa-brands fa-css3-alt',
                '.py': 'fa-brands fa-python',
                '.json': 'fa-solid fa-gear',
                'folder': 'fa-folder'
            };
            var ext = Object.keys(iconClass).find(ext => node.name.endsWith(ext)) || 'fa-file-code';
            var icon = node.type === 'folder' ? iconClass.folder : ext;
            
            itemDiv.innerHTML = `<i class="fa-regular ${icon}"></i> <span>${node.name}</span>`;

            itemDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                if (node.type === 'folder') {
                    var childrenUl = li.querySelector('.tree-level');
                    if (childrenUl) {
                        var isHidden = childrenUl.style.display === 'none';
                        childrenUl.style.display = isHidden ? 'block' : 'none';
                        itemDiv.querySelector('i').className = `fa-regular ${isHidden ? 'fa-folder-open' : 'fa-folder'}`;
                    }
                } else {
                    loadFile(node.path, node.name);
                    if (window.innerWidth < 768) sidebarLeft.classList.remove('open');
                }
            });

            li.appendChild(itemDiv);
            if (node.children) {
                renderTree(node.children, li);
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
            } else if (window.editorInstance) {
                window.editorInstance.setValue(data.content);
                window.editorInstance.setScrollTop(0);
                currentFilePath = path;
                labelFileName.textContent = name;
                attachAutosave();
            }
        });
    }

    // ==========================================
    // 6. AUTOSAVE LOGIC
    // ==========================================
    
    function attachAutosave() {
        if (isAutosaveAttached || !window.editorInstance) return;
        
        window.editorInstance.onDidChangeModelContent(() => {
            clearTimeout(saveTimer);
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
                showToast('<i class="fa-solid fa-check"></i> Saved');
            } else {
                showToast('<i class="fa-solid fa-circle-xmark"></i> Save Failed');
            }
        });
    }

    // ==========================================
    // 7. APP EXTENSIONS (BUG FIX)
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
            
            // **BUG FIX**: Construct icon URL reliably using folder_name.
            var imgSrc;
            if (app.icon_filename === 'default') {
                // Use a placeholder generator if no icon is specified
                imgSrc = `https://ui-avatars.com/api/?name=${app.display_name.charAt(0)}&background=007acc&color=fff`;
            } else {
                // Use the asset serving route for ALL icons.
                imgSrc = `/extension/${app.folder_name}/${app.icon_filename}`;
            }

            div.innerHTML = `
                <img src="${imgSrc}" class="app-icon-img" alt="${app.display_name}">
                <span class="app-name">${app.display_name}</span>
            `;

            div.addEventListener('click', () => {
                // **BUG FIX**: Use the exact launch_url provided by the API.
                openApp(app.display_name, app.launch_url);
                sidebarRight.classList.remove('open');
            });
            appGridContainer.appendChild(div);
        });
    }

    function openApp(appName, launchUrl) {
        appTitle.textContent = appName;
        appFrame.src = launchUrl; // Directly use the URL from the backend
        appOverlay.classList.add('active');
    }

    btnCloseApp.addEventListener('click', () => {
        appOverlay.classList.remove('active');
        appFrame.src = 'about:blank'; // Clear source to stop scripts and free memory
    });

    // ==========================================
    // INIT
    // ==========================================
    fetchFileTree();
});