/**
 * TPRS API Service
 * Handles all API calls to the Java backend
 */

const API_BASE_URL = '/tprs/api';

const DEFAULT_SETTINGS = {
    departments: [],
    degreeTypes: [],
    sessions: [],
    specializations: [],
    keywords: []
};

async function parseApiJsonResponse(response, fallbackMessage) {
    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (!contentType.includes('application/json')) {
        if (!response.ok) {
            return {
                success: false,
                message: `Service temporarily unavailable (HTTP ${response.status}). Please try again.`
            };
        }
        return {
            success: false,
            message: fallbackMessage || 'Unexpected server response.'
        };
    }

    try {
        const data = await response.json();
        if (!response.ok) {
            return {
                success: false,
                message: data?.message || `Request failed (HTTP ${response.status}).`
            };
        }
        return data;
    } catch (e) {
        return {
            success: false,
            message: fallbackMessage || 'Invalid server response.'
        };
    }
}

const TPRSApi = {
    
    // =====================================================
    // SETTINGS / CONFIG APIs
    // =====================================================
    
    _settingsCache: null,
    
    /**
     * Fetch application settings (departments, sessions, specializations, etc)
     */
    async getSettings() {
        if (this._settingsCache) return this._settingsCache;
        try {
            const response = await fetch(`${API_BASE_URL}/settings`);
            if (!response.ok) {
                throw new Error(`Settings endpoint returned HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.toLowerCase().includes('application/json')) {
                throw new Error(`Settings endpoint returned non-JSON content-type: ${contentType || 'unknown'}`);
            }

            const parsed = await response.json();
            this._settingsCache = {
                ...DEFAULT_SETTINGS,
                ...(parsed || {})
            };
            return this._settingsCache;
        } catch (error) {
            console.warn('Settings unavailable, using safe fallback:', error.message || error);
            this._settingsCache = { ...DEFAULT_SETTINGS };
            return this._settingsCache;
        }
    },
    
    async getDegreeName(id) {
        if (!id) return '';
        const settings = await this.getSettings();
        if (settings && settings.degreeTypes) {
            const match = settings.degreeTypes.find(d => d.id === id || d.name === id);
            if (match) return match.name;
        }
        return id;
    },

    /**
     * Update the global system settings (Admin Only)
     */
    async updateSettings(settingsData) {
        try {
            const response = await fetch(`${API_BASE_URL}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settingsData)
            });
            return await response.json();
        } catch (error) {
            console.error('Settings fetch error:', error);
            return { success: false, message: 'Network error updating settings' };
        }
    },
    // =====================================================
    // AUTHENTICATION APIs
    // =====================================================
    
    /**
     * Login user (auto-detects role by email)
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise} - API response with userType and redirect
     */
    async loginWithToken(idToken, password = null) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ idToken, password })
            });
            return await parseApiJsonResponse(response, 'Unable to complete login right now.');
        } catch (error) {
            console.warn('Login token request failed:', error.message || error);
            return { success: false, message: 'Network error. Please check your connection.' };
        }
    },

    async notifyForgotPassword(email) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password-init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            return await parseApiJsonResponse(response, 'Unable to update password policy state.');
        } catch (error) {
            console.warn('Forgot password notify failed:', error.message || error);
            return { success: false, message: 'Network error while updating reset state.' };
        }
    },

    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            return await parseApiJsonResponse(response, 'Unable to complete login right now.');
        } catch (error) {
            console.warn('Login request failed:', error.message || error);
            return { success: false, message: 'Network error. Please check your connection.' };
        }
    },
    
    /**
     * Register a new student
     * @param {Object} studentData - Student registration data
     * @returns {Promise} - API response
     */
    async registerStudent(studentData) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
            return await response.json();
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Network error. Please check your connection.' };
        }
    },
    
    /**
     * Register a new teacher
     * @param {Object} teacherData - Teacher registration data
     * @returns {Promise} - API response
     */
    async registerTeacher(teacherData) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register-teacher`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(teacherData)
            });
            return await response.json();
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Network error. Please check your connection.' };
        }
    },
    
    /**
     * Get all projects
     * @param {Object} filters - Optional filters (status, department, search, limit)
     * @returns {Promise} - API response with projects list
     */
    async getProjects(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const url = queryParams ? `${API_BASE_URL}/projects?${queryParams}` : `${API_BASE_URL}/projects`;
            
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Get projects error:', error);
            return { success: false, message: 'Failed to fetch projects.' };
        }
    },
    
    /**
     * Get recent projects for dashboard
     * @param {number} limit - Number of projects to fetch
     * @returns {Promise} - API response with recent projects
     */
    async getRecentProjects(limit = 10) {
        try {
            const response = await fetch(`${API_BASE_URL}/projects/recent?limit=${limit}`);
            return await response.json();
        } catch (error) {
            console.error('Get recent projects error:', error);
            return { success: false, message: 'Failed to fetch recent projects.' };
        }
    },
    
    /**
     * Get project by ID
     * @param {number} projectId - Project ID
     * @returns {Promise} - API response with project details
     */
    async getProject(projectId) {
        try {
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
            return await response.json();
        } catch (error) {
            console.error('Get project error:', error);
            return { success: false, message: 'Failed to fetch project.' };
        }
    },
    
    /**
     * Get projects by student ID
     * @param {number} studentId - Student ID
     * @returns {Promise} - API response with student's projects
     */
    async getProjectsByStudent(studentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/projects?studentId=${studentId}`);
            return await response.json();
        } catch (error) {
            console.error('Get student projects error:', error);
            return { success: false, message: 'Failed to fetch projects.' };
        }
    },
    
    /**
     * Submit a new project/thesis
     * @param {Object} projectData - Project data
     * @param {File} file - Optional file to upload
     * @returns {Promise} - API response
     */
    async submitProject(projectData, file = null, zipFile = null) {
        try {
            let response;
            
            if (file || zipFile) {
                // Use FormData for file upload
                const formData = new FormData();
                Object.keys(projectData).forEach(key => {
                    formData.append(key, projectData[key]);
                });
                if (file) {
                    formData.append('file', file);
                }
                if (zipFile) {
                    formData.append('zipFile', zipFile);
                }
                
                response = await fetch(`${API_BASE_URL}/projects`, {
                    method: 'POST',
                    body: formData
                });
            } else {
                response = await fetch(`${API_BASE_URL}/projects`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(projectData)
                });
            }
            
            return await response.json();
        } catch (error) {
            console.error('Submit project error:', error);
            return { success: false, message: 'Failed to submit project.' };
        }
    },
    
    /**
     * Update project
     * @param {number} projectId - Project ID
     * @param {Object} projectData - Updated project data
     * @returns {Promise} - API response
     */
    async updateProject(projectId, projectData) {
        try {
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            });
            return await response.json();
        } catch (error) {
            console.error('Update project error:', error);
            return { success: false, message: 'Failed to update project.' };
        }
    },
    
    /**
     * Approve project
     * @param {number} projectId - Project ID
     * @returns {Promise} - API response
     */
    async approveProject(projectId) {
        try {
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Approve project error:', error);
            return { success: false, message: 'Failed to approve project.' };
        }
    },
    
    /**
     * Reject project
     * @param {number} projectId - Project ID
     * @param {string} reason - Optional rejection reason
     * @returns {Promise} - API response
     */
    async rejectProject(projectId, reason = '') {
        try {
            const body = reason ? { reason } : {};
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            return await response.json();
        } catch (error) {
            console.error('Reject project error:', error);
            return { success: false, message: 'Failed to reject project.' };
        }
    },
    
    /**
     * Delete project
     * @param {number} projectId - Project ID
     * @returns {Promise} - API response
     */
    async deleteProject(projectId) {
        try {
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Delete project error:', error);
            return { success: false, message: 'Failed to delete project.' };
        }
    },

    /**
     * Download project file
     * @param {number} projectId - Project ID
     */
    downloadProjectFile(projectId) {
        window.open(`${API_BASE_URL}/projects/${projectId}/download`, '_blank');
    },
    
    /**
     * Download project zip file
     * @param {number} projectId - Project ID
     */
    downloadProjectZip(projectId) {
        window.open(`${API_BASE_URL}/projects/${projectId}/download-zip`, '_blank');
    },
    
    /**
     * Search projects
     * @param {string} keyword - Search keyword
     * @returns {Promise} - API response with matching projects
     */
    async searchProjects(keyword) {
        try {
            const response = await fetch(`${API_BASE_URL}/projects?search=${encodeURIComponent(keyword)}`);
            return await response.json();
        } catch (error) {
            console.error('Search projects error:', error);
            return { success: false, message: 'Failed to search projects.' };
        }
    },
    
    /**
     * Record a unique view for a project
     * @param {number} projectId - Project ID
     * @param {number} viewerId - Viewer's user ID
     * @param {string} viewerType - 'student' or 'teacher'
     * @returns {Promise} - API response with updated view count
     */
    async recordView(projectId, viewerId, viewerType) {
        try {
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ viewerId, viewerType })
            });
            return await response.json();
        } catch (error) {
            console.error('Record view error:', error);
            return { success: false };
        }
    },
    
    // =====================================================
    // DASHBOARD APIs
    // =====================================================
    
    /**
     * Get dashboard statistics
     * @returns {Promise} - API response with statistics
     */
    async getDashboardStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
            return await response.json();
        } catch (error) {
            console.error('Get dashboard stats error:', error);
            return { success: false, message: 'Failed to fetch dashboard statistics.' };
        }
    },
    
    /**
     * Get recent projects for dashboard
     * @param {number} limit - Number of recent projects
     * @returns {Promise} - API response with recent projects
     */
    async getDashboardRecent(limit = 10) {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/recent?limit=${limit}`);
            return await response.json();
        } catch (error) {
            console.error('Get recent projects error:', error);
            return { success: false, message: 'Failed to fetch recent projects.' };
        }
    },
    
    /**
     * Get projects count by department
     * @returns {Promise} - API response with department statistics
     */
    async getProjectsByDepartment() {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/by-department`);
            return await response.json();
        } catch (error) {
            console.error('Get department stats error:', error);
            return { success: false, message: 'Failed to fetch department statistics.' };
        }
    },
    
    // =====================================================
    // NOTIFICATION APIs
    // =====================================================
    
    /**
     * Create a notification
     */
    async createNotification(notificationData) {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notificationData)
            });
            return await response.json();
        } catch (error) {
            console.error('Create notification error:', error);
            return { success: false, message: 'Failed to create notification.' };
        }
    },

    /**
     * Get notifications for a user
     * @param {number} userId - User ID
     * @param {string} userType - 'student' or 'teacher'
     * @returns {Promise} - API response with notifications
     */
    async getNotifications(userId, userType) {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications?userId=${userId}&userType=${userType}`);
            return await response.json();
        } catch (error) {
            console.error('Get notifications error:', error);
            return { success: false, message: 'Failed to fetch notifications.' };
        }
    },
    
    /**
     * Get unread notification count
     * @param {number} userId - User ID
     * @param {string} userType - 'student' or 'teacher'
     * @returns {Promise} - API response with count
     */
    async getUnreadNotificationCount(userId, userType) {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/count?userId=${userId}&userType=${userType}`);
            return await response.json();
        } catch (error) {
            console.error('Get unread count error:', error);
            return { success: false, message: 'Failed to fetch unread count.' };
        }
    },
    
    /**
     * Mark a notification as read
     * @param {number} notificationId - Notification ID
     * @returns {Promise} - API response
     */
    async markNotificationRead(notificationId) {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
                method: 'PUT'
            });
            return await response.json();
        } catch (error) {
            console.error('Mark notification read error:', error);
            return { success: false, message: 'Failed to mark notification as read.' };
        }
    },
    
    /**
     * Mark all notifications as read
     * @param {number} userId - User ID
     * @param {string} userType - 'student' or 'teacher'
     * @returns {Promise} - API response
     */
    async markAllNotificationsRead(userId, userType) {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userType })
            });
            return await response.json();
        } catch (error) {
            console.error('Mark all read error:', error);
            return { success: false, message: 'Failed to mark all notifications as read.' };
        }
    },
    
    // =====================================================
    // SUPERVISOR ASSIGNMENT APIs
    // =====================================================
    
    /**
     * Get students assigned to a supervisor
     * @param {number} supervisorId - Teacher/Supervisor ID
     * @returns {Promise} - API response with assigned students
     */
    async getAssignedStudents(supervisorId) {
        try {
            const response = await fetch(`${API_BASE_URL}/assignments/by-supervisor?supervisorId=${supervisorId}`);
            return await response.json();
        } catch (error) {
            console.error('Get assigned students error:', error);
            return { success: false, message: 'Failed to fetch assigned students.' };
        }
    },
    
    /**
     * Get unassigned students (not assigned to this supervisor)
     * @param {number} supervisorId - Teacher/Supervisor ID
     * @returns {Promise} - API response with unassigned students
     */
    async getUnassignedStudents(supervisorId) {
        try {
            const response = await fetch(`${API_BASE_URL}/assignments/unassigned?supervisorId=${supervisorId}`);
            return await response.json();
        } catch (error) {
            console.error('Get unassigned students error:', error);
            return { success: false, message: 'Failed to fetch unassigned students.' };
        }
    },
    
    /**
     * Assign a student to the supervisor
     * @param {number} supervisorId - Teacher/Supervisor ID
     * @param {number} studentId - Student ID
     * @returns {Promise} - API response
     */
    async assignStudent(supervisorId, studentId, year, semester) {
        try {
            const response = await fetch(`${API_BASE_URL}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supervisorId, studentId, year: year || null, semester: semester || null })
            });
            return await response.json();
        } catch (error) {
            console.error('Assign student error:', error);
            return { success: false, message: 'Failed to assign student.' };
        }
    },
    
    /**
     * Unassign a student from the supervisor
     * @param {number} supervisorId - Teacher/Supervisor ID
     * @param {number} studentId - Student ID
     * @returns {Promise} - API response
     */
    async unassignStudent(supervisorId, studentId, year, semester) {
        try {
            let url = `${API_BASE_URL}/assignments?supervisorId=${supervisorId}&studentId=${studentId}`;
            if (year) url += `&year=${encodeURIComponent(year)}`;
            if (semester) url += `&semester=${encodeURIComponent(semester)}`;
            const response = await fetch(url, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Unassign student error:', error);
            return { success: false, message: 'Failed to unassign student.' };
        }
    },
    
    /**
     * Get supervisors assigned to a student
     * @param {number} studentId - Student ID
     * @returns {Promise} - API response with supervisors
     */
    async getSupervisorsForStudent(studentId, year, semester) {
        try {
            let url = `${API_BASE_URL}/assignments/by-student?studentId=${studentId}`;
            if (year && semester) {
                url += `&year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}`;
            }
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Get supervisors error:', error);
            return { success: false, message: 'Failed to fetch supervisors.' };
        }
    },

    /**
     * Get all approved supervisors
     * @returns {Promise} - API response with supervisors
     */
    async getApprovedSupervisors() {
        try {
            const response = await fetch(`${API_BASE_URL}/assignments/approved`);
            return await response.json();
        } catch (error) {
            console.error('Get approved supervisors error:', error);
            return { success: false, message: 'Failed to fetch approved supervisors.' };
        }
    },
    
    // =====================================================
    // SESSION MANAGEMENT
    // =====================================================
    
    /**
     * Save user session
     * @param {Object} user - User data
     * @param {string} userType - 'student' or 'teacher'
     */
    saveSession(user, userType) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userType', userType);
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        sessionStorage.setItem('userEmail', user.email);
    },
    
    /**
     * Get current user session
     * @returns {Object|null} - Current user data or null
     */
    getCurrentUser() {
        const userStr = sessionStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    },
    
    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return sessionStorage.getItem('isLoggedIn') === 'true';
    },
    
    /**
     * Get user type
     * @returns {string|null} - 'student' or 'teacher' or null
     */
    getUserType() {
        return sessionStorage.getItem('userType');
    },
    
    /**
     * Logout user
     */
    logout() {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userType');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('userEmail');
    },
    
    /**
     * Update user phone number
     * @param {number} userId - User ID
     * @param {string} userType - 'student' or 'teacher'
     * @param {string} phone - Phone number
     * @returns {Promise} - API response
     */
    async updatePhone(userId, userType, phone) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userType, phone })
            });
            return await response.json();
        } catch (error) {
            console.error('Update phone error:', error);
            return { success: false, message: 'Failed to update phone.' };
        }
    },

    /**
     * Change user password
     * @param {number} userId - User ID
     * @param {string} userType - 'student' or 'teacher'
     * @param {string} oldPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise} - API response
     */
    async changePassword(userId, userType, oldPassword, newPassword) {
        try {
            let idToken = null;
            if (userType === 'student' && typeof firebase !== 'undefined') {
                try {
                    let user = firebase.auth().currentUser;
                    
                    // If Firebase persistence hasn't loaded or was cleared, use the given password to force sign in context
                    if (!user) {
                        const currentUserData = this.getCurrentUser();
                        if (currentUserData && currentUserData.email) {
                            const cred = await firebase.auth().signInWithEmailAndPassword(currentUserData.email, oldPassword);
                            user = cred.user;
                        } else {
                            throw new Error("Unable to identify current user email for Firebase Auth");
                        }
                    } else {
                        const credential = firebase.auth.EmailAuthProvider.credential(user.email, oldPassword);
                        await user.reauthenticateWithCredential(credential);
                    }
                    
                    await user.updatePassword(newPassword);
                    idToken = await user.getIdToken(true);
                } catch (fbErr) {
                    console.error('Firebase password change error:', fbErr);
                    return { success: false, message: fbErr.message || 'Incorrect old password.' };
                }
            }

            const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userType, oldPassword, newPassword, idToken })
            });
            return await response.json();
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, message: 'Failed to change password.' };
        }
    },

    /**
     * Require authentication - redirect to login if not logged in
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '/html/login.html';
            return false;
        }
        return true;
    },

    // =====================================================
    // ADMIN APIs
    // =====================================================

    async adminGetStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/stats`);
            return await response.json();
        } catch (error) {
            console.error('Admin stats error:', error);
            return { success: false, message: 'Failed to fetch stats.' };
        }
    },

    async adminGetStudents(search = '') {
        try {
            const url = search ? `${API_BASE_URL}/admin/students?search=${encodeURIComponent(search)}` : `${API_BASE_URL}/admin/students`;
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Admin get students error:', error);
            return { success: false, message: 'Failed to fetch students.' };
        }
    },

    async adminGetTeachers(search = '') {
        try {
            const url = search ? `${API_BASE_URL}/admin/teachers?search=${encodeURIComponent(search)}` : `${API_BASE_URL}/admin/teachers`;
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Admin get teachers error:', error);
            return { success: false, message: 'Failed to fetch teachers.' };
        }
    },

    async adminGetProjects(search = '') {
        try {
            const url = search ? `${API_BASE_URL}/admin/projects?search=${encodeURIComponent(search)}` : `${API_BASE_URL}/admin/projects`;
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Admin get projects error:', error);
            return { success: false, message: 'Failed to fetch projects.' };
        }
    },

    async adminUpdateStudent(studentId, data) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/students/${studentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('Admin update student error:', error);
            return { success: false, message: 'Failed to update student.' };
        }
    },

    async adminUpdateTeacher(teacherId, data) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/teachers/${teacherId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('Admin update teacher error:', error);
            return { success: false, message: 'Failed to update teacher.' };
        }
    },

    async adminAuthorizeTeacher(teacherId) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/teachers/${teacherId}/authorize`, {
                method: 'PUT'
            });
            return await response.json();
        } catch (error) {
            console.error('Admin authorize error:', error);
            return { success: false, message: 'Failed to authorize.' };
        }
    },

    async adminDeauthorizeTeacher(teacherId) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/teachers/${teacherId}/deauthorize`, {
                method: 'PUT'
            });
            return await response.json();
        } catch (error) {
            console.error('Admin deauthorize error:', error);
            return { success: false, message: 'Failed to revoke authorization.' };
        }
    },

    async adminDeleteStudent(studentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/students/${studentId}`, { method: 'DELETE' });
            return await response.json();
        } catch (error) {
            console.error('Admin delete student error:', error);
            return { success: false, message: 'Failed to delete student.' };
        }
    },

    async adminDeleteTeacher(teacherId) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/teachers/${teacherId}`, { method: 'DELETE' });
            return await response.json();
        } catch (error) {
            console.error('Admin delete teacher error:', error);
            return { success: false, message: 'Failed to delete supervisor.' };
        }
    },

    async adminDeleteProject(projectId) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/projects/${projectId}`, { method: 'DELETE' });
            return await response.json();
        } catch (error) {
            console.error('Admin delete project error:', error);
            return { success: false, message: 'Failed to delete project.' };
        }
    },

    async adminGetAssignments(supervisorId) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/assignments?supervisorId=${supervisorId}`);
            return await response.json();
        } catch (error) {
            console.error('Admin get assignments error:', error);
            return { success: false, message: 'Failed to fetch assignments.' };
        }
    },

    async adminAssignStudent(supervisorId, studentId, year, semester) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supervisorId, studentId, year, semester })
            });
            return await response.json();
        } catch (error) {
            console.error('Admin assign student error:', error);
            return { success: false, message: 'Failed to assign student.' };
        }
    },

    async adminGetAllAssignments() {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/allAssignments`);
            return await response.json();
        } catch (error) {
            console.error('Admin get all assignments error:', error);
            return { success: false, message: 'Failed to load assignments.' };
        }
    },

    async adminDeleteAssignment(assignmentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/assignments/${assignmentId}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Admin delete assignment error:', error);
            return { success: false, message: 'Failed to delete assignment.' };
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TPRSApi;
}
