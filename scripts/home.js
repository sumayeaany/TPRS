let thesesData = [];

// Popular keywords (loaded dynamically)
let keywords = [];


function checkAuth() {
    // Use TPRSApi if available, fallback to sessionStorage
    if (typeof TPRSApi !== 'undefined' && !TPRSApi.isLoggedIn()) {
        window.location.href = '/html/login.html';
        return false;
    } else if (typeof TPRSApi === 'undefined' && sessionStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = '/html/login.html';
        return false;
    }
    return true;
}

// =====================================================
// LOAD DATA FROM BACKEND
// =====================================================
async function loadDataFromBackend() {
    try {
        // Try to get recent projects from backend
        if (typeof TPRSApi !== 'undefined') {
            // Only load approved projects for student dashboard
            const recentResult = await TPRSApi.getProjects({ status: 'approved' });
            if (recentResult.success && recentResult.projects && recentResult.projects.length > 0) {
                // Convert backend data to display format
                thesesData = await Promise.all(recentResult.projects.map(async project => {
                    const resolvedDegree = project.degreeType ? await TPRSApi.getDegreeName(project.degreeType) : 'Bachelor';
                    return {
                        id: project.id,
                        title: project.title,
                        author: project.studentName || project.authorName || 'Unknown',
                        authorInitials: getInitials(project.studentName || project.authorName || 'Unknown'),
                        department: project.department || 'CSE',
                        degree: resolvedDegree,
                        year: project.year || '',
                        semester: project.semester || '',
                        session: project.session || '',
                        description: project.description || '',
                        field: project.type || 'Thesis',
                        keywords: project.keywords || '',
                        views: project.views || 0,
                        bookmarked: false,
                        supervisor: project.supervisorName || project.supervisor || 'N/A',
                        status: project.status || 'approved'
                    };
                }));
            }

            // Get dashboard stats
            let statsLoaded = false;
            try {
                const statsResult = await TPRSApi.getDashboardStats();
                if (statsResult.success && statsResult.stats) {
                    const t = statsResult.stats.totalThesis;
                    const p = statsResult.stats.totalProject;
                    const a = statsResult.stats.totalAuthors;
                    if (t > 0 || p > 0 || a > 0) {
                        document.getElementById('totalThesis').textContent = t || 0;
                        document.getElementById('totalProject').textContent = p || 0;
                        document.getElementById('totalAuthors').textContent = a || 0;
                        statsLoaded = true;
                    }
                }
            } catch (e) {
                console.log('Dashboard stats endpoint failed, computing from loaded data');
            }

            // Fallback: compute stats from loaded project data
            if (!statsLoaded && thesesData.length > 0) {
                const totalThesis = thesesData.filter(t => t.field && t.field.toLowerCase() === 'thesis').length;
                const totalProject = thesesData.filter(t => t.field && t.field.toLowerCase() !== 'thesis').length;
                const totalAuthors = new Set(thesesData.map(t => t.author)).size;
                document.getElementById('totalThesis').textContent = totalThesis;
                document.getElementById('totalProject').textContent = totalProject;
                document.getElementById('totalAuthors').textContent = totalAuthors;
            }

            // Build keywords from loaded project data
            const keywordMap = {};
            thesesData.forEach(item => {
                if (item.keywords) {
                    item.keywords.split(',').forEach(kw => {
                        const trimmed = kw.trim();
                        if (trimmed) {
                            keywordMap[trimmed] = (keywordMap[trimmed] || 0) + 1;
                        }
                    });
                }
            });
            keywords = Object.entries(keywordMap)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // Populate supervisor filter from approved supervisors first, then project data as fallback.
            const supervisorSelect = document.getElementById('supervisorFilter');
            if (supervisorSelect) {
                const supervisorNames = new Set(
                    thesesData
                        .map(t => t.supervisor)
                        .filter(name => name && name !== 'N/A')
                );

                try {
                    const approvedSupervisorsResult = await TPRSApi.getApprovedSupervisors();
                    if (approvedSupervisorsResult.success && Array.isArray(approvedSupervisorsResult.supervisors)) {
                        approvedSupervisorsResult.supervisors.forEach(supervisor => {
                            const fullName = (
                                supervisor.fullName ||
                                `${supervisor.firstName || ''} ${supervisor.lastName || ''}`
                            ).trim();
                            if (fullName) {
                                supervisorNames.add(fullName);
                            }
                        });
                    }
                } catch (e) {
                    console.log('Approved supervisors endpoint unavailable, using project supervisors only');
                }

                // Preserve the default option and rebuild dynamic entries.
                supervisorSelect.innerHTML = '<option value="">All Supervisors</option>';
                Array.from(supervisorNames)
                    .sort((a, b) => a.localeCompare(b))
                    .forEach(name => {
                        const opt = document.createElement('option');
                        opt.value = name;
                        opt.textContent = name;
                        supervisorSelect.appendChild(opt);
                    });
            }
        }
    } catch (error) {
        console.log('Backend not available, using local data');
        // Load from localStorage as fallback
        await loadLocalStorageData();
    }
}

// Load data from localStorage (fallback)
async function loadLocalStorageData() {
    const submissions = JSON.parse(localStorage.getItem('thesisSubmissions') || '[]');
    if (submissions.length > 0) {
        const localTheses = await Promise.all(submissions.map(async (sub, index) => {
            const resolvedDegree = sub.degreeType ? await TPRSApi.getDegreeName(sub.degreeType) : "Bachelor";
            return {
                id: sub.id || (1000 + index),
                title: sub.title,
                author: sub.authorName,
                authorInitials: getInitials(sub.authorName),
                department: sub.department || 'CSE',
                degree: resolvedDegree,
                year: new Date(sub.submittedAt).getFullYear(),
                semester: sub.semester || '',
                session: sub.session || '2024-2025',
                field: sub.type || 'Thesis',
                views: 0,
                bookmarked: false,
                supervisor: sub.supervisor || 'N/A',
                status: sub.status || 'pending'
            };
        }));
        
        // Merge with existing data (recent first)
        thesesData = [...localTheses.reverse(), ...thesesData];
    }
}

// Helper function to get initials
function getInitials(name) {
    if (!name) return 'NA';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// =====================================================
// STATE MANAGEMENT
// =====================================================
let displayedTheses = [...thesesData];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let isBookmarkView = false;
let activeTypeFilter = ''; // '', 'thesis', or 'project'
let isAuthorsView = false;
let filters = {
    sessions: [],
    degrees: [],
    semesters: [],
    years: [],
    author: "",
    supervisor: "",
    keyword: ""
};

// =====================================================
// DOM ELEMENTS
// =====================================================
const thesisListEl = document.getElementById("thesisList");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.querySelector(".search-btn");
const authorFilterInput = document.getElementById("authorFilter");
const supervisorFilterSelect = document.getElementById("supervisorFilter");
const sessionFilterGroup = document.getElementById("sessionFilter");
const degreeFilterGroup = document.getElementById("degreeFilter");
const yearFilterGroup = document.getElementById("yearFilter");
const semesterFilterGroup = document.getElementById("semesterFilter");
const keywordsListEl = document.getElementById("keywordsList");
const totalThesisEl = document.getElementById("totalThesis");
const totalAuthorsEl = document.getElementById("totalAuthors");

// =====================================================
// RENDER FUNCTIONS
// =====================================================

/**
 * Render the thesis list based on current filters and search
 */
function renderThesisList() {
    // Update section title based on view state
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
        if (isBookmarkView) {
            sectionTitle.innerHTML = '<span class="material-icons" style="cursor:pointer;margin-right:0.4rem;vertical-align:middle;color:#e84393;" onclick="exitBookmarkView()">arrow_back</span> Bookmarks';
        } else if (activeTypeFilter === 'thesis') {
            sectionTitle.innerHTML = '<span class="material-icons" style="cursor:pointer;margin-right:0.4rem;vertical-align:middle;color:#2196F3;" onclick="exitTypeFilter()">arrow_back</span> Thesis Filter';
        } else if (activeTypeFilter === 'project') {
            sectionTitle.innerHTML = '<span class="material-icons" style="cursor:pointer;margin-right:0.4rem;vertical-align:middle;color:#ff9800;" onclick="exitTypeFilter()">arrow_back</span> Projects Filter';
        } else {
            sectionTitle.textContent = 'Recent Thesis & Projects';
        }
    }

    // In bookmark view, filter to only bookmarked items
    let listToRender = isBookmarkView 
        ? displayedTheses.filter(t => t.bookmarked)
        : displayedTheses;

    if (listToRender.length === 0) {
        if (isBookmarkView) {
            thesisListEl.innerHTML = '<div class="no-results"><span class="material-icons" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;opacity:0.3;">bookmark_border</span>No bookmarked projects yet. Click the bookmark icon on a project to save it here.</div>';
        } else if (thesesData.length === 0) {
            thesisListEl.innerHTML = '<div class="no-results"><span class="material-icons" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;opacity:0.3;">folder_open</span>No approved projects yet. Projects will appear here once they are approved by a supervisor.</div>';
        } else {
            thesisListEl.innerHTML = '<div class="no-results">No projects found matching your search criteria.</div>';
        }
        return;
    }

    // Sort bookmarked items first (only in non-bookmark view)
    if (!isBookmarkView) {
        listToRender.sort((a, b) => (b.bookmarked ? 1 : 0) - (a.bookmarked ? 1 : 0));
    }

    // Pagination
    const totalPages = Math.ceil(listToRender.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageTheses = listToRender.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    let html = pageTheses.map(thesis => {
        const firstKeyword = thesis.keywords ? thesis.keywords.split(',')[0].trim() : '';
        return `
        <div class="thesis-card" data-thesis-id="${thesis.id}" onclick="openProjectDetail(${thesis.id})" style="cursor:pointer;margin-bottom:1rem;">
            <span class="material-icons thesis-icon">description</span>
            <div class="thesis-content">
                <div class="thesis-title">${thesis.title}</div>
                ${thesis.description ? `<div class="thesis-desc" style="color:#666;font-size:0.85rem;line-height:1.5;margin:0.3rem 0 0.5rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${thesis.description}</div>` : ''}
                <div class="thesis-meta">
                    <div class="author-info">
                        <div class="author-avatar">${thesis.authorInitials}</div>
                        <span>${thesis.author}</span>
                    </div>
                    ${thesis.degree ? `<span class="meta-tag">${thesis.degree}</span>` : ''}
                    ${thesis.session ? `<span class="meta-tag">${thesis.session}</span>` : ''}
                    ${thesis.year ? `<span class="meta-tag">${thesis.year} Year</span>` : ''}
                    ${thesis.semester ? `<span class="meta-tag">${thesis.semester} Semester</span>` : ''}
                    <span class="meta-tag">${thesis.field}</span>
                    ${firstKeyword ? `<span class="meta-tag keyword-tag-meta">${firstKeyword}</span>` : ''}
                </div>
            </div>
            <div class="thesis-actions">
                <div class="views-count">
                    <span class="material-icons" style="font-size: 1rem;">visibility</span>
                    ${thesis.views}
                </div>
                <button class="bookmark-btn ${thesis.bookmarked ? 'active' : ''}" data-thesis-id="${thesis.id}">
                    <span class="material-icons">${thesis.bookmarked ? 'bookmark' : 'bookmark_border'}</span>
                </button>
            </div>
        </div>
    `}).join("");

    // Pagination controls
    if (totalPages > 1) {
        html += '<div class="pagination" style="display:flex;justify-content:center;align-items:center;gap:0.5rem;margin-top:1.5rem;flex-wrap:wrap;">';
        html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} style="padding:0.4rem 0.8rem;border:1px solid #3d3d52;border-radius:6px;background:${currentPage === 1 ? '#323248' : '#2a2a3d'};cursor:${currentPage === 1 ? 'not-allowed' : 'pointer'};font-size:0.85rem;color:#9a9ab0;"><span class="material-icons" style="font-size:1rem;vertical-align:middle;">chevron_left</span></button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (totalPages <= 7 || i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<button class="page-btn" onclick="goToPage(${i})" style="padding:0.4rem 0.8rem;border:1px solid ${i === currentPage ? '#e84393' : '#3d3d52'};border-radius:6px;background:${i === currentPage ? '#e84393' : '#2a2a3d'};color:${i === currentPage ? '#fff' : '#9a9ab0'};cursor:pointer;font-size:0.85rem;font-weight:${i === currentPage ? '600' : '400'};">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                html += '<span style="color:#6b6b80;">…</span>';
            }
        }
        html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} style="padding:0.4rem 0.8rem;border:1px solid #3d3d52;border-radius:6px;background:${currentPage === totalPages ? '#323248' : '#2a2a3d'};cursor:${currentPage === totalPages ? 'not-allowed' : 'pointer'};font-size:0.85rem;color:#9a9ab0;"><span class="material-icons" style="font-size:1rem;vertical-align:middle;">chevron_right</span></button>`;
        html += `<span style="color:#6b6b80;font-size:0.8rem;margin-left:0.5rem;">Page ${currentPage} of ${totalPages}</span>`;
        html += '</div>';
    }

    thesisListEl.innerHTML = html;

    // Add event listeners to bookmark buttons
    document.querySelectorAll(".bookmark-btn").forEach(btn => {
        btn.addEventListener("click", handleBookmarkClick);
    });
}

/**
 * Render the keywords list
 */
function renderKeywords() {
    keywordsListEl.innerHTML = keywords.map((kw, index) => `
        <div class="keyword-item ${filters.keyword === kw.name ? 'active' : ''}" data-keyword="${kw.name}">
            <div class="keyword-label">
                ${kw.name}
            </div>
            <span class="keyword-count">${kw.count}</span>
        </div>
    `).join("");

    // Add event listeners to keyword items
    document.querySelectorAll(".keyword-item").forEach(item => {
        item.addEventListener("click", handleKeywordClick);
    });
}

/**
 * Update statistics on the right sidebar
 */
function updateStats() {
    totalThesisEl.textContent = displayedTheses.length;
    
    // Count unique authors
    const uniqueAuthors = new Set(displayedTheses.map(t => t.author)).size;
    totalAuthorsEl.textContent = uniqueAuthors;
}

// =====================================================
// FILTER FUNCTIONS
// =====================================================

/**
 * Apply all active filters to the thesis data
 */
function applyFilters() {
    displayedTheses = thesesData.filter(thesis => {
        // Type filter (from overview card toggle)
        if (activeTypeFilter) {
            if (activeTypeFilter === 'thesis' && (!thesis.field || thesis.field.toLowerCase() !== 'thesis')) {
                return false;
            }
            if (activeTypeFilter === 'project' && thesis.field && thesis.field.toLowerCase() === 'thesis') {
                return false;
            }
        }

        // Session filter
        if (filters.sessions.length > 0 && !filters.sessions.includes(thesis.session)) {
            return false;
        }

        // Degree filter
        if (filters.degrees.length > 0 && !filters.degrees.includes(thesis.degree)) {
            return false;
        }

        // Year filter
        if (filters.years.length > 0 && !filters.years.includes(thesis.year)) {
            return false;
        }

        // Semester filter
        if (filters.semesters.length > 0 && !filters.semesters.includes(thesis.semester)) {
            return false;
        }

        // Author filter
        if (filters.author && !thesis.author.toLowerCase().includes(filters.author.toLowerCase())) {
            return false;
        }

        // Supervisor filter
        if (filters.supervisor && thesis.supervisor !== filters.supervisor) {
            return false;
        }

        // Search filter
        if (filters.search && !thesis.title.toLowerCase().includes(filters.search.toLowerCase())) {
            return false;
        }

        // Keyword filter
        if (filters.keyword && !(thesis.keywords && thesis.keywords.split(',').map(k => k.trim()).includes(filters.keyword))) {
            return false;
        }

        return true;
    });

    currentPage = 1;
    if (isAuthorsView) {
        renderAuthorsView();
    } else {

        renderThesisList();
    }
    updateOverviewCardStyles();
}

/**
 * Handle session checkbox changes
 */
sessionFilterGroup.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
        const checked = Array.from(sessionFilterGroup.querySelectorAll("input:checked"))
            .map(input => input.value);
        filters.sessions = checked.length > 0 ? checked : [];
        applyFilters();
    }
});

/**
 * Handle degree checkbox changes
 */
degreeFilterGroup.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
        const checked = Array.from(degreeFilterGroup.querySelectorAll("input:checked"))
            .map(input => input.value);
        filters.degrees = checked;
        applyFilters();
    }
});

/**
 * Handle year checkbox changes
 */
if (yearFilterGroup) {
    yearFilterGroup.addEventListener("change", (e) => {
        if (e.target.type === "checkbox") {
            const checked = Array.from(yearFilterGroup.querySelectorAll("input:checked"))
                .map(input => input.value);
            filters.years = checked;
            applyFilters();
        }
    });
}

/**
 * Handle semester checkbox changes
 */
if (semesterFilterGroup) {
    semesterFilterGroup.addEventListener("change", (e) => {
        if (e.target.type === "checkbox") {
            const checked = Array.from(semesterFilterGroup.querySelectorAll("input:checked"))
                .map(input => input.value);
            filters.semesters = checked;
            applyFilters();
        }
    });
}

/**
 * Handle author filter input
 */
authorFilterInput.addEventListener("input", (e) => {
    filters.author = e.target.value;
    applyFilters();
});

/**
 * Handle supervisor dropdown change
 */
supervisorFilterSelect.addEventListener("change", (e) => {
    filters.supervisor = e.target.value;
    applyFilters();
});

/**
 * Handle search input
 */
searchInput.addEventListener("input", (e) => {
    filters.search = e.target.value;
    applyFilters();
});

/**
 * Handle search button click
 */
searchBtn.addEventListener("click", () => {
    applyFilters();
});

/**
 * Handle Enter key in search input
 */
searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        applyFilters();
    }
});

// =====================================================
// INTERACTION FUNCTIONS
// =====================================================

/**
 * Handle bookmark button clicks
 */
function handleBookmarkClick(e) {
    e.stopPropagation();
    const thesisId = parseInt(e.currentTarget.dataset.thesisId);
    const thesis = thesesData.find(t => t.id === thesisId);
    
    if (thesis) {
        thesis.bookmarked = !thesis.bookmarked;

        renderThesisList();
    }
}

/**
 * Enter bookmark view - show only bookmarked projects
 */
function enterBookmarkView() {
    isBookmarkView = true;
    currentPage = 1;

    renderThesisList();
}

/**
 * Exit bookmark view - return to normal view
 */
function exitBookmarkView() {
    isBookmarkView = false;
    currentPage = 1;

    renderThesisList();
}

// =====================================================
// OVERVIEW CARD TOGGLE FILTERS
// =====================================================

/**
 * Setup click handlers on overview stat cards for toggle filtering
 */
function setupOverviewCardToggles() {
    const thesisCard = document.querySelector('.overview-card.thesis');
    const projectCard = document.querySelector('.overview-card.project');
    const authorsCard = document.querySelector('.overview-card.authors');

    if (thesisCard) {
        thesisCard.style.cursor = 'pointer';
        thesisCard.addEventListener('click', () => {
            isAuthorsView = false;
            if (activeTypeFilter === 'thesis') {
                activeTypeFilter = '';
            } else {
                activeTypeFilter = 'thesis';
            }
            applyFilters();
        });
    }

    if (projectCard) {
        projectCard.style.cursor = 'pointer';
        projectCard.addEventListener('click', () => {
            isAuthorsView = false;
            if (activeTypeFilter === 'project') {
                activeTypeFilter = '';
            } else {
                activeTypeFilter = 'project';
            }
            applyFilters();
        });
    }

    if (authorsCard) {
        authorsCard.style.cursor = 'pointer';
        authorsCard.addEventListener('click', () => {
            activeTypeFilter = '';
            isAuthorsView = !isAuthorsView;
            if (isAuthorsView) {
                applyFilters();
            } else {
                applyFilters();
            }
        });
    }

    updateOverviewCardStyles();
}

/**
 * Update active/inactive styles on overview cards
 */
function updateOverviewCardStyles() {
    const thesisCard = document.querySelector('.overview-card.thesis');
    const projectCard = document.querySelector('.overview-card.project');
    const authorsCard = document.querySelector('.overview-card.authors');

    [thesisCard, projectCard, authorsCard].forEach(c => {
        if (c) { c.style.outline = 'none'; c.style.opacity = '1'; }
    });

    if (activeTypeFilter === 'thesis' && thesisCard) {
        thesisCard.style.outline = '2.5px solid #e84393';
        if (projectCard) projectCard.style.opacity = '0.5';
        if (authorsCard) authorsCard.style.opacity = '0.5';
    } else if (activeTypeFilter === 'project' && projectCard) {
        projectCard.style.outline = '2.5px solid #fd79a8';
        if (thesisCard) thesisCard.style.opacity = '0.5';
        if (authorsCard) authorsCard.style.opacity = '0.5';
    } else if (isAuthorsView && authorsCard) {
        authorsCard.style.outline = '2.5px solid #48bb78';
        if (thesisCard) thesisCard.style.opacity = '0.5';
        if (projectCard) projectCard.style.opacity = '0.5';
    }
}

/**
 * Render authors as cards when Authors toggle is active
 */
function renderAuthorsView() {
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
        sectionTitle.innerHTML = '<span class="material-icons" style="cursor:pointer;margin-right:0.4rem;vertical-align:middle;color:#48bb78;" onclick="exitAuthorsView()">arrow_back</span> Authors';
    }

    // Build author data from displayedTheses
    const authorMap = {};
    displayedTheses.forEach(t => {
        const name = t.author || 'Unknown';
        if (!authorMap[name]) {
            authorMap[name] = {
                name: name,
                initials: t.authorInitials || getInitials(name),
                department: t.department || '',
                projectCount: 0,
                thesisCount: 0,
                projects: []
            };
        }
        authorMap[name].projects.push(t);
        if (t.field && t.field.toLowerCase() === 'thesis') {
            authorMap[name].thesisCount++;
        } else {
            authorMap[name].projectCount++;
        }
    });

    const authors = Object.values(authorMap).sort((a, b) => b.projects.length - a.projects.length);

    if (authors.length === 0) {
        thesisListEl.innerHTML = '<div class="no-results"><span class="material-icons" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;opacity:0.3;">people</span>No authors found.</div>';
        return;
    }

    const html = authors.map(author => `
        <div class="author-card" onclick="openAuthorDetailModal('${author.name.replace(/'/g, "\\'")}')" style="cursor:pointer;background:#2a2a3d;border-radius:14px;padding:1.2rem 1.4rem;box-shadow:0 2px 12px rgba(0,0,0,0.2);margin-bottom:1rem;display:flex;align-items:center;gap:1rem;transition:transform 0.2s,box-shadow 0.2s;border:1px solid #3d3d52;">
            <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;flex-shrink:0;">${author.initials}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:1rem;color:#e2e2ea;">${author.name}</div>
                <div style="font-size:0.82rem;color:#9a9ab0;margin-top:0.2rem;">${author.department ? author.department + ' Department' : ''}</div>
                <div style="display:flex;gap:0.8rem;margin-top:0.4rem;flex-wrap:wrap;">
                    ${author.thesisCount > 0 ? `<span style="font-size:0.75rem;background:rgba(232,67,147,0.15);color:#e84393;padding:0.15rem 0.6rem;border-radius:12px;font-weight:600;">${author.thesisCount} Thesis</span>` : ''}
                    ${author.projectCount > 0 ? `<span style="font-size:0.75rem;background:rgba(253,121,168,0.15);color:#fd79a8;padding:0.15rem 0.6rem;border-radius:12px;font-weight:600;">${author.projectCount} Project${author.projectCount > 1 ? 's' : ''}</span>` : ''}
                </div>
            </div>
            <span class="material-icons" style="color:#6b6b80;font-size:1.3rem;">chevron_right</span>
        </div>
    `).join('');

    thesisListEl.innerHTML = html;
}

/**
 * Exit authors view
 */
function exitAuthorsView() {
    isAuthorsView = false;
    updateOverviewCardStyles();
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) sectionTitle.textContent = 'Recent Thesis & Projects';

    renderThesisList();
}

/**
 * Open author detail modal showing author info and their projects
 */
function openAuthorDetailModal(authorName) {
    const authorProjects = displayedTheses.filter(t => t.author === authorName);
    if (authorProjects.length === 0) return;

    const first = authorProjects[0];
    const initials = first.authorInitials || getInitials(authorName);
    const department = first.department || 'N/A';
    const thesisCount = authorProjects.filter(p => p.field && p.field.toLowerCase() === 'thesis').length;
    const projectCount = authorProjects.length - thesisCount;

    let projectsHtml = authorProjects.map(p => {
        const typeColor = (p.field && p.field.toLowerCase() === 'thesis') ? '#e84393' : '#fd79a8';
        const typeBg = (p.field && p.field.toLowerCase() === 'thesis') ? 'rgba(232,67,147,0.15)' : 'rgba(253,121,168,0.15)';
        return `<div onclick="closeAuthorDetailModal(); openProjectDetail(${p.id})" style="padding:0.7rem 0;border-bottom:1px solid #3d3d52;cursor:pointer;display:flex;align-items:center;gap:0.7rem;">
            <span class="material-icons" style="color:#e84393;font-size:1.1rem;">description</span>
            <div style="flex:1;min-width:0;">
                <div style="font-size:0.88rem;font-weight:500;color:#e2e2ea;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.title}</div>
                <div style="display:flex;gap:0.5rem;margin-top:0.2rem;align-items:center;">
                    <span style="font-size:0.7rem;background:${typeBg};color:${typeColor};padding:0.1rem 0.5rem;border-radius:10px;font-weight:600;">${p.field || 'Project'}</span>
                    ${p.session ? `<span style="font-size:0.7rem;color:#6b6b80;">${p.session}</span>` : ''}
                </div>
            </div>
            <span class="material-icons" style="color:#6b6b80;font-size:1rem;">open_in_new</span>
        </div>`;
    }).join('');

    // Create/show the modal
    let modal = document.getElementById('authorDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'authorDetailModal';
        modal.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);z-index:10001;align-items:center;justify-content:center;';
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) { if (e.target === this) closeAuthorDetailModal(); });
    }

    modal.innerHTML = `
        <div style="background:#2a2a3d;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.4);max-width:520px;width:95%;max-height:85vh;overflow-y:auto;animation:spModalIn 0.25s ease;border:1px solid #3d3d52;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.5rem;border-bottom:1px solid #3d3d52;">
                <h2 style="font-size:1.05rem;font-weight:700;color:#e2e2ea;margin:0;">Author Details</h2>
                <button onclick="closeAuthorDetailModal()" style="background:none;border:none;cursor:pointer;color:#9a9ab0;padding:4px;border-radius:50%;"><span class="material-icons">close</span></button>
            </div>
            <div style="padding:1.5rem;text-align:center;">
                <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.3rem;margin:0 auto 0.7rem;">${initials}</div>
                <div style="font-size:1.15rem;font-weight:700;color:#e2e2ea;">${authorName}</div>
                <div style="font-size:0.85rem;color:#9a9ab0;margin-top:0.2rem;">${department} Department</div>
                <div style="display:flex;gap:0.8rem;justify-content:center;margin-top:0.7rem;">
                    ${thesisCount > 0 ? `<span style="font-size:0.78rem;background:rgba(232,67,147,0.15);color:#e84393;padding:0.2rem 0.8rem;border-radius:12px;font-weight:600;">${thesisCount} Thesis</span>` : ''}
                    ${projectCount > 0 ? `<span style="font-size:0.78rem;background:rgba(253,121,168,0.15);color:#fd79a8;padding:0.2rem 0.8rem;border-radius:12px;font-weight:600;">${projectCount} Project${projectCount > 1 ? 's' : ''}</span>` : ''}
                </div>
            </div>
            <div style="padding:0 1.5rem 1.5rem;">
                <div style="font-size:0.82rem;font-weight:600;color:#9a9ab0;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem;">Works</div>
                ${projectsHtml}
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeAuthorDetailModal() {
    const modal = document.getElementById('authorDetailModal');
    if (modal) modal.style.display = 'none';
}

function handleKeywordClick(e) {
    const keyword = e.currentTarget.dataset.keyword;
    
    // Toggle keyword filter
    if (filters.keyword === keyword) {
        filters.keyword = "";
    } else {
        filters.keyword = keyword;
    }
    
    applyFilters();
    renderKeywords();
}

/**
 * Navigate to a specific page
 */
function goToPage(page) {
    const totalPages = Math.ceil(displayedTheses.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;

    renderThesisList();
    // Scroll to top of thesis list
    const thesisList = document.getElementById('thesisList');
    if (thesisList) thesisList.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Handle profile dropdown menu
 */
function setupProfileDropdown() {
    const userProfile = document.getElementById("userProfile");
    const profileDropdown = document.getElementById("profileDropdown");
    
    if (!userProfile || !profileDropdown) return;
    
    // Update profile display with current user data
    updateProfileDisplay();
    
    // Toggle dropdown on profile click
    userProfile.addEventListener("click", (e) => {
        e.stopPropagation();
        userProfile.classList.toggle("active");
    });
    
    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!userProfile.contains(e.target)) {
            userProfile.classList.remove("active");
        }
    });
    
    // Handle dropdown item clicks
    const dropdownItems = profileDropdown.querySelectorAll(".dropdown-item");
    dropdownItems.forEach(item => {
        item.addEventListener("click", (e) => {
            // Only close dropdown for non-button items (links)
            if (item.tagName !== "BUTTON") {
                setTimeout(() => {
                    userProfile.classList.remove("active");
                }, 100);
            }
        });
    });
    
    // Handle logout button
    const logoutBtn = profileDropdown.querySelector(".logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            // Use TPRSApi if available
            if (typeof TPRSApi !== 'undefined') {
                TPRSApi.logout();
            } else {
                sessionStorage.removeItem('isLoggedIn');
                sessionStorage.removeItem('userEmail');
                sessionStorage.removeItem('currentUser');
            }
            window.location.href = '/html/login.html';
        });
    }
}

/**
 * Update profile display with current user data
 */
function updateProfileDisplay() {
    let currentUser = null;
    
    // Get current user from TPRSApi or sessionStorage
    if (typeof TPRSApi !== 'undefined') {
        currentUser = TPRSApi.getCurrentUser();
    }
    if (!currentUser) {
        currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    }
    
    if (currentUser) {
        const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'User';
        const initials = getInitials(fullName);
        const email = currentUser.email || '';
        const department = currentUser.department || 'N/A';
        const userType = typeof TPRSApi !== 'undefined' ? TPRSApi.getUserType() : 'student';
        
        // Update header profile
        const userAvatar = document.querySelector('.user-avatar');
        const userName = document.querySelector('.user-name');
        if (userAvatar) userAvatar.textContent = initials;
        if (userName) userName.textContent = fullName;
        
        // Update dropdown profile
        const dropdownAvatar = document.querySelector('.dropdown-avatar');
        const dropdownName = document.querySelector('.dropdown-name');
        const dropdownEmail = document.querySelector('.dropdown-email');
        const dropdownDept = document.querySelector('.dropdown-dept');
        const dropdownStudentId = document.querySelector('.dropdown-student-id');
        
        if (dropdownAvatar) dropdownAvatar.textContent = initials;
        if (dropdownName) dropdownName.textContent = fullName;
        if (dropdownEmail) dropdownEmail.textContent = email;

        if (userType === 'teacher') {
            // For teachers: show email + designation only
            const deptItem = dropdownDept ? dropdownDept.closest('.dropdown-detail-item') : null;
            if (deptItem) deptItem.style.display = 'none';
            if (dropdownStudentId) dropdownStudentId.textContent = currentUser.designation || 'Supervisor';
            // Change badge icon to work icon for teachers
            const badgeIcon = dropdownStudentId ? dropdownStudentId.closest('.dropdown-detail-item') : null;
            if (badgeIcon) {
                const icon = badgeIcon.querySelector('.material-icons');
                if (icon) icon.textContent = 'work';
            }
        } else {
            if (dropdownDept) dropdownDept.textContent = department + ' Department';
            if (dropdownStudentId) dropdownStudentId.textContent = currentUser.studentId || currentUser.id || 'N/A';
        }
    }
}

/**
 * Extract keywords from text
 */
function extractKeywords(text) {
    // Remove special characters and split into words
    const words = text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0);
    
    return words;
}

/**
 * Build enhanced search index with keywords
 */
function buildSearchIndex() {
    return thesesData.map(thesis => ({
        id: thesis.id,
        title: thesis.title,
        author: thesis.author,
        field: thesis.field,
        type: "Thesis",
        keywords: extractKeywords(thesis.title),
        fieldKeywords: extractKeywords(thesis.field),
        allKeywords: [
            ...extractKeywords(thesis.title),
            ...extractKeywords(thesis.field),
            ...extractKeywords(thesis.author)
        ]
    }));
}

/**
 * Calculate relevance score for keyword-based matching
 */
function calculateKeywordRelevance(queryKeywords, item) {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const fieldLower = item.field.toLowerCase();
    
    // Score based on keyword matches
    let exactKeywordMatches = 0;
    let partialKeywordMatches = 0;
    let fieldKeywordMatches = 0;
    
    queryKeywords.forEach(queryKeyword => {
        // Exact keyword match in title
        if (item.keywords.includes(queryKeyword)) {
            exactKeywordMatches++;
            score += 300;
        }
        // Partial keyword match in title (keyword contains query or query contains keyword)
        else if (item.keywords.some(kw => 
            kw.includes(queryKeyword) || queryKeyword.includes(kw)
        )) {
            partialKeywordMatches++;
            score += 150;
        }
        
        // Field keyword match
        if (item.fieldKeywords.includes(queryKeyword)) {
            fieldKeywordMatches++;
            score += 100;
        }
        // Partial field match
        else if (item.fieldKeywords.some(kw => 
            kw.includes(queryKeyword) || queryKeyword.includes(kw)
        )) {
            score += 50;
        }
        
        // Substring match in title
        if (titleLower.includes(queryKeyword)) {
            score += 80;
        }
    });
    
    // Bonus for matching all keywords
    if (queryKeywords.length > 0 && exactKeywordMatches === queryKeywords.length) {
        score += 500;
    }
    
    // Bonus for matching most keywords
    const keywordCoverageRatio = (exactKeywordMatches + partialKeywordMatches) / queryKeywords.length;
    if (keywordCoverageRatio >= 0.7) {
        score += 200;
    }
    
    return score;
}

/**
 * Get autocomplete suggestions based on keyword search
 */
function getKeywordSuggestions(query) {
    if (!query.trim()) {
        return [];
    }
    
    const queryKeywords = extractKeywords(query);
    
    if (queryKeywords.length === 0) {
        return [];
    }
    
    const searchIndex = buildSearchIndex();
    const scored = searchIndex
        .map(item => ({
            ...item,
            relevance: calculateKeywordRelevance(queryKeywords, item)
        }))
        .filter(item => item.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10); // Limit to 10 suggestions
    
    return scored;
}

/**
 * Calculate relevance score for autocomplete matching
 */
function calculateRelevance(query, title, field) {
    const lowerQuery = query.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const lowerField = field.toLowerCase();
    
    let score = 0;
    
    // Exact match in title
    if (lowerTitle === lowerQuery) {
        score += 1000;
    }
    // Title starts with query
    else if (lowerTitle.startsWith(lowerQuery)) {
        score += 500;
    }
    // Query is a complete word in title
    else if (lowerTitle.includes(" " + lowerQuery)) {
        score += 300;
    }
    // Partial match in title
    else if (lowerTitle.includes(lowerQuery)) {
        score += 200;
    }
    
    // Match in field/keywords
    if (lowerField.includes(lowerQuery)) {
        score += 100;
    }
    
    // Match by word relevance (e.g., "management system" matches "Waste Management System")
    const queryWords = lowerQuery.split(" ");
    const titleWords = lowerTitle.split(" ");
    const matchingWords = queryWords.filter(word => 
        titleWords.some(titleWord => titleWord.includes(word))
    );
    score += matchingWords.length * 50;
    
    return score;
}

/**
 * Render autocomplete suggestions
 */
function renderAutocompleteSuggestions(suggestions, query) {
    const suggestionsList = document.getElementById("suggestionsList");
    
    if (suggestions.length === 0) {
        suggestionsList.innerHTML = `
            <div class="suggestion-item no-results">
                <span class="material-icons" style="font-size: 1.2rem;">search_off</span>
                <span>No results found for "${query}"</span>
            </div>
        `;
        return;
    }
    
    // Group suggestions by relevance tier
    const highRelevance = suggestions.filter(s => s.relevance >= 500);
    const mediumRelevance = suggestions.filter(s => s.relevance >= 200 && s.relevance < 500);
    const lowRelevance = suggestions.filter(s => s.relevance < 200);
    
    let html = "";
    
    // High relevance section
    if (highRelevance.length > 0) {
        highRelevance.forEach(suggestion => {
            html += `
                <div class="suggestion-item" data-search-id="${suggestion.id}" data-search-title="${suggestion.title}">
                    <span class="material-icons suggestion-icon">star</span>
                    <div class="suggestion-text">
                        <div class="suggestion-title">${highlightQuery(suggestion.title, query)}</div>
                        <div class="suggestion-meta">${suggestion.author} • ${suggestion.field}</div>
                    </div>
                    <span class="suggestion-match-badge">Best Match</span>
                </div>
            `;
        });
    }
    
    // Medium relevance section
    if (mediumRelevance.length > 0) {
        mediumRelevance.forEach(suggestion => {
            html += `
                <div class="suggestion-item" data-search-id="${suggestion.id}" data-search-title="${suggestion.title}">
                    <span class="material-icons suggestion-icon">description</span>
                    <div class="suggestion-text">
                        <div class="suggestion-title">${highlightQuery(suggestion.title, query)}</div>
                        <div class="suggestion-meta">${suggestion.author} • ${suggestion.field}</div>
                    </div>
                </div>
            `;
        });
    }
    
    // Low relevance section
    if (lowRelevance.length > 0) {
        lowRelevance.forEach(suggestion => {
            html += `
                <div class="suggestion-item" data-search-id="${suggestion.id}" data-search-title="${suggestion.title}">
                    <span class="material-icons suggestion-icon">find_in_page</span>
                    <div class="suggestion-text">
                        <div class="suggestion-title">${highlightQuery(suggestion.title, query)}</div>
                        <div class="suggestion-meta">${suggestion.author} • ${suggestion.field}</div>
                    </div>
                </div>
            `;
        });
    }
    
    suggestionsList.innerHTML = html;
    
    // Add click handlers to suggestions
    document.querySelectorAll(".suggestion-item:not(.no-results)").forEach(item => {
        item.addEventListener("click", handleSuggestionClick);
    });
}

/**
 * Highlight matching query in suggestion text
 */
function highlightQuery(text, query) {
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, "<strong style='color: #e84393;'>$1</strong>");
}

/**
 * Handle suggestion click
 */
function handleSuggestionClick(e) {
    const title = e.currentTarget.dataset.searchTitle;
    searchInput.value = title;
    
    // Trigger search
    filters.search = title;
    applyFilters();
    
    // Clear suggestions by blurring the input
    setTimeout(() => {
        searchInput.blur();
    }, 100);
}

/**
 * Setup autocomplete search functionality
 */
function setupAutocompletSearch() {
    const searchInput = document.getElementById("searchInput");
    
    if (!searchInput) return;
    
    // Handle input event for real-time suggestions
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        
        if (query.length === 0) {
            const suggestionsList = document.getElementById("suggestionsList");
            suggestionsList.innerHTML = "";
            return;
        }
        
        // Use keyword-based search for better results
        if (query.length >= 2) {
            const suggestions = getKeywordSuggestions(query);
            renderAutocompleteSuggestions(suggestions, query);
        }
    });
    
    // Handle Enter key press
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            filters.search = searchInput.value;
            applyFilters();
            searchInput.blur();
        }
    });
    
    // Clear suggestions when focus is lost
    searchInput.addEventListener("blur", () => {
        setTimeout(() => {
            document.getElementById("suggestionsList").innerHTML = "";
        }, 150);
    });
}

// =====================================================
// INITIALIZATION
// =====================================================

/**
 * Initialize the application
 */
async function loadDynamicSettings() {
    try {
        const settings = await TPRSApi.getSettings();
        const sessionFilter = document.getElementById('sessionFilter');
        if (sessionFilter && settings.sessions) {
            sessionFilter.innerHTML = '';
            settings.sessions.forEach(sess => {
                const div = document.createElement('div');
                div.className = 'checkbox-item';
                div.innerHTML = `
                    <input type="checkbox" id="session${sess.replace(/[\\W_]+/g, '')}" value="${sess}">
                    <label for="session${sess.replace(/[\\W_]+/g, '')}">${sess}</label>
                `;
                sessionFilter.appendChild(div);
            });
            const olderDiv = document.createElement('div');
            olderDiv.className = 'checkbox-item';
            olderDiv.innerHTML = `
                <input type="checkbox" id="sessionOlder" value="Older">
                <label for="sessionOlder">Older</label>
            `;
            sessionFilter.appendChild(olderDiv);
        }
        const degreeFilter = document.getElementById('degreeFilter');
        if (degreeFilter && settings.degreeTypes) {
            degreeFilter.innerHTML = '';
            settings.degreeTypes.forEach(deg => {
                const div = document.createElement('div');
                div.className = 'checkbox-item';
                div.innerHTML = `
                    <input type="checkbox" id="degree${deg.id}" value="${deg.name}">
                    <label for="degree${deg.id}">${deg.name}</label>
                `;
                degreeFilter.appendChild(div);
            });
        }
    } catch(e) {
        console.error("Failed to load settings ui", e);
    }
}
async function init() {
    await loadDynamicSettings();

    // Check if user is authenticated
    if (!checkAuth()) {
        return;
    }
    
    // Setup profile immediately (don't wait for backend)
    setupProfileDropdown();
    
    // Load data from backend (with localStorage fallback)
    await loadDataFromBackend();
    
    // Update displayedTheses after data is loaded
    displayedTheses = [...thesesData];
    
    // Render UI components

    renderThesisList();
    renderKeywords();
    setupAutocompletSearch();
    setupOverviewCardToggles();

    // Clear search input to prevent browser autofill (Chrome ignores autocomplete="off")
    const searchEl = document.getElementById('searchInput');
    if (searchEl) {
        searchEl.value = '';
        // Browsers sometimes autofill after DOMContentLoaded, so clear again after a short delay
        setTimeout(() => { searchEl.value = ''; }, 100);
    }

    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = "smooth";
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

function exitTypeFilter() {
    activeTypeFilter = '';
    applyFilters();
}


// --- Extracted from /html/home.html ---
// Adjust nav and visibility for supervisor (teacher) users
        (function() {
            const userType = TPRSApi.getUserType();
            if (userType === 'teacher') {
                // Change Dashboard link to point to supervisor dashboard
                const navLinks = document.querySelectorAll('header nav a');
                navLinks.forEach(link => {
                    if (link.getAttribute('href') === '/html/home.html') {
                        link.setAttribute('href', '/html/supervisor-dashboard.html');
                    }
                });
                // Hide Project Submission link
                navLinks.forEach(link => {
                    if (link.getAttribute('href') === '/html/upload.html') {
                        link.style.display = 'none';
                    }
                });
                // Add Browse Projects link if not present
                const nav = document.querySelector('header nav');
                const browseLink = document.createElement('a');
                browseLink.href = '/html/home.html';
                browseLink.innerHTML = '<span class="material-icons">folder_special</span> Browse Projects';
                browseLink.style.color = '#fff';
                nav.appendChild(browseLink);
                // Hide notification bell
                const bell = document.getElementById('notifBell');
                if (bell) bell.style.display = 'none';
            }
        })();
        // Load student notifications badge (only for students)
        if (TPRSApi.isLoggedIn() && TPRSApi.getUserType() === 'student') {
            (async function() {
                const user = TPRSApi.getCurrentUser();
                if (!user) return;
                try {
                    const result = await TPRSApi.getUnreadNotificationCount(user.id, 'student');
                    const badge = document.getElementById('bellBadge');
                    if (result.success && result.unreadCount > 0) {
                        badge.textContent = result.unreadCount > 9 ? '9+' : result.unreadCount;
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                } catch(e) { /* ignore */ }
            })();
        }

        // Student notification dropdown toggle
        function toggleStudentNotifDropdown(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('studentNotifDropdown');
            if (dropdown.style.display === 'none' || !dropdown.style.display) {
                dropdown.style.display = 'block';
                loadStudentNotifications();
            } else {
                dropdown.style.display = 'none';
            }
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('studentNotifDropdown');
            const bell = document.getElementById('notifBell');
            if (dropdown && !bell.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Load student notifications
        async function loadStudentNotifications() {
            const user = TPRSApi.getCurrentUser();
            if (!user) return;
            const container = document.getElementById('studentNotifList');
            container.innerHTML = '<div style="text-align:center;padding:2rem;color:#6b6b80;">Loading...</div>';
            try {
                const result = await TPRSApi.getNotifications(user.id, 'student');
                if (!result.success || !result.notifications || result.notifications.length === 0) {
                    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#6b6b80;"><span class="material-icons" style="font-size:2rem;display:block;margin-bottom:0.5rem;color:#4d4d60;">notifications_none</span>No notifications yet</div>';
                    return;
                }
                container.innerHTML = result.notifications.map(n => {
                    const timeAgo = formatNotifTime(n.createdAt);
                    const iconName = n.type === 'project_approved' ? 'check_circle' : n.type === 'project_rejected' ? 'cancel' : n.type === 'assignment' ? 'person_add' : 'info';
                    const iconColor = n.type === 'project_approved' ? '#4caf50' : n.type === 'project_rejected' ? '#f44336' : n.type === 'assignment' ? '#d63d86' : '#ff9800';
                    return '<div onclick="markStudentNotifRead(' + n.id + ')" style="padding:0.8rem 1.2rem;cursor:pointer;border-bottom:1px solid #585876;' + (n.isRead ? '' : 'background:rgba(232,67,147,0.08);') + 'display:flex;gap:0.7rem;align-items:flex-start;">' +
                        '<span class="material-icons" style="font-size:1.3rem;color:' + iconColor + ';margin-top:2px;">' + iconName + '</span>' +
                        '<div style="flex:1;min-width:0;">' +
                        '<div style="font-weight:' + (n.isRead ? '400' : '600') + ';color:#e2e2ea;font-size:0.85rem;">' + escapeNotifHtml(n.title) + '</div>' +
                        '<div style="color:#b5b5cc;font-size:0.78rem;margin-top:2px;">' + escapeNotifHtml(n.message) + '</div>' +
                        '<div style="color:#6b6b80;font-size:0.7rem;margin-top:4px;">' + timeAgo + '</div>' +
                        '</div></div>';
                }).join('');
            } catch(e) {
                container.innerHTML = '<div style="text-align:center;padding:2rem;color:#6b6b80;">Failed to load notifications</div>';
            }
        }

        async function markStudentNotifRead(notifId) {
            const user = TPRSApi.getCurrentUser();
            await TPRSApi.markNotificationRead(notifId);
            // Refresh badge and list
            const result = await TPRSApi.getUnreadNotificationCount(user.id, 'student');
            const badge = document.getElementById('bellBadge');
            if (result.success && result.unreadCount > 0) {
                badge.textContent = result.unreadCount > 9 ? '9+' : result.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
            loadStudentNotifications();
        }

        async function markAllStudentNotifsRead(e) {
            e.stopPropagation();
            const user = TPRSApi.getCurrentUser();
            if (!user) return;
            await TPRSApi.markAllNotificationsRead(user.id, 'student');
            document.getElementById('bellBadge').style.display = 'none';
            loadStudentNotifications();
        }

        function formatNotifTime(dateStr) {
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

        function escapeNotifHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // ===== Profile Modal (role-aware) =====
        function openProfileModalForUser(e) {
            if (e) e.preventDefault();
            const userType = TPRSApi.getUserType();
            if (userType === 'teacher') {
                openTeacherProfileModal();
            } else {
                openStudentProfileModal(e);
            }
        }

        function openTeacherProfileModal() {
            const user = TPRSApi.getCurrentUser();
            if (user) {
                const fullName = (user.firstName || '') + ' ' + (user.lastName || '');
                const initials = fullName.trim().split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase() || '?';
                document.getElementById('spAvatar').textContent = initials;
                document.getElementById('spName').textContent = fullName.trim() || 'Supervisor';
                document.getElementById('spRole').textContent = 'Supervisor';
                document.getElementById('spEmail').textContent = user.email || '—';
                // Hide Teacher ID row for teachers
                document.getElementById('spIdRow').style.display = 'none';
                document.getElementById('spDept').textContent = user.department ? user.department + ' Department' : '—';
                document.getElementById('spPhone').textContent = user.phone || '—';
                // Show teacher-specific fields
                const desigRow = document.getElementById('spDesignationRow');
                const specRow = document.getElementById('spSpecializationRow');
                if (desigRow) { desigRow.style.display = ''; document.getElementById('spDesignation').textContent = user.designation || '—'; }
                if (specRow) { specRow.style.display = ''; document.getElementById('spSpecialization').textContent = user.specialization || '—'; }
            }
            document.getElementById('studentProfileModal').classList.add('active');
            const userProfile = document.getElementById('userProfile');
            if (userProfile) userProfile.classList.remove('active');
        }

        async function openStudentProfileModal(e) {
            if (e) e.preventDefault();
            const user = TPRSApi.getCurrentUser();
            if (user) {
                const fullName = (user.firstName || '') + ' ' + (user.lastName || '');
                const initials = fullName.trim().split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase() || '?';
                document.getElementById('spAvatar').textContent = initials;
                document.getElementById('spName').textContent = fullName.trim() || 'Student';
                document.getElementById('spRole').textContent = 'Student';
                document.getElementById('spEmail').textContent = user.email || '—';
                document.getElementById('spIdLabel').textContent = 'Student ID';
                document.getElementById('spIdRow').style.display = '';
                document.getElementById('spStudentId').textContent = user.studentId || user.id || '—';
                document.getElementById('spDept').textContent = user.department ? user.department + ' Department' : '—';

                // Display degree securely
                const spDegreeRow = document.getElementById('spDegreeRow');
                const spDegree = document.getElementById('spDegree');
                if (spDegreeRow && spDegree) {
                    const degreeVal = user.semester || user.degreeType;
                    if (degreeVal) {
                        spDegreeRow.style.display = '';
                        spDegree.textContent = await TPRSApi.getDegreeName(degreeVal);
                    } else {
                        spDegreeRow.style.display = 'none';
                    }
                }

                document.getElementById('spPhone').textContent = user.phone || '—';
                // Hide teacher-specific fields
                var desigRow = document.getElementById('spDesignationRow');
                var specRow = document.getElementById('spSpecializationRow');
                if (desigRow) desigRow.style.display = 'none';
                if (specRow) specRow.style.display = 'none';
            }
            document.getElementById('studentProfileModal').classList.add('active');
            // Close the dropdown
            const userProfile = document.getElementById('userProfile');
            if (userProfile) userProfile.classList.remove('active');
        }
        function closeStudentProfileModal() {
            document.getElementById('studentProfileModal').classList.remove('active');
            cancelStudentPhoneEdit();
        }

        function editStudentPhone() {
            const user = TPRSApi.getCurrentUser();
            document.getElementById('spPhoneInput').value = user && user.phone ? user.phone : '';
            document.getElementById('spPhoneDisplay').style.display = 'none';
            document.getElementById('spPhoneEdit').style.display = 'block';
        }

        function cancelStudentPhoneEdit() {
            document.getElementById('spPhoneDisplay').style.display = '';
            document.getElementById('spPhoneEdit').style.display = 'none';
        }

        async function saveStudentPhone() {
            const user = TPRSApi.getCurrentUser();
            if (!user) return;
            const phone = document.getElementById('spPhoneInput').value.trim();
            const userType = TPRSApi.getUserType() || 'student';
            const result = await TPRSApi.updatePhone(user.id, userType, phone);
            if (result.success) {
                user.phone = phone;
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                document.getElementById('spPhone').textContent = phone || '—';
                cancelStudentPhoneEdit();
            } else {
                alert(result.message || 'Failed to update phone.');
            }
        }
        // Close modal on overlay click
        const studentProfileModal = document.getElementById('studentProfileModal');
        if (studentProfileModal) {
            studentProfileModal.addEventListener('click', function(e) {
                if (e.target === this) closeStudentProfileModal();
            });
        }

        // ===== Project Detail Modal =====
        async function openProjectDetail(projectId) {
            const result = await TPRSApi.getProject(projectId);
            if (!result.success || !result.project) return;
            const p = result.project;

            // Record unique view
            const viewer = TPRSApi.getCurrentUser();
            const vType = TPRSApi.getUserType();
            if (viewer && viewer.id && vType) {
                TPRSApi.recordView(projectId, viewer.id, vType);
            }

            document.getElementById('pdmTitle').textContent = p.title || 'Untitled';
            document.getElementById('pdmDesc').textContent = p.description || 'No description provided.';
            const typeVal = p.type || p.projectType || '—';
            document.getElementById('pdmType').textContent = typeVal !== '—' ? typeVal.charAt(0).toUpperCase() + typeVal.slice(1) : '—';
            document.getElementById('pdmAuthor').textContent = p.studentName || p.authorName || '—';
            document.getElementById('pdmSupervisor').textContent = p.supervisorName || p.supervisor || '—';
            document.getElementById('pdmDept').textContent = p.department || '—';
            
            const resolvedDegree = p.degreeType ? await TPRSApi.getDegreeName(p.degreeType) : 'Bachelor';
            document.getElementById('pdmDegree').textContent = resolvedDegree;

            document.getElementById('pdmKeywords').textContent = p.keywords || '—';
            const yearSem = ((p.year || '') + (p.year && p.semester ? ' Year, ' : '') + (p.semester || '') + (p.semester ? ' Semester' : '')) || '—';
            document.getElementById('pdmYearSem').textContent = yearSem;
            document.getElementById('pdmSession').textContent = p.session || '—';
            const fileRow = document.getElementById('pdmFileRow');
            if (p.fileName) {
                fileRow.style.display = '';
                document.getElementById('pdmFile').innerHTML = '<a href="javascript:void(0)" onclick="event.stopPropagation();TPRSApi.downloadProjectFile(' + p.id + ')" style="color:#4facfe;text-decoration:none;display:flex;align-items:center;gap:0.3rem;"><span class="material-icons" style="font-size:1rem">download</span>' + escapeHtmlStr(p.fileName) + '</a>';
            } else {
                fileRow.style.display = 'none';
            }
            const zipRow = document.getElementById('pdmZipRow');
            if (p.zipFileName) {
                zipRow.style.display = '';
                document.getElementById('pdmZipFile').innerHTML = '<a href="javascript:void(0)" onclick="event.stopPropagation();TPRSApi.downloadProjectZip(' + p.id + ')" style="color:#d63d86;text-decoration:none;display:flex;align-items:center;gap:0.3rem;"><span class="material-icons" style="font-size:1rem">folder_zip</span>' + escapeHtmlStr(p.zipFileName) + '</a>';
            } else {
                zipRow.style.display = 'none';
            }
            const githubRow = document.getElementById('pdmGithubRow');
            if (p.githubLink) {
                githubRow.style.display = '';
                var ghUrl = p.githubLink.indexOf('http') === 0 ? p.githubLink : 'https://' + p.githubLink;
                document.getElementById('pdmGithub').innerHTML = '<a href="' + escapeHtmlStr(ghUrl) + '" target="_blank" rel="noopener noreferrer" style="color:#7b1fa2;text-decoration:none;display:flex;align-items:center;gap:0.3rem;"><span class="material-icons" style="font-size:1rem">open_in_new</span>' + escapeHtmlStr(p.githubLink) + '</a>';
            } else {
                githubRow.style.display = 'none';
            }
            document.getElementById('projectDetailModal').classList.add('active');
        }

        function closeProjectDetail() {
            document.getElementById('projectDetailModal').classList.remove('active');
        }

        var pdm = document.getElementById('projectDetailModal');
        if (pdm) {
            pdm.addEventListener('click', function(e) {
                if (e.target === this) closeProjectDetail();
            });
        }

        function escapeHtmlStr(str) {
            if (!str) return '';
            const d = document.createElement('div');
            d.textContent = str;
            return d.innerHTML;
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
        var cpwModal = document.getElementById('changePasswordModal');
        // Removed click-outside listener to prevent accidental closures while autofilling
        // if (cpwModal) {
        //     cpwModal.addEventListener('click', function(e) {
        //         if (e.target === this) closeChangePasswordModal();
        //     });
        // }

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
