// --- Extracted from /html/admin-dashboard.html ---
// ===== Auth Check =====
        (function() {
            if (!TPRSApi.isLoggedIn() || TPRSApi.getUserType() !== 'admin') {
                window.location.href = '/html/login.html';
            }
        })();

        // ===== Tab Switching =====
        function switchTab(tab) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById('section-' + tab).classList.add('active');

            if (tab === 'overview') loadOverview();
            else if (tab === 'supervisors') loadTeachers();
            else if (tab === 'students') loadStudents();
            else if (tab === 'projects') loadProjects();
            else if (tab === 'assignments') loadAllAssignments();
            else if (tab === 'settings') loadSystemSettings();
        }

        // ===== Toast =====
        function showToast(msg, type) {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.className = 'toast toast-' + (type || 'success') + ' show';
            setTimeout(() => t.classList.remove('show'), 3000);
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        // ===== Escape HTML =====
        function esc(str) {
            if (!str) return '';
            const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
        }

        // ===== Delete Confirmation Modal =====
        let pendingDeleteAction = null;

        function showDeleteConfirm(title, message, action) {
            document.getElementById('deleteConfirmTitle').textContent = title;
            document.getElementById('deleteConfirmMessage').textContent = message;
            pendingDeleteAction = action;
            document.getElementById('deleteConfirmModal').classList.add('active');
        }

        function closeDeleteConfirm() {
            document.getElementById('deleteConfirmModal').classList.remove('active');
            pendingDeleteAction = null;
        }

        document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
            if (!pendingDeleteAction) return;
            const action = pendingDeleteAction;
            closeDeleteConfirm();
            await action();
        });

        document.getElementById('deleteConfirmModal').addEventListener('click', function(e) {
            if (e.target === this) closeDeleteConfirm();
        });

        // ===== Overview =====
        let cachedAllStudents = [];
        let cachedAllTeachers = [];
        let cachedAllAssignments = [];

        async function loadOverview() {
            const [statsRes, tRes, sRes, assignRes] = await Promise.all([
                TPRSApi.adminGetStats(),
                TPRSApi.adminGetTeachers(),
                TPRSApi.adminGetStudents(),
                TPRSApi.adminGetAllAssignments()
            ]);

            if (statsRes.success) {
                const s = statsRes.stats;
                document.getElementById('statsRow').innerHTML = `
                    <div class="stat-card">
                        <div class="stat-icon blue"><span class="material-icons">school</span></div>
                        <div><div class="stat-val">${s.totalStudents}</div><div class="stat-label">Total Students</div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon green"><span class="material-icons">supervisor_account</span></div>
                        <div><div class="stat-val">${s.totalTeachers}</div><div class="stat-label">Total Supervisors</div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon purple"><span class="material-icons">description</span></div>
                        <div><div class="stat-val">${s.totalProjects}</div><div class="stat-label">Total Projects</div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon orange"><span class="material-icons">hourglass_top</span></div>
                        <div><div class="stat-val">${s.pendingTeachers}</div><div class="stat-label">Pending Authorizations</div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon teal"><span class="material-icons">check_circle</span></div>
                        <div><div class="stat-val">${s.approvedProjects}</div><div class="stat-label">Approved Projects</div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon red"><span class="material-icons">pending</span></div>
                        <div><div class="stat-val">${s.pendingProjects}</div><div class="stat-label">Pending Projects</div></div>
                    </div>
                `;
            }

            // Populate supervisor dropdown for assignment
            if (tRes.success) {
                cachedAllTeachers = tRes.teachers;
                populateAssignSupervisors(cachedAllTeachers);
                // Pending teachers
                const pending = tRes.teachers.filter(t => !t.isAuthorized && !t.authorized);
                if (pending.length === 0) {
                    document.getElementById('pendingTeachersTable').innerHTML = '<div class="empty-state"><span class="material-icons">verified</span><p>All supervisors are authorized</p></div>';
                } else {
                    renderPendingTeachers(pending);
                }
            }

            // Cache students for assignment
            if (sRes.success) {
                cachedAllStudents = sRes.students;
            }

            if (assignRes && assignRes.success) {
                cachedAllAssignments = assignRes.assignments;
            }

            // Call this at the end to render the students with possibly greyed out options
            filterAssignStudents();
        }

        function populateAssignSupervisors(list) {
            const sel = document.getElementById('assignSupSelect');
            const curVal = sel.value;
            sel.innerHTML = '<option value="">-- Choose a Supervisor --</option>';
            for (const t of list) {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.firstName + ' ' + t.lastName + ' (' + (t.department || '') + ')';
                sel.appendChild(opt);
            }
            if (curVal) sel.value = curVal;
        }

        function filterAssignStudents() {
            const q = document.getElementById('assignStuSearch').value.trim().toLowerCase();
            const session = document.getElementById('assignSessionFilter').value;
            const year = document.getElementById('assignYear').value;
            const semester = document.getElementById('assignSemester').value;

            let list = cachedAllStudents;
            if (session) list = list.filter(s => s.session === session);
            if (q) list = list.filter(s =>
                (s.studentId || '').toLowerCase().includes(q) ||
                (s.firstName + ' ' + s.lastName).toLowerCase().includes(q)
            );
            const container = document.getElementById('assignStudentList');
            if (list.length === 0) {
                container.innerHTML = '<div class="empty-state" style="padding:1rem;"><span class="material-icons" style="font-size:1.5rem;">search_off</span><p style="font-size:0.8rem;">No students found</p></div>';
                return;
            }

            const assignedStuIds = new Set();
            if (year && semester) {
                for (const a of cachedAllAssignments) {
                    if (a.assignedYear === year && a.assignedSemester === semester) {
                        assignedStuIds.add(parseInt(a.studentId));
                    }
                }
            }

            let html = '';
            for (const s of list) {
                const isAssigned = assignedStuIds.has(parseInt(s.id));
                const disabledAttr = isAssigned ? 'disabled' : '';
                const itemClass = isAssigned ? 'student-check-item assigned' : 'student-check-item';
                const badge = isAssigned ? '<span class="badge badge-assigned">Assigned</span>' : '';

                html += `<label class="${itemClass}">
                    <input type="checkbox" value="${s.id}" class="assign-stu-cb" ${disabledAttr}>
                    <span>${esc(s.firstName + ' ' + s.lastName)}</span>
                    <span class="stu-id">${esc(s.studentId || '')}${s.session ? ' &middot; ' + esc(s.session) : ''}</span>
                    ${badge}
                </label>`;
            }
            container.innerHTML = html;
        }

        async function doAssignStudents() {
            const supervisorId = parseInt(document.getElementById('assignSupSelect').value);
            if (!supervisorId) { showToast('Select a supervisor first', 'error'); return; }
            const year = document.getElementById('assignYear').value || null;
            const semester = document.getElementById('assignSemester').value || null;
            const checked = document.querySelectorAll('.assign-stu-cb:checked');
            if (checked.length === 0) { showToast('Select at least one student', 'error'); return; }

            let successCount = 0, failCount = 0;
            for (const cb of checked) {
                const stuId = parseInt(cb.value);
                const res = await TPRSApi.adminAssignStudent(supervisorId, stuId, year, semester);
                if (res.success) {
                    successCount++;
                    cachedAllAssignments.push({
                        assignedYear: year,
                        assignedSemester: semester,
                        studentId: stuId,
                        teacherId: supervisorId
                    });
                } else {
                    failCount++;
                }
            }
            if (successCount > 0) showToast(successCount + ' student(s) assigned successfully', 'success');
            if (failCount > 0) showToast(failCount + ' assignment(s) failed (may already exist)', 'error');
            
            filterAssignStudents();
        }

        function renderPendingTeachers(list) {
            let html = `<table class="data-table"><thead><tr>
                <th>Name</th><th>Email</th><th>Department</th><th>Action</th>
            </tr></thead><tbody>`;
            for (const t of list) {
                html += `<tr>
                    <td>${esc(t.firstName + ' ' + t.lastName)}</td>
                    <td>${esc(t.email)}</td>
                    <td>${esc(t.department)}</td>
                    <td><button class="btn-sm btn-authorize" onclick="authorizeTeacher(${t.id})"><span class="material-icons" style="font-size:0.9rem;">check</span> Authorize</button></td>
                </tr>`;
            }
            html += '</tbody></table>';
            document.getElementById('pendingTeachersTable').innerHTML = html;
        }

        async function authorizeTeacher(id) {
            const res = await TPRSApi.adminAuthorizeTeacher(id);
            showToast(res.message, res.success ? 'success' : 'error');
            loadOverview();
        }

        async function deauthorizeTeacher(id) {
            const res = await TPRSApi.adminDeauthorizeTeacher(id);
            showToast(res.message, res.success ? 'success' : 'error');
            loadTeachers();
        }

        // ===== Teachers =====
        let teacherSearchTimer;
        function debounceTeacherSearch() {
            clearTimeout(teacherSearchTimer);
            teacherSearchTimer = setTimeout(() => loadTeachers(document.getElementById('teacherSearch').value.trim()), 300);
        }

        async function loadTeachers(search) {
            const res = await TPRSApi.adminGetTeachers(search || '');
            if (!res.success) { document.getElementById('teachersTable').innerHTML = '<div class="empty-state">Failed to load.</div>'; return; }
            const list = res.teachers;
            if (list.length === 0) { document.getElementById('teachersTable').innerHTML = '<div class="empty-state"><span class="material-icons">person_off</span><p>No supervisors found</p></div>'; return; }
            let html = `<table class="data-table"><thead><tr>
                <th>Name</th><th>Email</th><th>Department</th><th>Designation</th><th>Status</th><th>Actions</th>
            </tr></thead><tbody>`;
            for (const t of list) {
                const isAuth = t.isAuthorized || t.authorized;
                const safeName = esc(t.firstName + ' ' + t.lastName);
                html += `<tr>
                    <td>${safeName}</td>
                    <td>${esc(t.email)}</td>
                    <td>${esc(t.department)}</td>
                    <td>${esc(t.designation || '—')}</td>
                    <td>${isAuth ? '<span class="badge badge-authorized">Authorized</span>' : '<span class="badge badge-pending">Pending</span>'}</td>
                    <td style="white-space:nowrap;">
                        <button class="btn-sm btn-edit" onclick="openEditTeacher(${t.id})"><span class="material-icons" style="font-size:0.9rem;">edit</span> Edit</button>
                        ${isAuth
                            ? `<button class="btn-sm btn-revoke" onclick="deauthorizeTeacher(${t.id})"><span class="material-icons" style="font-size:0.9rem;">block</span> Revoke</button>`
                            : `<button class="btn-sm btn-authorize" onclick="authorizeTeacher(${t.id})"><span class="material-icons" style="font-size:0.9rem;">check</span> Authorize</button>`
                        }
                        <button class="btn-sm btn-delete" onclick="deleteTeacher(${t.id}, '${safeName.replace(/'/g, "\\'")}')"><span class="material-icons" style="font-size:0.9rem;">delete</span> Delete</button>
                    </td>
                </tr>`;
            }
            html += '</tbody></table>';
            document.getElementById('teachersTable').innerHTML = html;
        }

        let allTeachers = [];
        let allStudents = [];

        async function openEditTeacher(id) {
            const res = await TPRSApi.adminGetTeachers();
            if (!res.success) return;
            allTeachers = res.teachers;
            const t = allTeachers.find(x => x.id === id);
            if (!t) return;
            document.getElementById('et_id').value = t.id;
            document.getElementById('et_email').value = t.email || '';
            document.getElementById('et_teacherId').value = t.teacherId || '';
            document.getElementById('et_firstName').value = t.firstName || '';
            document.getElementById('et_lastName').value = t.lastName || '';
            document.getElementById('et_department').value = t.department || '';
            document.getElementById('et_designation').value = t.designation || '';
            document.getElementById('et_specialization').value = t.specialization || '';
            document.getElementById('et_phone').value = t.phone || '';
            document.getElementById('editTeacherModal').classList.add('active');
        }

        async function saveTeacher() {
            const id = document.getElementById('et_id').value;
            const data = {
                teacherId: document.getElementById('et_teacherId').value.trim(),
                firstName: document.getElementById('et_firstName').value.trim(),
                lastName: document.getElementById('et_lastName').value.trim(),
                department: document.getElementById('et_department').value.trim(),
                designation: document.getElementById('et_designation').value.trim(),
                specialization: document.getElementById('et_specialization').value.trim(),
                phone: document.getElementById('et_phone').value.trim()
            };
            const res = await TPRSApi.adminUpdateTeacher(id, data);
            showToast(res.message, res.success ? 'success' : 'error');
            if (res.success) {
                closeModal('editTeacherModal');
                loadTeachers(document.getElementById('teacherSearch').value.trim());
            }
        }

        // ===== Students =====
        let studentSearchTimer;
        function debounceStudentSearch() {
            clearTimeout(studentSearchTimer);
            studentSearchTimer = setTimeout(() => loadStudents(document.getElementById('studentSearch').value.trim()), 300);
        }

        async function loadStudents(search) {
            const res = await TPRSApi.adminGetStudents(search || '');
            if (!res.success) { document.getElementById('studentsTable').innerHTML = '<div class="empty-state">Failed to load.</div>'; return; }
            const list = res.students;
            if (list.length === 0) { document.getElementById('studentsTable').innerHTML = '<div class="empty-state"><span class="material-icons">person_off</span><p>No students found</p></div>'; return; }
            let html = `<table class="data-table"><thead><tr>
                <th>Student ID</th><th>Name</th><th>Email</th><th>Department</th><th>Degree</th><th>Session</th><th>Actions</th>
            </tr></thead><tbody>`;
            for (const s of list) {
                const safeName = esc(s.firstName + ' ' + s.lastName);
                const degreeName = await TPRSApi.getDegreeName(s.semester);
                html += `<tr>
                    <td>${esc(s.studentId)}</td>
                    <td>${safeName}</td>
                    <td>${esc(s.email)}</td>
                    <td>${esc(s.department)}</td>
                    <td>${esc(degreeName || '—')}</td>
                    <td>${esc(s.session || '—')}</td>
                    <td style="white-space:nowrap;">
                        <button class="btn-sm btn-edit" onclick="openEditStudent(${s.id})"><span class="material-icons" style="font-size:0.9rem;">edit</span> Edit</button>
                        <button class="btn-sm btn-delete" onclick="deleteStudent(${s.id}, '${safeName.replace(/'/g, "\\'")}')"><span class="material-icons" style="font-size:0.9rem;">delete</span> Delete</button>
                    </td>
                </tr>`;
            }
            html += '</tbody></table>';
            document.getElementById('studentsTable').innerHTML = html;
        }

        async function openEditStudent(id) {
            const res = await TPRSApi.adminGetStudents();
            if (!res.success) return;
            
            // Populate Degree Select Options
            const settings = await TPRSApi.getSettings();
            const esSem = document.getElementById('es_semester');
            if (esSem.options.length <= 1) { // if not populated yet
                settings.degreeTypes.forEach(deg => {
                    const opt = document.createElement('option');
                    opt.value = deg.id; opt.textContent = deg.name;
                    esSem.appendChild(opt);
                });
            }

            allStudents = res.students;
            const s = allStudents.find(x => x.id === id);
            if (!s) return;
            document.getElementById('es_id').value = s.id;
            document.getElementById('es_email').value = s.email || '';
            document.getElementById('es_studentId').value = s.studentId || '';
            document.getElementById('es_firstName').value = s.firstName || '';
            document.getElementById('es_lastName').value = s.lastName || '';
            document.getElementById('es_department').value = s.department || '';
            document.getElementById('es_semester').value = s.semester || '';
            document.getElementById('es_session').value = s.session || '';
            document.getElementById('es_phone').value = s.phone || '';
            document.getElementById('editStudentModal').classList.add('active');
        }

        async function saveStudent() {
            const id = document.getElementById('es_id').value;
            const data = {
                studentId: document.getElementById('es_studentId').value.trim().toUpperCase(),
                firstName: document.getElementById('es_firstName').value.trim(),
                lastName: document.getElementById('es_lastName').value.trim(),
                department: document.getElementById('es_department').value.trim(),
                semester: document.getElementById('es_semester').value.trim(),
                session: document.getElementById('es_session').value.trim(),
                phone: document.getElementById('es_phone').value.trim()
            };
            const res = await TPRSApi.adminUpdateStudent(id, data);
            showToast(res.message, res.success ? 'success' : 'error');
            if (res.success) {
                closeModal('editStudentModal');
                loadStudents(document.getElementById('studentSearch').value.trim());
            }
        }

        // ===== Projects =====
        let projectSearchTimer;
        function debounceProjectSearch() {
            clearTimeout(projectSearchTimer);
            projectSearchTimer = setTimeout(() => loadProjects(document.getElementById('projectSearch').value.trim()), 300);
        }

        async function loadProjects(search) {
            const res = await TPRSApi.adminGetProjects(search || '');
            if (!res.success) { document.getElementById('projectsTable').innerHTML = '<div class="empty-state">Failed to load.</div>'; return; }
            const list = res.projects;
            if (list.length === 0) { document.getElementById('projectsTable').innerHTML = '<div class="empty-state"><span class="material-icons">folder_open</span><p>No projects found</p></div>'; return; }
            let html = `<table class="data-table"><thead><tr>
                <th>Title</th><th>Type</th><th>Student</th><th>Supervisor</th><th>Department</th><th>Status</th><th>Views</th><th>Action</th>
            </tr></thead><tbody>`;
            for (const p of list) {
                const statusCls = p.status === 'approved' ? 'badge-approved' : (p.status === 'rejected' ? 'badge-rejected' : 'badge-status-pending');
                const safeTitle = esc(p.title);
                html += `<tr>
                    <td style="max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${safeTitle}">${safeTitle}</td>
                    <td>${esc(p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : '—')}</td>
                    <td>${esc(p.studentName || '—')}</td>
                    <td>${esc(p.supervisorName || '—')}</td>
                    <td>${esc(p.department || '—')}</td>
                    <td><span class="badge ${statusCls}">${esc(p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : '—')}</span></td>
                    <td>${p.views || 0}</td>
                    <td style="white-space:nowrap;">
                        <button class="btn-sm btn-edit" onclick='openProjectDetail(${JSON.stringify(p).replace(/'/g, "&#39;")})'><span class="material-icons" style="font-size:0.9rem;">visibility</span> View</button>
                        <button class="btn-sm btn-delete" onclick="deleteProject(${p.id}, '${safeTitle.replace(/'/g, "\\'")}')"><span class="material-icons" style="font-size:0.9rem;">delete</span> Delete</button>
                    </td>
                </tr>`;
            }
            html += '</tbody></table>';
            document.getElementById('projectsTable').innerHTML = html;
        }

        function openProjectDetail(p) {
            document.getElementById('pd_title').textContent = p.title || 'Untitled';
            const type = p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : '—';
            const yearSem = ((p.year || '') + (p.year && p.semester ? ' Year, ' : '') + (p.semester || '') + (p.semester ? ' Semester' : '')) || '—';
            let html = `
                <div style="margin-bottom:0.5rem;"><strong>Description:</strong></div>
                <p style="color:#555;font-size:0.88rem;line-height:1.6;margin-bottom:1rem;">${esc(p.description || 'No description')}</p>
                <table style="width:100%;font-size:0.88rem;border-collapse:collapse;">
                    <tr><td style="padding:0.4rem 0;color:#888;width:130px;">Type</td><td style="padding:0.4rem 0;">${esc(type)}</td></tr>
                    <tr><td style="padding:0.4rem 0;color:#888;">Student</td><td style="padding:0.4rem 0;">${esc(p.studentName || '—')}</td></tr>
                    <tr><td style="padding:0.4rem 0;color:#888;">Supervisor</td><td style="padding:0.4rem 0;">${esc(p.supervisorName || '—')}</td></tr>
                    <tr><td style="padding:0.4rem 0;color:#888;">Department</td><td style="padding:0.4rem 0;">${esc(p.department || '—')}</td></tr>
                    <tr><td style="padding:0.4rem 0;color:#888;">Year / Semester</td><td style="padding:0.4rem 0;">${esc(yearSem)}</td></tr>
                    <tr><td style="padding:0.4rem 0;color:#888;">Session</td><td style="padding:0.4rem 0;">${esc(p.session || '—')}</td></tr>
                    <tr><td style="padding:0.4rem 0;color:#888;">Keywords</td><td style="padding:0.4rem 0;">${esc(p.keywords || '—')}</td></tr>
                    <tr><td style="padding:0.4rem 0;color:#888;">Status</td><td style="padding:0.4rem 0;">${esc(p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : '—')}</td></tr>
                    <tr><td style="padding:0.4rem 0;color:#888;">Views</td><td style="padding:0.4rem 0;">${p.views || 0}</td></tr>
                `;
            if (p.fileName) {
                html += `<tr><td style="padding:0.4rem 0;color:#888;">Document</td><td style="padding:0.4rem 0;"><a href="javascript:void(0)" onclick="TPRSApi.downloadProjectFile(${p.id})" style="color:#667eea;text-decoration:none;">${esc(p.fileName)}</a></td></tr>`;
            }
            if (p.zipFileName) {
                html += `<tr><td style="padding:0.4rem 0;color:#888;">Zip File</td><td style="padding:0.4rem 0;"><a href="javascript:void(0)" onclick="TPRSApi.downloadProjectZip(${p.id})" style="color:#667eea;text-decoration:none;">${esc(p.zipFileName)}</a></td></tr>`;
            }
            if (p.githubLink) {
                const ghUrl = p.githubLink.startsWith('http') ? p.githubLink : 'https://' + p.githubLink;
                html += `<tr><td style="padding:0.4rem 0;color:#888;">GitHub</td><td style="padding:0.4rem 0;"><a href="${esc(ghUrl)}" target="_blank" rel="noopener noreferrer" style="color:#7b1fa2;text-decoration:none;">${esc(p.githubLink)}</a></td></tr>`;
            }
            html += '</table>';
            document.getElementById('pd_body').innerHTML = html;
            document.getElementById('projectDetailModal').classList.add('active');
        }

        // Close modal on backdrop click
        document.querySelectorAll('.modal-overlay').forEach(m => {
            m.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('active'); });
        });

        function doLogout() {
            TPRSApi.logout();
            window.location.href = '/html/login.html';
        }

        // ===== Delete Functions (custom confirm) =====
        function deleteStudent(id, name) {
            showDeleteConfirm('Delete Student', 'Are you sure you want to delete student "' + name + '"? This action cannot be undone.', async () => {
                const res = await TPRSApi.adminDeleteStudent(id);
                showToast(res.message, res.success ? 'success' : 'error');
                if (res.success) loadStudents(document.getElementById('studentSearch').value.trim());
            });
        }

        function deleteTeacher(id, name) {
            showDeleteConfirm('Delete Supervisor', 'Are you sure you want to delete supervisor "' + name + '"? This action cannot be undone.', async () => {
                const res = await TPRSApi.adminDeleteTeacher(id);
                showToast(res.message, res.success ? 'success' : 'error');
                if (res.success) loadTeachers(document.getElementById('teacherSearch').value.trim());
            });
        }

        function deleteProject(id, title) {
            showDeleteConfirm('Delete Project', 'Are you sure you want to delete project "' + title + '"? This action cannot be undone.', async () => {
                const res = await TPRSApi.adminDeleteProject(id);
                showToast(res.message, res.success ? 'success' : 'error');
                if (res.success) loadProjects(document.getElementById('projectSearch').value.trim());
            });
        }

        // ===== Assignments Management =====
        let cachedAssignments = [];
        let assignmentSearchTimer;

        function debounceAssignmentSearch() {
            clearTimeout(assignmentSearchTimer);
            assignmentSearchTimer = setTimeout(() => renderAssignmentsTable(), 300);
        }

        async function loadAllAssignments() {
            const res = await TPRSApi.adminGetAllAssignments();
            if (!res.success) {
                document.getElementById('assignmentsTable').innerHTML = '<div class="empty-state">Failed to load assignments.</div>';
                return;
            }
            cachedAssignments = res.assignments || [];
            renderAssignmentsTable();
        }

        function renderAssignmentsTable() {
            const q = (document.getElementById('assignmentSearch').value || '').trim().toLowerCase();
            let list = cachedAssignments;
            if (q) {
                list = list.filter(a =>
                    (a.studentName || '').toLowerCase().includes(q) ||
                    (a.studentCode || '').toLowerCase().includes(q) ||
                    (a.supervisorName || '').toLowerCase().includes(q)
                );
            }
            if (list.length === 0) {
                document.getElementById('assignmentsTable').innerHTML = '<div class="empty-state"><span class="material-icons">assignment_late</span><p>No assignments found</p></div>';
                return;
            }
            let html = `<table class="data-table"><thead><tr>
                <th>Student ID</th><th>Student Name</th><th>Supervisor</th><th>Department</th><th>Year</th><th>Semester</th><th>Session</th><th>Actions</th>
            </tr></thead><tbody>`;
            for (const a of list) {
                const safeStuName = esc(a.studentName || '');
                const safeSupName = esc(a.supervisorName || '');
                html += `<tr>
                    <td>${esc(a.studentCode || '—')}</td>
                    <td>${safeStuName}</td>
                    <td>${safeSupName}</td>
                    <td>${esc(a.studentDepartment || '—')}</td>
                    <td>${esc(a.assignedYear || '—')}</td>
                    <td>${esc(a.assignedSemester || '—')}</td>
                    <td>${esc(a.studentSession || '—')}</td>
                    <td style="white-space:nowrap;">
                        <button class="btn-sm btn-edit" onclick="openReassign(${a.assignmentId}, ${a.studentId}, '${safeStuName.replace(/'/g, "\\'")}', ${a.supervisorId}, '${safeSupName.replace(/'/g, "\\'")}', '${esc(a.assignedYear || '')}', '${esc(a.assignedSemester || '')}')"><span class="material-icons" style="font-size:0.9rem;">swap_horiz</span> Reassign</button>
                        <button class="btn-sm btn-delete" onclick="deleteAssignment(${a.assignmentId}, '${safeStuName.replace(/'/g, "\\'")}', '${safeSupName.replace(/'/g, "\\'")}')"><span class="material-icons" style="font-size:0.9rem;">delete</span> Remove</button>
                    </td>
                </tr>`;
            }
            html += '</tbody></table>';
            document.getElementById('assignmentsTable').innerHTML = html;
        }

        async function openReassign(assignmentId, studentId, studentName, oldSupervisorId, currentSupervisor, year, semester) {
            document.getElementById('ra_assignmentId').value = assignmentId;
            document.getElementById('ra_studentId').value = studentId;
            document.getElementById('ra_oldSupervisorId').value = oldSupervisorId;
            document.getElementById('ra_studentName').value = studentName;
            document.getElementById('ra_currentSupervisor').value = currentSupervisor;
            document.getElementById('ra_year').value = year || '';
            document.getElementById('ra_semester').value = semester || '';

            // Populate supervisor dropdown
            let teachers = cachedAllTeachers;
            if (!teachers || teachers.length === 0) {
                const tRes = await TPRSApi.adminGetTeachers();
                if (tRes.success) teachers = tRes.teachers;
                else teachers = [];
            }
            const sel = document.getElementById('ra_newSupervisor');
            sel.innerHTML = '<option value="">-- Select New Supervisor --</option>';
            for (const t of teachers) {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.firstName + ' ' + t.lastName + ' (' + (t.department || '') + ')';
                sel.appendChild(opt);
            }
            document.getElementById('reassignModal').classList.add('active');
        }

        async function doReassign() {
            const assignmentId = document.getElementById('ra_assignmentId').value;
            const studentId = document.getElementById('ra_studentId').value;
            const oldSupervisorId = document.getElementById('ra_oldSupervisorId').value;
            const studentName = document.getElementById('ra_studentName').value;
            const newSupervisorId = document.getElementById('ra_newSupervisor').value;
            const year = document.getElementById('ra_year').value || null;
            const semester = document.getElementById('ra_semester').value || null;

            if (!newSupervisorId) { showToast('Select a new supervisor', 'error'); return; }

            // Delete old assignment first
            const delRes = await TPRSApi.adminDeleteAssignment(assignmentId);
            if (!delRes.success) {
                showToast('Failed to remove old assignment: ' + delRes.message, 'error');
                return;
            }
            // Create new assignment
            const assignRes = await TPRSApi.adminAssignStudent(parseInt(newSupervisorId), parseInt(studentId), year, semester);
            if (assignRes.success) {
                showToast('Student reassigned successfully', 'success');
                closeModal('reassignModal');
                loadAllAssignments();

                // Send notification to old supervisor
                await TPRSApi.createNotification({
                    recipientId: parseInt(oldSupervisorId),
                    recipientType: 'teacher',
                    senderId: parseInt(studentId),
                    senderType: 'student',
                    type: 'assignment',
                    title: 'Student Reassigned',
                    message: studentName + ' has been reassigned to a different supervisor.'
                });

                // Send notification to student
                await TPRSApi.createNotification({
                    recipientId: parseInt(studentId),
                    recipientType: 'student',
                    senderId: parseInt(oldSupervisorId), // Just an arbitrary teacher sender
                    senderType: 'teacher',
                    type: 'assignment',
                    title: 'Supervisor Reassigned',
                    message: 'Your supervisor has been changed. Check your profile for the new assignment.'
                });
            } else {
                showToast('Reassignment failed: ' + assignRes.message, 'error');
            }
        }

        function deleteAssignment(id, studentName, supervisorName) {
            showDeleteConfirm('Remove Assignment',
                'Remove assignment of "' + studentName + '" from supervisor "' + supervisorName + '"? This action cannot be undone.',
                async () => {
                    const res = await TPRSApi.adminDeleteAssignment(id);
                    showToast(res.message, res.success ? 'success' : 'error');
                    if (res.success) loadAllAssignments();
                }
            );
        }

        // Initial load
        loadOverview();
        loadAdminSettings();

        // ===== Settings Panel =====
        // ===== Drag and Drop Ordering =====
        let draggedRow = null;

        function attachDragEvents(row) {
            row.draggable = true;
            row.addEventListener('dragstart', (e) => {
                draggedRow = row;
                row.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
            });
            row.addEventListener('dragend', () => {
                draggedRow.style.opacity = '1';
                draggedRow = null;
            });
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const container = row.parentElement;
                
                // Determine insertion point
                const siblings = [...container.querySelectorAll('.settings-row:not([style*="opacity: 0.5"])')];
                const nextSibling = siblings.find(sibling => {
                    const box = sibling.getBoundingClientRect();
                    return e.clientY <= box.top + box.height / 2;
                });
                
                if (draggedRow && draggedRow !== row) {
                    container.insertBefore(draggedRow, nextSibling || null);
                }
            });
        }

        function createInputsHtml(inputs) {
            return inputs.map(i => `<input type="text" style="flex:${i.flex}; font-size:0.95rem; padding:0.6rem; border:1px solid #3d3d52; border-radius:6px; outline:none; background:#252538; color:#e2e2ea; transition:border-color 0.2s; box-shadow:inset 0 1px 3px rgba(0,0,0,0.2);" class="${i.class}" value="${i.val}" placeholder="${i.placeholder}" onfocus="this.style.borderColor='#e84393'" onblur="this.style.borderColor='#3d3d52'">`).join('');
        }
        
        function moveRowUp(btn) {
            const row = btn.parentElement.parentElement;
            if (row.previousElementSibling) {
                row.parentElement.insertBefore(row, row.previousElementSibling);
            }
        }

        function moveRowDown(btn) {
            const row = btn.parentElement.parentElement;
            if (row.nextElementSibling) {
                row.parentElement.insertBefore(row.nextElementSibling, row);
            }
        }

        function addListRow(containerId, inputs) {
            const container = document.getElementById(containerId);
            const row = document.createElement('div');
            row.className = 'settings-row';
            row.style.display = 'flex';
            row.style.gap = '0.5rem';
            row.style.alignItems = 'center';
            row.style.cursor = 'grab';
            row.style.transition = 'all 0.2s';
            
            row.innerHTML = `
                <span class="material-icons" style="color:#b5b5cc; cursor:grab; font-size:1.2rem;">drag_indicator</span>
            ` + createInputsHtml(inputs) + `
                <button type="button" tabindex="-1" onclick="this.parentElement.remove()" style="background:none; border:none; color:#f44336; cursor:pointer; display:flex; align-items:center; padding:5px;" title="Delete">
                    <span class="material-icons" style="font-size:1.2rem;">delete</span>
                </button>
            `;
            
            // Allow clicking to edit, drag logic handles cursor states
            row.addEventListener('mousedown', () => row.style.cursor = 'grabbing');
            row.addEventListener('mouseup', () => row.style.cursor = 'grab');
            
            attachDragEvents(row);
            container.appendChild(row);

            // Auto-scroll and focus for new empty rows
            requestAnimationFrame(() => {
                if (inputs[0] && !inputs[0].val) {
                    container.scrollTop = container.scrollHeight;
                    const firstInput = row.querySelector('input');
                    if (firstInput) firstInput.focus();
                }
            });
        }

        function addSessionRow(val = '') {
            addListRow('settings-sessions-list', [{val, class: 'sess-input', flex: 1, placeholder: '2020-21'}]);
        }
        
        function addSpecializationRow(val = '') {
            addListRow('settings-specializations-list', [{val, class: 'spec-input', flex: 1, placeholder: 'e.g. AI'}]);
        }

        function addDepartmentRow(id = '', name = '') {
            addListRow('settings-departments-list', [
                {val: id, class: 'dep-id', flex: 1, placeholder: 'ID'},
                {val: name, class: 'dep-name', flex: 3, placeholder: 'Name'}
            ]);
        }
        
        function addDegreeRow(id = '', name = '') {
            addListRow('settings-degrees-list', [
                {val: id, class: 'deg-id', flex: 1, placeholder: 'ID'},
                {val: name, class: 'deg-name', flex: 3, placeholder: 'Name'}
            ]);
        }

        async function loadSystemSettings() {
            try {
                document.getElementById('settings-sessions-list').innerHTML = '';
                document.getElementById('settings-specializations-list').innerHTML = '';
                document.getElementById('settings-departments-list').innerHTML = '';
                document.getElementById('settings-degrees-list').innerHTML = '';
                
                const settings = await TPRSApi.getSettings();
                
                if (settings.sessions) settings.sessions.forEach(s => addSessionRow(s));
                if (settings.specializations) settings.specializations.forEach(s => addSpecializationRow(s));
                if (settings.departments) settings.departments.forEach(d => addDepartmentRow(d.id, d.name));
                if (settings.degreeTypes) settings.degreeTypes.forEach(d => addDegreeRow(d.id, d.name));
                
            } catch(e) {
                console.error("Failed to load settings array:", e);
                showToast('Failed to load settings', 'error');
            }
        }

        async function saveSystemSettings() {
            try {
                // Collect Arrays
                const sessions = Array.from(document.querySelectorAll('.sess-input')).map(el => el.value.trim()).filter(v => v);
                const specializations = Array.from(document.querySelectorAll('.spec-input')).map(el => el.value.trim()).filter(v => v);
                
                // Collect Departments
                const departmentRows = Array.from(document.getElementById('settings-departments-list').children);
                const departments = departmentRows.map(row => {
                    return {
                        id: row.querySelector('.dep-id').value.trim(),
                        name: row.querySelector('.dep-name').value.trim()
                    };
                }).filter(d => d.id && d.name);

                // Collect Degrees
                const degreeRows = Array.from(document.getElementById('settings-degrees-list').children);
                const degreeTypes = degreeRows.map(row => {
                    return {
                        id: row.querySelector('.deg-id').value.trim(),
                        name: row.querySelector('.deg-name').value.trim()
                    };
                }).filter(d => d.id && d.name);
                
                const settingsData = { sessions, specializations, departments, degreeTypes };
                
                const res = await TPRSApi.updateSettings(settingsData);
                if(res.success) {
                    showToast('Settings saved successfully', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast(res.message || 'Failed to save settings', 'error');
                }
            } catch(e) {
                console.error(e);
                showToast('Save failed layout mismatch', 'error');
            }
        }

        async function loadAdminSettings() {
            try {
                const settings = await TPRSApi.getSettings();
                
                const sessionFilter = document.getElementById('assignSessionFilter');
                if (sessionFilter && settings.sessions) {
                    sessionFilter.innerHTML = '<option value="">All Sessions</option>';
                    settings.sessions.forEach(session => {
                        const opt = document.createElement('option');
                        opt.value = session;
                        opt.textContent = session;
                        sessionFilter.appendChild(opt);
                    });
                }
            } catch (err) {
                console.error("Failed to load admin settings dropdown:", err);
            }
        }

        // Clear all search inputs to prevent browser autofill
        document.querySelectorAll('input[type="search"]').forEach(el => el.value = '');
