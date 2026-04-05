// --- Extracted from /html/supervisor-dashboard.html ---
// ===== Global State =====
        let currentUser = null;
        let allUnassignedStudents = [];
let allGlobalAssignments = [];

        // ===== Initialization =====
        document.addEventListener('DOMContentLoaded', async function() {
            // Auth check
            if (!TPRSApi.isLoggedIn() || TPRSApi.getUserType() !== 'teacher') {
                window.location.href = '/html/login.html';
                return;
            }

            currentUser = TPRSApi.getCurrentUser();
            if (!currentUser) {
                window.location.href = '/html/login.html';
                return;
            }

            setupUserProfile();
            await Promise.all([
                loadNotifications(),
                loadAssignedStudents(),
                loadPendingProjects()
            ]);

            // Clear search inputs to prevent browser autofill
            document.querySelectorAll('input[type="search"]').forEach(el => el.value = '');
        });

        // ===== User Profile Setup =====
        function setupUserProfile() {
            const name = (currentUser.firstName || '') + ' ' + (currentUser.lastName || '');
            const initials = ((currentUser.firstName || 'S')[0] + (currentUser.lastName || 'V')[0]).toUpperCase();

            document.getElementById('userName').textContent = name.trim() || 'Supervisor';
            document.getElementById('userAvatar').textContent = initials;
            document.getElementById('dropdownName').textContent = name.trim() || 'Supervisor';
            document.getElementById('dropdownAvatar').textContent = initials;
            document.getElementById('dropdownEmail').textContent = currentUser.email || '';
            document.getElementById('dropdownDept').textContent = (currentUser.department || 'N/A') + ' Department';
            document.getElementById('dropdownDesignation').textContent = currentUser.designation || '';

            // Profile dropdown toggle
            document.getElementById('userProfile').addEventListener('click', function(e) {
                e.stopPropagation();
                document.getElementById('userProfile').classList.toggle('active');
            });
            document.addEventListener('click', function(e) {
                const userProfile = document.getElementById('userProfile');
                if (!userProfile.contains(e.target)) {
                    userProfile.classList.remove('active');
                }
            });
        }

        // ===== Notifications =====
        async function loadNotifications() {
            const userId = currentUser.id;
            const result = await TPRSApi.getNotifications(userId, 'teacher');
            const countResult = await TPRSApi.getUnreadNotificationCount(userId, 'teacher');

            const unreadCount = countResult.success ? countResult.count : 0;
            document.getElementById('statNotifications').textContent = unreadCount;

            const bellBadge = document.getElementById('bellBadge');
            if (bellBadge) {
                if (unreadCount > 0) {
                    bellBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                    bellBadge.classList.remove('hidden');
                } else {
                    bellBadge.classList.add('hidden');
                }
            }

            const container = document.getElementById('notificationsList');
            if (!result.success || !result.notifications || result.notifications.length === 0) {
                container.innerHTML = `<div class="empty-state">
                    <span class="material-icons">notifications_none</span>
                    <p>No notifications yet</p>
                </div>`;
                return;
            }

            container.innerHTML = result.notifications.map(n => {
                const iconClass = getNotifIconClass(n.type);
                const iconName = getNotifIconName(n.type);
                const timeAgo = formatTimeAgo(n.createdAt);
                return `
                    <div class="notification-item ${n.isRead ? '' : 'unread'}" onclick="markRead(${n.id})">
                        <div class="notif-icon ${iconClass}">
                            <span class="material-icons">${iconName}</span>
                        </div>
                        <div class="notif-content">
                            <div class="notif-title">${escapeHtml(n.title)}</div>
                            <div class="notif-message">${escapeHtml(n.message)}</div>
                            <div class="notif-time">${timeAgo}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function getNotifIconClass(type) {
            switch(type) {
                case 'project_submitted': return 'submit';
                case 'project_approved': return 'approve';
                case 'project_rejected': return 'reject';
                case 'assignment': return 'assign';
                default: return 'general';
            }
        }

        function getNotifIconName(type) {
            switch(type) {
                case 'project_submitted': return 'upload_file';
                case 'project_approved': return 'check_circle';
                case 'project_rejected': return 'cancel';
                case 'assignment': return 'person_add';
                default: return 'info';
            }
        }

        async function markRead(notifId) {
            await TPRSApi.markNotificationRead(notifId);
            await loadNotifications();
        }

        async function markAllRead() {
            await TPRSApi.markAllNotificationsRead(currentUser.id, 'teacher');
            await loadNotifications();
        }

        // ===== Assigned Students =====
        async function loadAssignedStudents() {
            const result = await TPRSApi.getAssignedStudents(currentUser.id);
            const container = document.getElementById('assignedStudentsList');

            if (!result.success || !result.students || result.students.length === 0) {
                container.innerHTML = `<div class="empty-state">
                    <span class="material-icons">person_add</span>
                    <p>No students assigned yet. Click "Assign Student" to add.</p>
                </div>`;
                document.getElementById('statStudents').textContent = '0';
                return;
            }

            document.getElementById('statStudents').textContent = result.students.length;

            const htmlList = [];
            for (const s of result.students) {
                const initials = ((s.firstName || 'S')[0] + (s.lastName || '')[0]).toUpperCase();
                const yearSem = [s.assignedYear ? s.assignedYear + ' Year' : '', s.assignedSemester ? s.assignedSemester + ' Sem' : ''].filter(Boolean).join(', ');
                const degreeName = await TPRSApi.getDegreeName(s.semester);
                
                htmlList.push(`
                    <div class="student-item">
                        <div class="student-info">
                            <div class="student-avatar">${initials}</div>
                            <div>
                                <div class="student-name">${escapeHtml(s.firstName + ' ' + s.lastName)}</div>
                                <div class="student-detail">${escapeHtml(s.studentId || '')} · ${escapeHtml(s.department || '')} · ${escapeHtml(degreeName || '')}${yearSem ? ' · ' + yearSem : ''}</div>
                            </div>
                        </div>
                        <button class="btn-unassign" onclick="unassignStudent(${s.id}, '${s.assignedYear || ''}', '${s.assignedSemester || ''}')">
                            <span class="material-icons" style="font-size:1rem">person_remove</span>
                            Remove
                        </button>
                    </div>
                `);
            }
            container.innerHTML = htmlList.join('');
        }

        let pendingRemoveStudentId = null;
        let pendingRemoveYear = null;
        let pendingRemoveSemester = null;

        async function unassignStudent(studentId, year, semester) {
            pendingRemoveStudentId = studentId;
            pendingRemoveYear = year || null;
            pendingRemoveSemester = semester || null;
            document.getElementById('removeStudentModal').classList.add('active');
        }

        function closeRemoveStudentModal() {
            document.getElementById('removeStudentModal').classList.remove('active');
            pendingRemoveStudentId = null;
            pendingRemoveYear = null;
            pendingRemoveSemester = null;
        }

        document.getElementById('confirmRemoveStudentBtn').addEventListener('click', async function() {
            if (!pendingRemoveStudentId) return;
            const studentId = pendingRemoveStudentId;
            const year = pendingRemoveYear;
            const semester = pendingRemoveSemester;
            closeRemoveStudentModal();
            const result = await TPRSApi.unassignStudent(currentUser.id, studentId, year, semester);
            if (result.success) {
                showToast('Student removed successfully.', 'success');
                await loadAssignedStudents();
            } else {
                showToast(result.message || 'Failed to unassign student.', 'error');
            }
        });

        document.getElementById('removeStudentModal').addEventListener('click', function(e) {
            if (e.target === this) closeRemoveStudentModal();
        });

        // ===== Pending Projects =====
        async function loadPendingProjects() {
            const result = await TPRSApi.getProjects({ status: 'pending' });
            const container = document.getElementById('pendingProjectsList');

            // Filter projects to only those from assigned students
            const assignedResult = await TPRSApi.getAssignedStudents(currentUser.id);
            const assignedIds = new Set();
            if (assignedResult.success && assignedResult.students) {
                assignedResult.students.forEach(s => assignedIds.add(s.id));
            }

            let projects = [];
            if (result.success && result.projects) {
                projects = result.projects.filter(p => assignedIds.has(p.studentId));
            }

            document.getElementById('statPending').textContent = projects.length;
            document.getElementById('pendingBadge').textContent = projects.length;

            // Count approved for stat
            const approvedResult = await TPRSApi.getProjects({ status: 'approved' });
            let approvedCount = 0;
            if (approvedResult.success && approvedResult.projects) {
                approvedCount = approvedResult.projects.filter(p => assignedIds.has(p.studentId)).length;
            }
            document.getElementById('statApproved').textContent = approvedCount;

            if (projects.length === 0) {
                container.innerHTML = `<div class="empty-state">
                    <span class="material-icons">check_circle_outline</span>
                    <p>No pending projects from your students</p>
                </div>`;
                return;
            }

            container.innerHTML = projects.map(p => `
                <div class="project-item" onclick="openProjectDetailModal(${p.id})" style="cursor:pointer;">
                    <div class="project-top">
                        <div class="project-title-text">${escapeHtml(p.title)}</div>
                        <span class="project-status status-pending">Pending</span>
                    </div>
                    ${p.description ? `<div style="color:#b5b5cc;font-size:0.85rem;line-height:1.5;margin:0.3rem 0 0.5rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(p.description)}</div>` : ''}
                    <div class="project-meta">
                        <span><span class="material-icons" style="font-size:0.9rem;vertical-align:middle">person</span> ${escapeHtml(p.studentName || 'Unknown')}</span>
                        <span><span class="material-icons" style="font-size:0.9rem;vertical-align:middle">business</span> ${escapeHtml(p.department || '')}</span>
                        <span><span class="material-icons" style="font-size:0.9rem;vertical-align:middle">calendar_today</span> ${formatDate(p.submissionDate || p.createdAt)}</span>
                        ${p.year || p.semester ? `<span><span class="material-icons" style="font-size:0.9rem;vertical-align:middle">school</span> ${escapeHtml((p.year || '') + (p.year && p.semester ? ' Year, ' : '') + (p.semester || '') + (p.semester ? ' Sem' : ''))}</span>` : ''}
                    </div>
                    <div class="project-actions" onclick="event.stopPropagation()">
                        ${p.fileName ? `<button class="btn-download" onclick="TPRSApi.downloadProjectFile(${p.id})" style="background:rgba(79,172,254,0.15);color:#4facfe;border:none;padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;gap:0.3rem;">
                            <span class="material-icons" style="font-size:1rem">download</span>
                            ${escapeHtml(p.fileName)}
                        </button>` : ''}
                        ${p.zipFileName ? `<button class="btn-download" onclick="TPRSApi.downloadProjectZip(${p.id})" style="background:rgba(232,67,147,0.15);color:#d63d86;border:none;padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;gap:0.3rem;">
                            <span class="material-icons" style="font-size:1rem">folder_zip</span>
                            ${escapeHtml(p.zipFileName)}
                        </button>` : ''}
                        ${p.githubLink ? `<a href="${p.githubLink.startsWith('http') ? escapeHtml(p.githubLink) : 'https://' + escapeHtml(p.githubLink)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="background:rgba(171,71,188,0.15);color:#ce93d8;border:none;padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;gap:0.3rem;text-decoration:none;">
                            <span class="material-icons" style="font-size:1rem">code</span>
                            GitHub
                        </a>` : ''}
                        <button class="btn-approve" onclick="approveProject(${p.id})">
                            <span class="material-icons" style="font-size:1rem">check</span>
                            Approve
                        </button>
                        <button class="btn-reject" onclick="rejectProject(${p.id})">
                            <span class="material-icons" style="font-size:1rem">close</span>
                            Reject
                        </button>
                    </div>
                </div>
            `).join('');
        }

        let pendingActionProjectId = null;

        function showToast(message, type = 'success') {
            const toast = document.getElementById('actionToast');
            const toastIcon = document.getElementById('toastIcon');
            const toastMessage = document.getElementById('toastMessage');
            toast.className = 'confirm-modal-toast ' + type;
            toastIcon.textContent = type === 'success' ? 'check_circle' : 'error';
            toastMessage.textContent = message;
            toast.style.display = 'flex';
            setTimeout(() => { toast.style.display = 'none'; }, 3000);
        }

        function approveProject(projectId) {
            pendingActionProjectId = projectId;
            document.getElementById('approveModal').classList.add('active');
        }

        function closeApproveModal() {
            document.getElementById('approveModal').classList.remove('active');
            pendingActionProjectId = null;
        }

        document.getElementById('confirmApproveBtn').addEventListener('click', async function() {
            if (!pendingActionProjectId) return;
            const projectId = pendingActionProjectId;
            closeApproveModal();
            const result = await TPRSApi.approveProject(projectId);
            if (result.success) {
                showToast('Project approved successfully!', 'success');
                await Promise.all([loadPendingProjects(), loadNotifications()]);
            } else {
                showToast(result.message || 'Failed to approve project.', 'error');
            }
        });

        document.getElementById('approveModal').addEventListener('click', function(e) {
            if (e.target === this) closeApproveModal();
        });

        function rejectProject(projectId) {
            pendingActionProjectId = projectId;
            document.getElementById('rejectReasonInput').value = '';
            document.getElementById('rejectModal').classList.add('active');
        }

        function closeRejectModal() {
            document.getElementById('rejectModal').classList.remove('active');
            pendingActionProjectId = null;
        }

        document.getElementById('confirmRejectBtn').addEventListener('click', async function() {
            if (!pendingActionProjectId) return;
            const projectId = pendingActionProjectId;
            const reason = document.getElementById('rejectReasonInput').value.trim();
            closeRejectModal();
            const result = await TPRSApi.rejectProject(projectId, reason);
            if (result.success) {
                showToast('Project rejected.', 'success');
                await Promise.all([loadPendingProjects(), loadNotifications()]);
            } else {
                showToast(result.message || 'Failed to reject project.', 'error');
            }
        });

        document.getElementById('rejectModal').addEventListener('click', function(e) {
            if (e.target === this) closeRejectModal();
        });

        // ===== Assign Modal =====
        async function openAssignModal() {
            document.getElementById('assignModal').classList.add('active');
            document.getElementById('studentSearch').value = '';

            const [unassignedResult, assignmentsResult] = await Promise.all([
                TPRSApi.getUnassignedStudents(currentUser.id),
                TPRSApi.adminGetAllAssignments()
            ]);

            if (unassignedResult.success && unassignedResult.students) {
                allUnassignedStudents = unassignedResult.students;
            } else {
                allUnassignedStudents = [];
            }

            if (assignmentsResult && assignmentsResult.success && assignmentsResult.assignments) {
                allGlobalAssignments = assignmentsResult.assignments;
            } else {
                allGlobalAssignments = [];
            }

            renderUnassignedStudents(allUnassignedStudents);
        }

        function closeAssignModal() {
            document.getElementById('assignModal').classList.remove('active');
        }

        function filterStudents() {
            const query = document.getElementById('studentSearch').value.toLowerCase();
            const filtered = allUnassignedStudents.filter(s =>
                (s.firstName + ' ' + s.lastName).toLowerCase().includes(query) ||
                (s.studentId || '').toLowerCase().includes(query) ||
                (s.email || '').toLowerCase().includes(query)
            );
            renderUnassignedStudents(filtered);
        }

        async function renderUnassignedStudents(students) {
            const container = document.getElementById('unassignedStudentsList');
            if (students.length === 0) {
                container.innerHTML = `<div class="empty-state">
                    <span class="material-icons">search_off</span>
                    <p>No unassigned students found</p>
                </div>`;
                return;
            }
            const selectedYear = document.getElementById('assignYear').value;
            const selectedSemester = document.getElementById('assignSemester').value;

            const htmlList = [];
            for (const s of students) {
                const initials = ((s.firstName || 'S')[0] + (s.lastName || '')[0]).toUpperCase();
                const degreeName = await TPRSApi.getDegreeName(s.semester);
                
                let isAssigned = false;
                if (selectedYear && selectedSemester) {
                    isAssigned = allGlobalAssignments.some(a => 
                        parseInt(a.studentId) === parseInt(s.id) && 
                        a.assignedYear === selectedYear && 
                        a.assignedSemester === selectedSemester
                    );
                }

                htmlList.push(`
                    <div class="student-item ${isAssigned ? 'assigned' : ''}">
                        <div class="student-info">
                            <div class="student-avatar">${initials}</div>
                            <div>
                                <div class="student-name">${escapeHtml(s.firstName + ' ' + s.lastName)}</div>
                                <div class="student-detail">${escapeHtml(s.studentId || '')} · ${escapeHtml(degreeName || '')} · ${escapeHtml(s.email || '')}</div>
                            </div>
                        </div>
                        ${isAssigned 
                            ? `<button class="btn-assign btn-assigned" disabled>
                                   <span class="material-icons" style="font-size:1rem">check_circle</span>
                                   Assigned
                               </button>`
                            : `<button class="btn-assign" onclick="assignStudentFromModal(${s.id})">
                                   <span class="material-icons" style="font-size:1rem">person_add</span>
                                   Assign
                               </button>`
                        }
                    </div>
                `);
            }
            container.innerHTML = htmlList.join('');
        }

        async function assignStudentFromModal(studentId) {
            const year = document.getElementById('assignYear').value;
            const semester = document.getElementById('assignSemester').value;
            if (!year || !semester) {
                alert('Please specify the year and semester for this assignment.');
                return;
            }
            const result = await TPRSApi.assignStudent(currentUser.id, studentId, year, semester);
            if (result.success) {
                closeAssignModal();
                await Promise.all([loadAssignedStudents(), loadPendingProjects()]);
            } else {
                alert(result.message || 'Failed to assign student.');
            }
        }

        // ===== Profile Modal =====
        function openProfileModal() {
            document.getElementById('userProfile').classList.remove('active');
            const name = (currentUser.firstName || '') + ' ' + (currentUser.lastName || '');
            const initials = ((currentUser.firstName || 'S')[0] + (currentUser.lastName || 'V')[0]).toUpperCase();

            document.getElementById('profileAvatar').textContent = initials;
            document.getElementById('profileName').textContent = name.trim() || 'Supervisor';
            document.getElementById('profileEmail').textContent = currentUser.email || '—';
            document.getElementById('profileDept').textContent = currentUser.department || '—';
            document.getElementById('profileDesignation').textContent = currentUser.designation || '—';
            document.getElementById('profileSpecialization').textContent = currentUser.specialization || '—';
            document.getElementById('profilePhone').textContent = currentUser.phone || '—';

            document.getElementById('profileModal').classList.add('active');
        }

        function closeProfileModal() {
            document.getElementById('profileModal').classList.remove('active');
            cancelSupervisorPhoneEdit();
        }

        function editSupervisorPhone() {
            document.getElementById('profilePhoneInput').value = currentUser && currentUser.phone ? currentUser.phone : '';
            document.getElementById('profilePhoneDisplay').style.display = 'none';
            document.getElementById('profilePhoneEdit').style.display = 'block';
        }

        function cancelSupervisorPhoneEdit() {
            document.getElementById('profilePhoneDisplay').style.display = '';
            document.getElementById('profilePhoneEdit').style.display = 'none';
        }

        async function saveSupervisorPhone() {
            if (!currentUser) return;
            const phone = document.getElementById('profilePhoneInput').value.trim();
            const result = await TPRSApi.updatePhone(currentUser.id, 'teacher', phone);
            if (result.success) {
                currentUser.phone = phone;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                document.getElementById('profilePhone').textContent = phone || '—';
                cancelSupervisorPhoneEdit();
            } else {
                alert(result.message || 'Failed to update phone.');
            }
        }

        // Close profile modal when clicking outside
        document.getElementById('profileModal').addEventListener('click', function(e) {
            if (e.target === this) closeProfileModal();
        });

        // ===== Project Detail Modal =====
        async function openProjectDetailModal(projectId) {
            const result = await TPRSApi.getProject(projectId);
            if (!result.success || !result.project) {
                showToast('Failed to load project details', 'error');
                return;
            }
            const p = result.project;

            // Record unique view
            const viewer = TPRSApi.getCurrentUser();
            const vType = TPRSApi.getUserType();
            if (viewer && viewer.id && vType) {
                TPRSApi.recordView(projectId, viewer.id, vType);
            }

            document.getElementById('pdTitle').textContent = p.title || 'Untitled';
            const statusBadge = document.getElementById('pdStatusBadge');
            statusBadge.textContent = (p.status || 'pending').charAt(0).toUpperCase() + (p.status || 'pending').slice(1);
            statusBadge.className = 'project-status status-' + (p.status || 'pending');
            document.getElementById('pdDescription').textContent = p.description || 'No description provided.';
            const typeVal = p.type || p.projectType || p.field || '—';
            document.getElementById('pdType').textContent = typeVal !== '—' ? typeVal.charAt(0).toUpperCase() + typeVal.slice(1) : '—';
            document.getElementById('pdStudent').textContent = p.studentName || '—';
            document.getElementById('pdDept').textContent = p.department || '—';
            document.getElementById('pdKeywords').textContent = p.keywords || '—';
            const yearSem = ((p.year || '') + (p.year && p.semester ? ' Year, ' : '') + (p.semester || '') + (p.semester ? ' Semester' : '')) || '—';
            document.getElementById('pdYearSem').textContent = yearSem;
            document.getElementById('pdSession').textContent = p.session || '—';
            document.getElementById('pdDate').textContent = formatDate(p.submissionDate || p.createdAt);
            const fileRow = document.getElementById('pdFileRow');
            if (p.fileName) {
                fileRow.style.display = '';
                document.getElementById('pdFile').innerHTML = `<a href="javascript:void(0)" onclick="event.stopPropagation();TPRSApi.downloadProjectFile(${p.id})" style="color:#4facfe;text-decoration:none;display:flex;align-items:center;gap:0.3rem;"><span class="material-icons" style="font-size:1rem">download</span>${escapeHtml(p.fileName)}</a>`;
            } else {
                fileRow.style.display = 'none';
            }
            const zipRow = document.getElementById('pdZipRow');
            if (p.zipFileName) {
                zipRow.style.display = '';
                document.getElementById('pdZipFile').innerHTML = `<a href="javascript:void(0)" onclick="event.stopPropagation();TPRSApi.downloadProjectZip(${p.id})" style="color:#d63d86;text-decoration:none;display:flex;align-items:center;gap:0.3rem;"><span class="material-icons" style="font-size:1rem">folder_zip</span>${escapeHtml(p.zipFileName)}</a>`;
            } else {
                zipRow.style.display = 'none';
            }
            const githubRow = document.getElementById('pdGithubRow');
            if (p.githubLink) {
                githubRow.style.display = '';
                const ghUrl = p.githubLink.startsWith('http') ? p.githubLink : 'https://' + p.githubLink;
                document.getElementById('pdGithub').innerHTML = `<a href="${escapeHtml(ghUrl)}" target="_blank" rel="noopener noreferrer" style="color:#ce93d8;text-decoration:none;display:flex;align-items:center;gap:0.3rem;"><span class="material-icons" style="font-size:1rem">open_in_new</span>${escapeHtml(p.githubLink)}</a>`;
            } else {
                githubRow.style.display = 'none';
            }
            document.getElementById('projectDetailModal').classList.add('active');
        }

        function closeProjectDetailModal() {
            document.getElementById('projectDetailModal').classList.remove('active');
        }

        document.getElementById('projectDetailModal').addEventListener('click', function(e) {
            if (e.target === this) closeProjectDetailModal();
        });

        // ===== Utilities =====
        function escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        function formatTimeAgo(dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            const now = new Date();
            const diffMs = now - date;
            if (diffMs < 0) return 'Just now';
            const diffSecs = Math.floor(diffMs / 1000);
            if (diffSecs < 60) return 'Just now';
            const diffMins = Math.floor(diffSecs / 60);
            if (diffMins < 60) return diffMins + (diffMins === 1 ? ' minute ago' : ' minutes ago');
            const diffHrs = Math.floor(diffMins / 60);
            if (diffHrs < 24) return diffHrs + (diffHrs === 1 ? ' hour ago' : ' hours ago');
            const diffDays = Math.floor(diffHrs / 24);
            if (diffDays < 30) return diffDays + (diffDays === 1 ? ' day ago' : ' days ago');
            const diffMonths = Math.floor(diffDays / 30);
            if (diffMonths < 12) return diffMonths + (diffMonths === 1 ? ' month ago' : ' months ago');
            const diffYears = Math.floor(diffMonths / 12);
            return diffYears + (diffYears === 1 ? ' year ago' : ' years ago');
        }

        function formatDate(dateStr) {
            if (!dateStr) return 'N/A';
            return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }

        function handleLogout() {
            TPRSApi.logout();
            window.location.href = '/html/login.html';
        }
    

        function openChangePasswordModal(e) {
            if (e) e.preventDefault();
            document.getElementById('cpwOldPassword').value = '';
            document.getElementById('cpwNewPassword').value = '';
            document.getElementById('cpwConfirmPassword').value = '';
            document.getElementById('cpwError').classList.remove('show');
            document.getElementById('cpwSuccess').classList.remove('show');
            resetCpwStrength();
            document.getElementById('cpwSubmitBtn').disabled = false;
            document.getElementById('cpwSubmitBtn').textContent = 'Change Password';
            document.getElementById('changePasswordModal').classList.add('active');
            const userProfile = document.getElementById('userProfile');
            if (userProfile) userProfile.classList.remove('active');
        }
        function closeChangePasswordModal() {
            document.getElementById('changePasswordModal').classList.remove('active');
        }
        // document.getElementById('changePasswordModal').addEventListener('click', function(e) {
        //     if (e.target === this) closeChangePasswordModal();
        // });

        function toggleCpwVisibility(inputId, icon) {
            const input = document.getElementById(inputId);
            if (input.type === 'password') { input.type = 'text'; icon.textContent = 'visibility_off'; }
            else { input.type = 'password'; icon.textContent = 'visibility'; }
        }

        function resetCpwStrength() {
            ['cpwBar1','cpwBar2','cpwBar3','cpwBar4'].forEach(id => document.getElementById(id).className = 'cpw-str-bar');
            const t = document.getElementById('cpwStrText'); t.className = 'cpw-str-text'; t.textContent = 'Password strength';
        }

        function checkCpwStrength() {
            const password = document.getElementById('cpwNewPassword').value;
            const bars = ['cpwBar1','cpwBar2','cpwBar3','cpwBar4'].map(id => document.getElementById(id));
            const text = document.getElementById('cpwStrText');
            bars.forEach(b => b.className = 'cpw-str-bar');
            text.className = 'cpw-str-text';
            if (!password) { text.textContent = 'Password strength'; return; }
            let strength = 0;
            if (password.length >= 6) strength++;
            if (password.length >= 10) strength++;
            if (/\d/.test(password)) strength++;
            if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
            if (strength <= 2) {
                bars[0].classList.add('weak'); text.textContent = 'Weak password'; text.classList.add('weak');
            } else if (strength <= 3) {
                bars[0].classList.add('medium'); bars[1].classList.add('medium'); text.textContent = 'Medium password'; text.classList.add('medium');
            } else if (strength <= 4) {
                bars[0].classList.add('strong'); bars[1].classList.add('strong'); bars[2].classList.add('strong'); text.textContent = 'Strong password'; text.classList.add('strong');
            } else {
                bars.forEach(b => b.classList.add('strong')); text.textContent = 'Very strong password'; text.classList.add('strong');
            }
        }

        async function submitChangePassword() {
            const oldPw = document.getElementById('cpwOldPassword').value;
            const newPw = document.getElementById('cpwNewPassword').value;
            const confirmPw = document.getElementById('cpwConfirmPassword').value;
            const errEl = document.getElementById('cpwError'), errText = document.getElementById('cpwErrorText');
            const succEl = document.getElementById('cpwSuccess'), succText = document.getElementById('cpwSuccessText');
            errEl.classList.remove('show'); succEl.classList.remove('show');

            if (!oldPw) { errText.textContent = 'Please enter your current password'; errEl.classList.add('show'); return; }
            if (newPw.length < 6) { errText.textContent = 'New password must be at least 6 characters'; errEl.classList.add('show'); return; }
            if (newPw !== confirmPw) { errText.textContent = 'New passwords do not match'; errEl.classList.add('show'); return; }

            const btn = document.getElementById('cpwSubmitBtn');
            btn.disabled = true; btn.textContent = 'Changing...';

            const user = TPRSApi.getCurrentUser();
            const userType = TPRSApi.getUserType();
            const result = await TPRSApi.changePassword(user.id, userType, oldPw, newPw);

            if (result.success) {
                succText.textContent = 'Password changed successfully!'; succEl.classList.add('show');
                btn.textContent = 'Done!';
                setTimeout(() => closeChangePasswordModal(), 1500);
            } else {
                errText.textContent = result.message || 'Failed to change password'; errEl.classList.add('show');
                btn.disabled = false; btn.textContent = 'Change Password';
            }
        }
