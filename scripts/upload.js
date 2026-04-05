        // Early variable declarations (needed before onTypeChange)
        let uploadedFile = null;
        let uploadedZip = null;
        let availableCoAuthors = [];

        // Check if user is logged in
        if (!TPRSApi.isLoggedIn()) {
            window.location.href = 'login.html';
        }

        // Get current user data and prefill author information
        const currentUser = TPRSApi.getCurrentUser() || JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        if (currentUser.firstName) {
            document.getElementById('authorName').value = `${currentUser.firstName} ${currentUser.lastName}`;
            document.getElementById('authorEmail').value = currentUser.email;
            document.getElementById('authorId').value = currentUser.studentId || '';
            // Department value is set later after options load
        }

        // Load supervisor based on year and semester selection
        async function loadSupervisorByYearSemester() {
            const studentId = currentUser.id;
            if (!studentId) return;
            const year = document.getElementById('year').value;
            const semester = document.getElementById('semester').value;
            if (!year || !semester) {
                document.getElementById('supervisorNameText').textContent = 'Select year & semester to load supervisor';
                document.getElementById('supervisorNameText').style.color = '#999';
                document.getElementById('supervisorId').value = '';
                return;
            }
            document.getElementById('supervisorNameText').textContent = 'Loading supervisor...';
            document.getElementById('supervisorNameText').style.color = '#333';
            try {
                const result = await TPRSApi.getSupervisorsForStudent(studentId, year, semester);
                
                // Clear any existing co-authors when changing supervisor info
                document.getElementById('coAuthorsList').innerHTML = '';
                availableCoAuthors = [];

                if (result.success && result.supervisors && result.supervisors.length > 0) {
                    const supervisor = result.supervisors[0];
                    const name = (supervisor.firstName || '') + ' ' + (supervisor.lastName || '');
                    document.getElementById('supervisorNameText').textContent = name.trim() || 'Assigned Supervisor';
                    document.getElementById('supervisorNameText').style.color = '#333';
                    document.getElementById('supervisorId').value = supervisor.id;

                    // Load available co-authors
                    const assignRes = await TPRSApi.getAssignedStudents(supervisor.id);
                    if (assignRes.success && assignRes.students) {
                        availableCoAuthors = assignRes.students.filter(s => 
                            s.assignedYear === year && 
                            s.assignedSemester === semester && 
                            s.id !== studentId
                        );
                    }
                } else {
                    document.getElementById('supervisorNameText').textContent = 'No supervisor assigned for this year or semester. Contact your department.';
                    document.getElementById('supervisorNameText').style.color = '#e74c3c';
                    document.getElementById('supervisorId').value = '';
                }
            } catch(e) {
                document.getElementById('supervisorNameText').textContent = 'Could not load supervisor info';
                document.getElementById('supervisorNameText').style.color = '#e74c3c';
            }
        }

        // Initial supervisor display
        document.getElementById('supervisorNameText').textContent = 'Select year & semester to load supervisor';
        document.getElementById('supervisorNameText').style.color = '#999';

        // Toggle GitHub link and zip upload based on type
        function onTypeChange() {
            const type = document.getElementById('type').value;
            const isProject = type === 'Project';
            document.getElementById('githubLinkGroup').style.display = isProject ? '' : 'none';
            document.getElementById('zipUploadSection').style.display = isProject ? '' : 'none';
            if (!isProject) {
                document.getElementById('githubLink').value = '';
                // Clear uploaded zip if any
                if (uploadedZip) {
                    uploadedZip = null;
                    document.getElementById('selectedZip').style.display = 'none';
                }
            }
        }
        // Hide on initial load
        onTypeChange();

        // Update semester options based on selected year (Bachelor: 1st-4th year, 2 semesters each)
        function updateSemesterOptions() {
            const year = document.getElementById('year').value;
            const semesterSelect = document.getElementById('semester');
            semesterSelect.innerHTML = '';
            if (!year) {
                semesterSelect.innerHTML = '<option value="">Select Year first</option>';
                return;
            }
            semesterSelect.innerHTML = '<option value="">Select Semester</option>';
            semesterSelect.innerHTML += '<option value="1st">1st Semester</option>';
            semesterSelect.innerHTML += '<option value="2nd">2nd Semester</option>';
        }

        // Keywords functionality
        const keywords = [];
        const keywordsContainer = document.getElementById('keywordsContainer');
        const keywordInput = document.getElementById('keywordInput');
        const fallbackKeywords = [
            'Machine Learning',
            'Deep Learning',
            'Artificial Intelligence',
            'Computer Vision',
            'Natural Language Processing',
            'Blockchain',
            'Internet of Things',
            'Data Science',
            'Cybersecurity',
            'Software Engineering',
            'Cloud Computing',
            'Web Development'
        ];
        let baseKeywords = [];
        let approvedKeywords = [...fallbackKeywords];
        let kwActiveIndex = -1;

        // Load additional keywords from approved projects
        // Load additional keywords from settings and approved projects
        (async function loadAllKeywords() {
            try {
                const settings = await TPRSApi.getSettings();
                if (settings && Array.isArray(settings.keywords) && settings.keywords.length > 0) {
                    baseKeywords = [...settings.keywords];
                } else {
                    baseKeywords = [...fallbackKeywords];
                }
                
                const kwSet = new Set(baseKeywords.map(k => k.toLowerCase()));
                approvedKeywords = [...baseKeywords];
                
                const result = await TPRSApi.getProjects({ status: 'approved' });
                if (result.success && result.projects) {
                    result.projects.forEach(p => {
                        if (p.keywords) {
                            p.keywords.split(",").forEach(k => {
                                const trimmed = k.trim();
                                if (trimmed && !kwSet.has(trimmed.toLowerCase())) {
                                    kwSet.add(trimmed.toLowerCase());
                                    approvedKeywords.push(trimmed);
                                }
                            });
                        }
                    });
                }
                approvedKeywords.sort();
            } catch(e) {
                console.error("Error loading keywords", e);
                approvedKeywords = [...fallbackKeywords].sort();
            }
        })();

        // Create suggestion dropdown
        const kwSuggestBox = document.createElement('div');
        kwSuggestBox.id = 'kwSuggestions';
        kwSuggestBox.className = 'suggestion-box';
        keywordsContainer.style.position = 'relative';
        keywordsContainer.appendChild(kwSuggestBox);

        keywordInput.addEventListener('input', function() {
            const val = this.value.trim().toLowerCase();
            if (!val) { kwSuggestBox.style.display = 'none'; return; }
            const matches = approvedKeywords.filter(k => k.toLowerCase().includes(val) && !keywords.includes(k)).slice(0, 8);
            if (matches.length === 0) { kwSuggestBox.style.display = 'none'; return; }
            kwActiveIndex = 0;
            
            kwSuggestBox.innerHTML = matches.map((m, i) =>
                `<div class="suggestion-item${i === 0 ? ' active' : ''}" onmousedown="selectSuggestedKeyword('${String(m).replace(/'/g, "\\'")}')">${m}</div>`
            ).join('');

            kwSuggestBox.style.display = 'block';
        });

        keywordInput.addEventListener('blur', function() {
            setTimeout(() => { kwSuggestBox.style.display = 'none'; }, 200);
        });

        function updateKwSuggestHighlight(items) {
            items.forEach(el => el.classList.remove("active"));
            if (items[kwActiveIndex]) items[kwActiveIndex].classList.add("active");
        }

        function selectSuggestedKeyword(kw) {
            if (kw && !keywords.includes(kw)) {
                keywords.push(kw);
                renderKeywords();
            }
            keywordInput.value = '';
            kwSuggestBox.style.display = 'none';
        }

        keywordInput.addEventListener('keydown', function(e) {
            const items = kwSuggestBox.querySelectorAll(".suggestion-item");
            if (kwSuggestBox.style.display === "block" && items.length > 0) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (kwActiveIndex < items.length - 1) kwActiveIndex++;
                    updateKwSuggestHighlight(items);
                    return;
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (kwActiveIndex > 0) kwActiveIndex--;
                    updateKwSuggestHighlight(items);
                    return;
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (kwActiveIndex >= 0 && kwActiveIndex < items.length) {
                        const kw = items[kwActiveIndex].innerText;
                        selectSuggestedKeyword(kw);
                    }
                    return;
                }
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const keyword = this.value.trim();
                if (keyword && !keywords.includes(keyword)) {
                    keywords.push(keyword);
                    renderKeywords();
                }
                this.value = '';
                kwSuggestBox.style.display = 'none';
            }
        });

        function renderKeywords() {
            const existingTags = keywordsContainer.querySelectorAll('.keyword-tag');
            existingTags.forEach(tag => tag.remove());

            keywords.forEach((keyword, index) => {
                const tag = document.createElement('span');
                tag.className = 'keyword-tag';
                tag.innerHTML = `
                    ${keyword}
                    <button type="button" class="remove-keyword" onclick="removeKeyword(${index})">×</button>
                `;
                keywordsContainer.insertBefore(tag, keywordInput);
            });
        }

        function removeKeyword(index) {
            keywords.splice(index, 1);
            renderKeywords();
        }

        let coAuthorCount = 0;
        const coAuthorsList = document.getElementById('coAuthorsList');
        const addCoAuthorBtn = document.getElementById('addCoAuthorBtn');

        addCoAuthorBtn.addEventListener('click', function() {
            if (!document.getElementById('supervisorId').value) {
                showError('Please select Year and Semester first to load available co-authors.');
                return;
            }
            if (availableCoAuthors.length === 0) {
                showError('No other students are assigned to your supervisor for this year and semester.');
                return;
            }

            coAuthorCount++;
            const coAuthorItem = document.createElement('div');
            coAuthorItem.className = 'co-author-item';
            coAuthorItem.id = `coAuthor${coAuthorCount}`;
            
            let options = '<option value="">Select a Co-Author</option>';
            availableCoAuthors.forEach(s => {
                const sName = (s.firstName || '') + ' ' + (s.lastName || '');
                options += `<option value="${s.id}" data-name="${sName.trim()}" data-studentid="${s.studentId}">${sName.trim()} (${s.studentId})</option>`;
            });

            coAuthorItem.innerHTML = `
                <div class="form-group" style="grid-column: span 2;">
                    <label>Select Student</label>
                    <select class="co-author-select" style="width: 100%; padding: 0.8rem; border: 1px solid #585876; border-radius: 8px; font-size: 0.95rem; background: rgba(255,255,255,0.05); color: #e2e2ea;" required>
                        ${options}
                    </select>
                </div>
                <button type="button" class="remove-coauthor" onclick="removeCoAuthor(${coAuthorCount})">
                    <span class="material-icons">remove_circle</span>
                </button>
            `;
            coAuthorsList.appendChild(coAuthorItem);
        });

        function removeCoAuthor(id) {
            const coAuthorItem = document.getElementById(`coAuthor${id}`);
            if (coAuthorItem) {
                coAuthorItem.remove();
            }
        }

        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('fileInput');
        const selectedFile = document.getElementById('selectedFile');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const removeFileBtn = document.getElementById('removeFile');

        fileUploadArea.addEventListener('click', () => fileInput.click());

        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            handleFile(file);
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            handleFile(file);
        });

        function handleFile(file) {
            if (!file) return;

            const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!validTypes.includes(file.type)) {
                showError('Please upload a PDF, DOC, or DOCX file');
                return;
            }

            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                showError('File size must be less than 50MB');
                return;
            }

            uploadedFile = file;
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            selectedFile.classList.add('show');
            fileUploadArea.style.display = 'none';
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        removeFileBtn.addEventListener('click', () => {
            uploadedFile = null;
            fileInput.value = '';
            selectedFile.classList.remove('show');
            fileUploadArea.style.display = 'block';
        });

        // Zip file upload functionality
        const zipUploadArea = document.getElementById('zipUploadArea');
        const zipInput = document.getElementById('zipInput');
        const selectedZip = document.getElementById('selectedZip');
        const zipName = document.getElementById('zipName');
        const zipSize = document.getElementById('zipSize');
        const removeZipBtn = document.getElementById('removeZip');

        zipUploadArea.addEventListener('click', () => zipInput.click());

        zipUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            zipUploadArea.classList.add('dragover');
        });

        zipUploadArea.addEventListener('dragleave', () => {
            zipUploadArea.classList.remove('dragover');
        });

        zipUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            zipUploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            handleZipFile(file);
        });

        zipInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            handleZipFile(file);
        });

        function handleZipFile(file) {
            if (!file) return;

            if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed' && !file.name.endsWith('.zip')) {
                showError('Please upload a ZIP file');
                return;
            }

            const maxSize = 200 * 1024 * 1024; // 200MB
            if (file.size > maxSize) {
                showError('Zip file size must be less than 200MB');
                return;
            }

            uploadedZip = file;
            zipName.textContent = file.name;
            zipSize.textContent = formatFileSize(file.size);
            selectedZip.classList.add('show');
            zipUploadArea.style.display = 'none';
        }

        removeZipBtn.addEventListener('click', () => {
            uploadedZip = null;
            zipInput.value = '';
            selectedZip.classList.remove('show');
            zipUploadArea.style.display = 'block';
        });

        // Message functions
        function showError(message) {
            const errorMessage = document.getElementById('errorMessage');
            const errorText = document.getElementById('errorText');
            const successMessage = document.getElementById('successMessage');

            successMessage.classList.remove('show');
            errorText.textContent = message;
            errorMessage.classList.add('show');

            // Scroll to top to show error
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function showSuccess(message) {
            const successMessage = document.getElementById('successMessage');
            const successText = document.getElementById('successText');
            const errorMessage = document.getElementById('errorMessage');

            errorMessage.classList.remove('show');
            successText.textContent = message;
            successMessage.classList.add('show');

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Prevent Enter key from submitting the form
        document.getElementById('uploadForm').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        });

        // Form submission
        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            // Validation
            if (keywords.length < 1) {
                showError('Please add at least 1 keyword');
                return;
            }

            if (!uploadedFile) {
                showError('Please upload a document file');
                return;
            }

            // Validate GitHub link or zip file (required only for Project type)
            const githubLink = document.getElementById('githubLink').value.trim();
            const selectedType = document.getElementById('type').value;
            if (selectedType === 'Project' && !githubLink && !uploadedZip) {
                showError('Please provide either a GitHub repository link or upload a project zip file (or both)');
                return;
            }

            if (githubLink && !githubLink.startsWith('www.')) {
                showError('GitHub link must start with www. (e.g. www.github.com/username/repo)');
                return;
            }

            const abstract = document.getElementById('abstract').value;
            if (abstract.split(/\s+/).length < 50) {
                showError('Abstract must be at least 50 words');
                return;
            }

            // Get co-authors
            const coAuthors = [];
            document.querySelectorAll('.co-author-item').forEach(item => {
                const select = item.querySelector('.co-author-select');
                if (select && select.value) {
                    const opt = select.options[select.selectedIndex];
                    const name = opt.getAttribute('data-name');
                    const id = opt.getAttribute('data-studentid');
                    coAuthors.push({ name, id });
                }
            });

            // Prepare project data for API
            const projectData = {
                title: document.getElementById('title').value,
                type: document.getElementById('type').value,
                department: document.getElementById('department').value,
                year: document.getElementById('year').value,
                semester: document.getElementById('semester').value,
                session: currentUser.session || '',
                description: abstract,
                authorName: document.getElementById('authorName').value,
                authorId: document.getElementById('authorId').value,
                authorEmail: document.getElementById('authorEmail').value,
                supervisorId: document.getElementById('supervisorId').value,
                keywords: keywords.join(', '),
                coAuthors: JSON.stringify(coAuthors),
                studentId: currentUser.id || currentUser.studentId,
                fileName: uploadedFile.name,
                fileSize: uploadedFile.size
            };

            // Add GitHub link if provided
            if (githubLink) {
                projectData.githubLink = githubLink;
            }

            // Validate supervisor is assigned
            if (!projectData.supervisorId) {
                showError('No supervisor has been assigned to you yet. Please contact your department.');
                return;
            }

            // Show upload progress
            const submitBtn = document.getElementById('submitBtn');
            const uploadProgress = document.getElementById('uploadProgress');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');

            submitBtn.disabled = true;
            uploadProgress.classList.add('show');

            try {
                // Try to submit to backend API with file
                let progress = 0;
                const progressInterval = setInterval(() => {
                    if (progress < 90) {
                        progress += Math.random() * 10;
                        progressFill.style.width = progress + '%';
                        progressText.textContent = `Uploading... ${Math.round(progress)}%`;
                    }
                }, 200);

                const result = await TPRSApi.submitProject(projectData, uploadedFile, uploadedZip);
                
                clearInterval(progressInterval);
                progressFill.style.width = '100%';
                progressText.textContent = 'Upload complete!';

                if (result.success) {
                    showSuccess('Your project has been submitted successfully! It will be reviewed by your supervisor.');
                    
                    // Clear draft
                    localStorage.removeItem('thesisDraft');
                    
                    setTimeout(() => {
                        window.location.href = 'home.html';
                    }, 2000);
                } else {
                    showError(result.message || 'Failed to submit thesis. Please try again.');
                    submitBtn.disabled = false;
                    uploadProgress.classList.remove('show');
                }
            } catch (error) {
                console.log('API not available, using local storage fallback');
                
                // Fallback to localStorage
                let progress = 0;
                const interval = setInterval(() => {
                    progress += Math.random() * 15;
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(interval);

                        // Save to localStorage
                        const formData = {
                            ...projectData,
                            id: Date.now(),
                            submittedAt: new Date().toISOString(),
                            status: 'pending'
                        };
                        
                        const submissions = JSON.parse(localStorage.getItem('thesisSubmissions') || '[]');
                        submissions.push(formData);
                        localStorage.setItem('thesisSubmissions', JSON.stringify(submissions));

                        progressText.textContent = 'Upload complete!';
                        showSuccess('Your project has been submitted successfully! It will be reviewed by your supervisor.');

                        // Clear draft
                        localStorage.removeItem('thesisDraft');

                        setTimeout(() => {
                            window.location.href = 'home.html';
                        }, 2000);
                    }
                    progressFill.style.width = progress + '%';
                    progressText.textContent = `Uploading... ${Math.round(progress)}%`;
                }, 200);
            }
        });

        // Save draft functionality
        document.getElementById('saveDraftBtn').addEventListener('click', function() {
            const draftData = {
                title: document.getElementById('title').value,
                type: document.getElementById('type').value,
                department: document.getElementById('department').value,
                year: document.getElementById('year').value,
                semester: document.getElementById('semester').value,
                githubLink: document.getElementById('githubLink').value,
                abstract: document.getElementById('abstract').value,
                authorName: document.getElementById('authorName').value,
                authorId: document.getElementById('authorId').value,
                authorEmail: document.getElementById('authorEmail').value,
                keywords: keywords,
                savedAt: new Date().toISOString()
            };

            localStorage.setItem('thesisDraft', JSON.stringify(draftData));
            showSuccess('Draft saved successfully!');
        });

        // Load draft and settings on page load
        async function initializeUploadPage() {
            try {
                const settings = await TPRSApi.getSettings();
                const deptSelect = document.getElementById('department');
                if (settings.departments) {
                    settings.departments.forEach(dept => {
                        const opt = document.createElement('option');
                        opt.value = dept.id;
                        opt.textContent = dept.name;
                        deptSelect.appendChild(opt);
                    });
                }
                
                // Pre-select user's department if available
                if (currentUser && currentUser.department) {
                    deptSelect.value = currentUser.department;
                }
                if (settings.specializations) {
                    baseKeywords = settings.specializations;
                }
            } catch(e) {
                console.error("Failed to load generic settings", e);
            }

            const draft = JSON.parse(localStorage.getItem('thesisDraft') || 'null');
            if (draft) {
                if (confirm('You have a saved draft. Would you like to load it?')) {
                    document.getElementById('title').value = draft.title || '';
                    document.getElementById('type').value = draft.type || '';
                    document.getElementById('department').value = draft.department || '';
                    
                    if (draft.year) {
                        document.getElementById('year').value = draft.year;
                        updateSemesterOptions(); // Update semester options before setting its value
                    }
                    if (draft.semester) {
                        document.getElementById('semester').value = draft.semester;
                        loadSupervisorByYearSemester(); // Refresh supervisor logic
                    }
                    
                    document.getElementById('abstract').value = draft.abstract || '';
                    document.getElementById('authorName').value = draft.authorName || '';
                    document.getElementById('authorId').value = draft.authorId || '';
                    document.getElementById('authorEmail').value = draft.authorEmail || '';

                    if (draft.type === 'Project' && draft.githubLink) {
                        document.getElementById('githubLink').value = draft.githubLink;
                        onTypeChange();
                    }

                    if (draft.keywords && draft.keywords.length > 0) {
                        draft.keywords.forEach(kw => {
                            if (!keywords.includes(kw)) {
                                keywords.push(kw);
                            }
                        });
                        renderKeywords();
                    }
                }
            }
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeUploadPage);
        } else {
            initializeUploadPage();
        }
