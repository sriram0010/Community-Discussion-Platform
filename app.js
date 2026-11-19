/**
 * HostelCare - Resident Issue Management System
 * Full Backend API Integration connected to MySQL Database
 */

// --- HOSTEL METADATA & SUFFIX MAPPING ---
const HOSTEL_CONFIG = {
  Amethyst: { suffix: 'at', color: 'hostel-amethyst', bg: '#8b5cf6', icon: 'fa-gem' },
  Amber: { suffix: 'ab', color: 'hostel-amber', bg: '#f59e0b', icon: 'fa-sun' },
  Sapphire: { suffix: 'sp', color: 'hostel-sapphire', bg: '#0284c7', icon: 'fa-water' },
  Jasper: { suffix: 'js', color: 'hostel-jasper', bg: '#ef4444', icon: 'fa-fire' }
};

const STORAGE_KEYS = {
  CURRENT_USER: 'hostelcare_current_user_v1'
};

// --- APPLICATION STATE ---
let appState = {
  currentUser: null,
  issues: [],
  emails: [],
  dbConnected: false,
  adminSelectedHostel: 'ALL',
  chartMonth: 'ALL',
  hostelsChartInstance: null,
  categoryChartInstance: null
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  checkDbHealth();
  checkEmailConfig();
  checkSession();
  updateCalculatedUsername();
});

// Check Database Connection Health from Backend
async function checkDbHealth() {
  const badgeDot = document.getElementById('dbStatusDot');
  const badgeText = document.getElementById('dbStatusText');
  const badgeBtn = document.getElementById('dbStatusBadge');

  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    appState.dbConnected = data.mysqlConnected;

    if (data.mysqlConnected) {
      if (badgeDot) {
        badgeDot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
      }
      if (badgeText) {
        badgeText.textContent = `MySQL: ${data.config.database} (Live)`;
      }
      if (badgeBtn) {
        badgeBtn.className = 'flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition';
        badgeBtn.title = `Connected to MySQL (${data.config.host}:${data.config.port}). Click to edit settings.`;
      }
    } else {
      if (badgeDot) {
        badgeDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
      }
      if (badgeText) {
        badgeText.textContent = 'MySQL: Configure';
      }
      if (badgeBtn) {
        badgeBtn.className = 'flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 transition';
        badgeBtn.title = `MySQL not connected: ${data.message}. Click to enter password.`;
      }
    }

    // Prefill DB Config Form
    if (data.config) {
      if (document.getElementById('cfgDbHost')) document.getElementById('cfgDbHost').value = data.config.host || 'localhost';
      if (document.getElementById('cfgDbPort')) document.getElementById('cfgDbPort').value = data.config.port || 3306;
      if (document.getElementById('cfgDbUser')) document.getElementById('cfgDbUser').value = data.config.user || 'root';
      if (document.getElementById('cfgDbName')) document.getElementById('cfgDbName').value = data.config.database || 'hostelcare';
    }
  } catch (err) {
    if (badgeText) badgeText.textContent = 'Backend Offline';
    if (badgeDot) badgeDot.className = 'w-2 h-2 rounded-full bg-rose-500';
  }
}

// Session Check
function checkSession() {
  const sessionUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (sessionUser) {
    appState.currentUser = JSON.parse(sessionUser);
    renderAppForUser(appState.currentUser);
  } else {
    showAuthView();
  }
}

// ==================== DATABASE CONFIG MODAL ====================
function openDbConfigModal() {
  const modal = document.getElementById('dbModal');
  const msgEl = document.getElementById('dbConfigStatusMsg');
  if (msgEl) msgEl.classList.add('hidden');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeDbConfigModal() {
  const modal = document.getElementById('dbModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function handleDbConfigSubmit(e) {
  e.preventDefault();
  const msgEl = document.getElementById('dbConfigStatusMsg');
  const btn = document.getElementById('btnSaveDbConfig');
  const originalBtnText = btn.innerHTML;
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Testing Connection...';
  msgEl.classList.add('hidden');

  const payload = {
    host: document.getElementById('cfgDbHost').value.trim(),
    port: parseInt(document.getElementById('cfgDbPort').value.trim()) || 3306,
    user: document.getElementById('cfgDbUser').value.trim(),
    password: document.getElementById('cfgDbPassword').value,
    database: document.getElementById('cfgDbName').value.trim()
  };

  try {
    const res = await fetch('/api/config/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      msgEl.className = 'p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold';
      msgEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i> ${result.message}`;
      msgEl.classList.remove('hidden');
      showToast('Connected to MySQL successfully!', 'success');
      await checkDbHealth();
      
      // Refresh current views
      if (appState.currentUser) {
        if (appState.currentUser.role === 'admin') {
          renderAdminDashboard();
        } else {
          renderStudentDashboard(appState.currentUser);
        }
      }
      setTimeout(closeDbConfigModal, 1200);
    } else {
      msgEl.className = 'p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold';
      msgEl.innerHTML = `<i class="fa-solid fa-circle-exclamation text-rose-600 mr-1.5"></i> ${result.error}`;
      msgEl.classList.remove('hidden');
    }
  } catch (err) {
    msgEl.className = 'p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold';
    msgEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-rose-600 mr-1.5"></i> Error: ${err.message}`;
    msgEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalBtnText;
  }
}

// --- CALCULATION OF DAYS UNRESOLVED ---
function calculateDaysUnresolved(createdAt, resolvedAt = null) {
  const start = new Date(createdAt);
  const end = resolvedAt ? new Date(resolvedAt) : new Date();
  const diffTime = Math.abs(end - start);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return {
    days: diffDays,
    isToday: diffDays === 0,
    formatted: diffDays === 0 ? 'Today (<24 hrs)' : (diffDays === 1 ? '1 Day' : `${diffDays} Days`)
  };
}

// Category Icon Map
function getCategoryIcon(category) {
  switch (category) {
    case 'Fan / Electrical':
      return { icon: 'fa-fan', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' };
    case 'WiFi / Internet':
      return { icon: 'fa-wifi', color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' };
    case 'Mosquito Net':
      return { icon: 'fa-shield-virus', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
    case 'Water Problem':
      return { icon: 'fa-droplet', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
    case 'Carpentry / Furniture':
      return { icon: 'fa-chair', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
    case 'Cleanliness / Waste':
      return { icon: 'fa-broom', color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' };
    default:
      return { icon: 'fa-wrench', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' };
  }
}

// Hostel Badge Info
function getHostelBadge(hostelName) {
  const norm = (hostelName || '').trim();
  if (norm.toLowerCase().includes('amethyst')) {
    return { name: 'Amethyst', suffix: '@at', class: 'badge-amethyst' };
  } else if (norm.toLowerCase().includes('amber')) {
    return { name: 'Amber', suffix: '@ab', class: 'badge-amber' };
  } else if (norm.toLowerCase().includes('sapphire')) {
    return { name: 'Sapphire', suffix: '@sp', class: 'badge-sapphire' };
  } else if (norm.toLowerCase().includes('jasper')) {
    return { name: 'Jasper', suffix: '@js', class: 'badge-jasper' };
  }
  return { name: hostelName || 'Hostel', suffix: '', class: 'bg-slate-100 text-slate-700 border-slate-200' };
}

// --- DYNAMIC USERNAME PREVIEW IN REGISTRATION ---
function updateCalculatedUsername() {
  const regNoInput = document.getElementById('regNo');
  const hostelSelect = document.getElementById('regHostel');
  const preview = document.getElementById('usernamePreview');
  
  if (!regNoInput || !hostelSelect || !preview) return;

  const regVal = regNoInput.value.trim().toUpperCase() || 'REG_NO';
  const selectedHostel = hostelSelect.value;
  const suffix = HOSTEL_CONFIG[selectedHostel]?.suffix || 'at';
  
  preview.textContent = `${regVal}@${suffix}`;
}

// --- AUTH VIEW & TOGGLES ---
function switchAuthTab(tab) {
  const loginTab = document.getElementById('loginTabContent');
  const registerTab = document.getElementById('registerTabContent');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');

  if (tab === 'login') {
    loginTab.classList.remove('hidden');
    registerTab.classList.add('hidden');
    tabLoginBtn.className = 'flex-1 py-3 text-center text-sm font-bold text-indigo-600 bg-white rounded-2xl shadow-sm transition';
    tabRegisterBtn.className = 'flex-1 py-3 text-center text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-2xl transition';
  } else {
    loginTab.classList.add('hidden');
    registerTab.classList.remove('hidden');
    tabRegisterBtn.className = 'flex-1 py-3 text-center text-sm font-bold text-indigo-600 bg-white rounded-2xl shadow-sm transition';
    tabLoginBtn.className = 'flex-1 py-3 text-center text-sm font-semibold text-slate-500 hover:text-slate-800 rounded-2xl transition';
    updateCalculatedUsername();
  }
}

function fillTestLogin(username, password) {
  document.getElementById('loginIdentifier').value = username;
  document.getElementById('loginPassword').value = password;
  document.getElementById('loginErrorMsg').classList.add('hidden');
}

function quickLogin(role) {
  if (role === 'admin') {
    fillTestLogin('admin@hostel.edu', 'admin123');
  } else {
    fillTestLogin('21BCE1042@at', 'password123');
  }
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { cancelable: true }));
}

// --- REGISTRATION HANDLER (API -> MySQL) ---
async function handleRegisterSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('registerErrorMsg');
  errorEl.classList.add('hidden');

  const name = document.getElementById('regName').value.trim();
  const regNo = document.getElementById('regNo').value.trim().toUpperCase();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const location = document.getElementById('regLocation').value.trim();
  const hostel = document.getElementById('regHostel').value;
  const roomNo = document.getElementById('regRoomNo').value.trim();
  const password = document.getElementById('regPassword').value;

  const suffix = HOSTEL_CONFIG[hostel]?.suffix || 'at';
  const username = `${regNo}@${suffix}`;

  const payload = {
    id: `user_${Date.now()}`,
    name,
    regNo,
    email,
    location,
    hostel,
    roomNo,
    username,
    password,
    role: 'student'
  };

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Failed to register account.';
      errorEl.classList.remove('hidden');
      return;
    }

    const savedUser = data.user || payload;
    appState.currentUser = savedUser;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(savedUser));

    showToast(`Account created in MySQL! Username: ${username}`, 'success');
    renderAppForUser(savedUser);
  } catch (err) {
    errorEl.textContent = `Server connection error: ${err.message}`;
    errorEl.classList.remove('hidden');
  }
}

// --- LOGIN HANDLER (API -> MySQL) ---
async function handleLoginSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('loginErrorMsg');
  errorEl.classList.add('hidden');

  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Invalid username or password.';
      errorEl.classList.remove('hidden');
      return;
    }

    appState.currentUser = data.user;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data.user));
    showToast(`Welcome back, ${data.user.name}! (Authenticated via MySQL)`, 'success');
    renderAppForUser(data.user);
  } catch (err) {
    errorEl.textContent = `Connection error: ${err.message}. Ensure MySQL server is running.`;
    errorEl.classList.remove('hidden');
  }
}

function handleLogout() {
  appState.currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  showAuthView();
  showToast('You have been logged out successfully.', 'info');
}

// Show Auth View
function showAuthView() {
  document.getElementById('authView').classList.remove('hidden');
  document.getElementById('studentDashboard').classList.add('hidden');
  document.getElementById('adminDashboard').classList.add('hidden');
  document.getElementById('navUserSection').classList.add('hidden');
  document.getElementById('navGuestSection').classList.remove('hidden');
  switchAuthTab('login');
}

// Route to Dashboard based on Role
function renderAppForUser(user) {
  document.getElementById('authView').classList.add('hidden');
  document.getElementById('navGuestSection').classList.add('hidden');
  document.getElementById('navUserSection').classList.remove('hidden');

  document.getElementById('navUserBadge').textContent = user.name;
  const roleTag = document.getElementById('navRoleTag');
  roleTag.textContent = user.role === 'admin' ? 'Hostel Admin' : 'Resident';
  roleTag.className = user.role === 'admin' 
    ? 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase tracking-wider' 
    : 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 uppercase tracking-wider';

  if (user.role === 'admin') {
    document.getElementById('studentDashboard').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    renderAdminDashboard();
  } else {
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('studentDashboard').classList.remove('hidden');
    renderStudentDashboard(user);
  }
  updateEmailBadge();
}

// ==============================================================
// STUDENT DASHBOARD LOGIC (MySQL Powered)
// ==============================================================
async function renderStudentDashboard(user) {
  document.getElementById('studentWelcomeName').textContent = user.name;
  document.getElementById('studentWelcomeRoom').textContent = user.roomNo;
  document.getElementById('studentWelcomeHostel').textContent = user.hostel;
  document.getElementById('studentWelcomeReg').textContent = user.regNo;
  document.getElementById('studentWelcomeUsername').textContent = user.username;

  try {
    const res = await fetch(`/api/issues?userId=${encodeURIComponent(user.id)}`);
    const myIssues = await res.json();
    appState.issues = myIssues;

    const activeIssues = myIssues.filter(iss => iss.status !== 'Resolved');
    const resolvedIssues = myIssues.filter(iss => iss.status === 'Resolved');
    const inProgressIssues = myIssues.filter(iss => iss.status === 'In Progress');

    // Metrics
    document.getElementById('statStudentTotal').textContent = myIssues.length;
    document.getElementById('statStudentActive').textContent = activeIssues.length;
    document.getElementById('statStudentInProgress').textContent = inProgressIssues.length;
    document.getElementById('statStudentResolved').textContent = resolvedIssues.length;

    // Render Active Issues
    const activeListEl = document.getElementById('studentActiveIssuesList');
    const activeEmptyEl = document.getElementById('studentActiveEmptyState');
    activeListEl.innerHTML = '';

    if (activeIssues.length === 0) {
      activeEmptyEl.classList.remove('hidden');
    } else {
      activeEmptyEl.classList.add('hidden');

      activeIssues.forEach(issue => {
        const daysInfo = calculateDaysUnresolved(issue.createdAt);
        const catStyle = getCategoryIcon(issue.category);
        
        let daysBadgeClass = 'days-fresh';
        let daysIcon = 'fa-clock';
        if (daysInfo.days >= 5) {
          daysBadgeClass = 'days-critical';
          daysIcon = 'fa-triangle-exclamation';
        } else if (daysInfo.days >= 2) {
          daysBadgeClass = 'days-moderate';
          daysIcon = 'fa-hourglass-half';
        }

        const isPending = issue.status === 'Pending';
        const isInProgress = issue.status === 'In Progress';

        const card = document.createElement('div');
        card.className = 'py-5 transition duration-150 hover:bg-slate-50/70 rounded-2xl px-3 -mx-3';
        card.innerHTML = `
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div class="flex items-start space-x-3.5">
              <div class="w-11 h-11 rounded-2xl ${catStyle.bg} border flex items-center justify-center flex-shrink-0 text-lg ${catStyle.color}">
                <i class="fa-solid ${catStyle.icon}"></i>
              </div>
              <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-xs font-mono font-bold text-slate-500">#${issue.id}</span>
                  <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">${issue.category}</span>
                  <span class="text-xs font-bold px-2 py-0.5 rounded-md ${issue.priority === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}">
                    ${issue.priority} Priority
                  </span>
                </div>
                <h4 class="text-base font-bold text-slate-800">${escapeHtml(issue.title)}</h4>
                <p class="text-xs text-slate-600 leading-relaxed max-w-2xl">${escapeHtml(issue.description)}</p>
                
                <div class="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
                  <span><i class="fa-regular fa-calendar mr-1"></i>Raised: ${new Date(issue.createdAt).toLocaleDateString()}</span>
                  <span><i class="fa-solid fa-door-open mr-1"></i>Room: ${issue.roomNo}</span>
                  <span class="text-indigo-600"><i class="fa-solid fa-database mr-1"></i>MySQL Synced</span>
                </div>
              </div>
            </div>

            <!-- Right column: Days Unresolved Badge & Status Pipeline -->
            <div class="flex flex-col sm:items-end justify-between self-stretch sm:self-auto gap-3 min-w-[200px]">
              <div class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${daysBadgeClass}">
                <i class="fa-solid ${daysIcon}"></i>
                <span>${daysInfo.formatted} Unresolved</span>
              </div>

              <!-- Progress Pipeline -->
              <div class="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Resolution Progress</div>
                <div class="flex items-center justify-between text-xs font-bold">
                  <div class="flex items-center space-x-1 text-indigo-600">
                    <span class="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <span>Submitted</span>
                  </div>
                  <i class="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
                  <div class="flex items-center space-x-1 ${isInProgress ? 'text-amber-600 animate-pulse' : (isPending ? 'text-slate-400' : 'text-emerald-600')}">
                    <span class="w-2 h-2 rounded-full ${isInProgress ? 'bg-amber-500' : 'bg-slate-300'}"></span>
                    <span>In Progress</span>
                  </div>
                  <i class="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
                  <div class="flex items-center space-x-1 text-slate-300">
                    <span class="w-2 h-2 rounded-full bg-slate-200"></span>
                    <span>Resolved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        activeListEl.appendChild(card);
      });
    }

    // Render Resolved History
    const historyListEl = document.getElementById('studentHistoryIssuesList');
    const historyEmptyEl = document.getElementById('studentHistoryEmptyState');
    historyListEl.innerHTML = '';

    if (resolvedIssues.length === 0) {
      historyEmptyEl.classList.remove('hidden');
    } else {
      historyEmptyEl.classList.add('hidden');

      resolvedIssues.forEach(issue => {
        const catStyle = getCategoryIcon(issue.category);
        const daysToResolve = calculateDaysUnresolved(issue.createdAt, issue.resolvedAt);

        const card = document.createElement('div');
        card.className = 'py-4 transition duration-150 hover:bg-slate-50/70 rounded-2xl px-3 -mx-3';
        card.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-start space-x-3.5">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0 text-base">
                <i class="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-xs font-mono font-bold text-slate-500">#${issue.id}</span>
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Resolved & Removed</span>
                  <span class="text-xs text-slate-400">${issue.category}</span>
                </div>
                <h5 class="text-sm font-bold text-slate-800 mt-0.5">${escapeHtml(issue.title)}</h5>
                ${issue.resolutionNotes ? `<p class="text-xs text-emerald-800 bg-emerald-50/70 p-2 rounded-lg mt-1 border border-emerald-100"><i class="fa-solid fa-comment-dots mr-1.5 text-emerald-600"></i><strong>Resolution Remarks:</strong> ${escapeHtml(issue.resolutionNotes)}</p>` : ''}
                
                <div class="flex items-center space-x-4 text-xs text-slate-400 mt-1">
                  <span>Resolved in ${daysToResolve.formatted}</span>
                  <span>Resolved date: ${issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleDateString() : 'Recently'}</span>
                </div>
              </div>
            </div>

            <div class="text-right">
              <button onclick="previewIssueEmail('${issue.id}')" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition inline-flex items-center space-x-1">
                <i class="fa-solid fa-envelope-open-text"></i>
                <span>View Confirmation Email</span>
              </button>
            </div>
          </div>
        `;
        historyListEl.appendChild(card);
      });
    }
  } catch (err) {
    showToast(`Error fetching issues from database: ${err.message}`, 'warning');
  }
}

// --- ADD NEW ISSUE MODAL ---
function openNewIssueModal() {
  if (!appState.currentUser) return;
  document.getElementById('issueRoom').value = `${appState.currentUser.hostel} - Room ${appState.currentUser.roomNo}`;
  document.getElementById('issueTitle').value = '';
  document.getElementById('issueDescription').value = '';
  document.getElementById('newIssueModal').classList.remove('hidden');
  document.getElementById('newIssueModal').classList.add('flex');
}

function closeNewIssueModal() {
  document.getElementById('newIssueModal').classList.add('hidden');
  document.getElementById('newIssueModal').classList.remove('flex');
}

// Handle Add Issue (API -> MySQL)
async function handleNewIssueSubmit(e) {
  e.preventDefault();
  if (!appState.currentUser) return;

  const categoryRadio = document.querySelector('input[name="issueCategory"]:checked');
  const category = categoryRadio ? categoryRadio.value : 'Fan / Electrical';
  const title = document.getElementById('issueTitle').value.trim();
  const priority = document.getElementById('issuePriority').value;
  const description = document.getElementById('issueDescription').value.trim();

  const payload = {
    id: `ISS-${Math.floor(1000 + Math.random() * 9000)}`,
    userId: appState.currentUser.id,
    studentName: appState.currentUser.name,
    regNo: appState.currentUser.regNo,
    studentEmail: appState.currentUser.email,
    hostel: appState.currentUser.hostel,
    roomNo: appState.currentUser.roomNo,
    category,
    title,
    description,
    priority,
    status: 'Pending'
  };

  try {
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (!res.ok) {
      showToast(`Failed to create issue: ${result.error}`, 'warning');
      return;
    }

    closeNewIssueModal();
    showToast(`Ticket #${payload.id} saved to MySQL! Tracking is live.`, 'success');
    renderStudentDashboard(appState.currentUser);
  } catch (err) {
    showToast(`Database error: ${err.message}`, 'warning');
  }
}

// ==============================================================
// HOSTEL ADMINISTRATOR DASHBOARD LOGIC (MySQL Powered)
// ==============================================================
async function renderAdminDashboard() {
  await Promise.all([
    renderAdminMetricsAndCharts(),
    renderAdminIssues()
  ]);
}

function filterAdminHostel(hostelName) {
  appState.adminSelectedHostel = hostelName;
  ['ALL', 'Amethyst', 'Amber', 'Sapphire', 'Jasper'].forEach(h => {
    const btn = document.getElementById(`filterTab${h}`);
    if (btn) {
      if (h === hostelName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });
  renderAdminIssues();
}

async function renderAdminMetricsAndCharts() {
  try {
    const [statsRes, issuesRes] = await Promise.all([
      fetch('/api/stats'),
      fetch('/api/issues')
    ]);
    const stats = await statsRes.json();
    const chartIssues = await issuesRes.json();

    // Metrics
    const statusCounts = stats.statusCounts || {};
    document.getElementById('adminStatPending').textContent = statusCounts['Pending'] || 0;
    document.getElementById('adminStatInProgress').textContent = statusCounts['In Progress'] || 0;
    document.getElementById('adminStatResolved').textContent = statusCounts['Resolved'] || 0;

    // Hostels Bar Chart. Its month filter uses the date each issue was raised.
    const monthFilter = document.getElementById('hostelsChartMonthFilter');
    const availableMonths = [...new Set(chartIssues
      .filter(issue => issue.createdAt && !Number.isNaN(new Date(issue.createdAt).getTime()))
      .map(issue => String(issue.createdAt).slice(0, 7)))]
      .sort()
      .reverse();
    if (monthFilter) {
      monthFilter.innerHTML = '<option value="ALL">All months</option>' + availableMonths.map(month => {
        const label = new Date(`${month}-01T00:00:00`).toLocaleString(undefined, { month: 'long', year: 'numeric' });
        return `<option value="${month}">${label}</option>`;
      }).join('');
      if (appState.chartMonth !== 'ALL' && !availableMonths.includes(appState.chartMonth)) {
        appState.chartMonth = 'ALL';
      }
      monthFilter.value = appState.chartMonth;
    }

    const issuesForSelectedMonth = appState.chartMonth === 'ALL'
      ? chartIssues
      : chartIssues.filter(issue => issue.createdAt && String(issue.createdAt).slice(0, 7) === appState.chartMonth);

    // Hostels Bar Chart
    const hostels = ['Amethyst', 'Amber', 'Sapphire', 'Jasper'];
    const pendingByHostel = hostels.map(hostel => issuesForSelectedMonth.filter(issue =>
      issue.hostel === hostel && issue.status !== 'Resolved').length);
    const resolvedByHostel = hostels.map(hostel => issuesForSelectedMonth.filter(issue =>
      issue.hostel === hostel && issue.status === 'Resolved').length);

    const ctxHostels = document.getElementById('hostelsChart');
    if (ctxHostels) {
      if (appState.hostelsChartInstance) appState.hostelsChartInstance.destroy();
      appState.hostelsChartInstance = new Chart(ctxHostels, {
        type: 'bar',
        data: {
          labels: ['Amethyst (@at)', 'Amber (@ab)', 'Sapphire (@sp)', 'Jasper (@js)'],
          datasets: [
            {
              label: 'Active / Unresolved',
              data: pendingByHostel,
              backgroundColor: '#ef4444',
              borderRadius: 6
            },
            {
              label: 'Resolved Issues',
              data: resolvedByHostel,
              backgroundColor: '#10b981',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { family: 'Plus Jakarta Sans', weight: 600, size: 11 } }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0, font: { family: 'Plus Jakarta Sans' } },
              grid: { color: '#f1f5f9' }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', weight: 600 } }
            }
          }
        }
      });
    }

    // Category Doughnut Chart
    const categories = ['Fan / Electrical', 'WiFi / Internet', 'Mosquito Net', 'Water Problem', 'Carpentry / Furniture', 'Cleanliness / Waste'];
    const catMap = {};
    (stats.categoryStats || []).forEach(row => {
      catMap[row.category] = parseInt(row.cnt || 0);
    });
    const categoryCounts = categories.map(cat => catMap[cat] || 0);

    const ctxCategory = document.getElementById('categoryChart');
    if (ctxCategory) {
      if (appState.categoryChartInstance) appState.categoryChartInstance.destroy();
      appState.categoryChartInstance = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
          labels: ['Fan / AC', 'WiFi / Net', 'Mosquito Net', 'Water Issue', 'Furniture', 'Cleaning'],
          datasets: [{
            data: categoryCounts,
            backgroundColor: ['#6366f1', '#0284c7', '#10b981', '#06b6d4', '#f59e0b', '#14b8a6'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 10, font: { family: 'Plus Jakarta Sans', size: 10, weight: 600 } }
            }
          },
          cutout: '68%'
        }
      });
    }
  } catch (err) {
    console.warn('Could not load MySQL stats:', err);
  }
}

function setHostelsChartMonth(month) {
  appState.chartMonth = month || 'ALL';
  renderAdminMetricsAndCharts();
}

// Render Admin Issues List (MySQL Powered)
async function renderAdminIssues() {
  const container = document.getElementById('adminIssuesList');
  const emptyEl = document.getElementById('adminEmptyState');
  const searchVal = (document.getElementById('adminSearchInput')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('adminStatusFilter')?.value || 'UNRESOLVED';
  const sortOrder = document.getElementById('adminIssueSort')?.value || 'days-desc';

  try {
    let url = '/api/issues?';
    if (appState.adminSelectedHostel !== 'ALL') {
      url += `hostel=${encodeURIComponent(appState.adminSelectedHostel)}`;
    }
    const res = await fetch(url);
    const issues = await res.json();
    appState.issues = issues;

    let filtered = issues.filter(issue => {
      if (statusFilter === 'UNRESOLVED' && issue.status === 'Resolved') return false;
      if (statusFilter === 'Pending' && issue.status !== 'Pending') return false;
      if (statusFilter === 'In Progress' && issue.status !== 'In Progress') return false;
      if (statusFilter === 'Resolved' && issue.status !== 'Resolved') return false;

      if (searchVal) {
        const match = 
          (issue.id || '').toLowerCase().includes(searchVal) ||
          (issue.studentName || '').toLowerCase().includes(searchVal) ||
          (issue.regNo || '').toLowerCase().includes(searchVal) ||
          (issue.roomNo || '').toLowerCase().includes(searchVal) ||
          (issue.hostel || '').toLowerCase().includes(searchVal) ||
          (issue.category || '').toLowerCase().includes(searchVal) ||
          (issue.title || '').toLowerCase().includes(searchVal);
        if (!match) return false;
      }
      return true;
    });

    if (sortOrder === 'days-desc') {
      filtered.sort((a, b) => {
        const bDays = calculateDaysUnresolved(b.createdAt, b.resolvedAt).days;
        const aDays = calculateDaysUnresolved(a.createdAt, a.resolvedAt).days;
        return bDays - aDays || new Date(a.createdAt) - new Date(b.createdAt);
      });
    }

    container.innerHTML = '';

    if (filtered.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    filtered.forEach(issue => {
      const daysInfo = calculateDaysUnresolved(issue.createdAt, issue.resolvedAt);
      const catStyle = getCategoryIcon(issue.category);
      const hostelBadge = getHostelBadge(issue.hostel);

      let daysBadgeClass = 'days-fresh';
      let daysIcon = 'fa-clock';
      if (issue.status !== 'Resolved') {
        if (daysInfo.days >= 5) {
          daysBadgeClass = 'days-critical';
          daysIcon = 'fa-triangle-exclamation';
        } else if (daysInfo.days >= 2) {
          daysBadgeClass = 'days-moderate';
          daysIcon = 'fa-hourglass-half';
        }
      } else {
        daysBadgeClass = 'bg-slate-100 text-slate-600 border border-slate-200';
      }

      const card = document.createElement('div');
      card.className = `p-5 rounded-2xl border transition duration-150 ${issue.status === 'Resolved' ? 'bg-slate-50/60 border-slate-200 opacity-80' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}`;

      card.innerHTML = `
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex items-start space-x-3.5 flex-grow">
            <div class="w-11 h-11 rounded-2xl ${catStyle.bg} border flex items-center justify-center flex-shrink-0 text-lg ${catStyle.color}">
              <i class="fa-solid ${catStyle.icon}"></i>
            </div>
            <div class="space-y-1.5 flex-grow">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-mono font-extrabold text-slate-700">#${issue.id}</span>
                <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${hostelBadge.class}">
                  ${issue.hostel}
                </span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  <i class="fa-solid fa-door-open mr-1 text-slate-400"></i>Room ${issue.roomNo}
                </span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  ${issue.category}
                </span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-md ${issue.priority === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}">
                  ${issue.priority}
                </span>
              </div>

              <h4 class="text-base font-bold text-slate-800">${escapeHtml(issue.title)}</h4>
              <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(issue.description)}</p>

              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                <span><i class="fa-solid fa-user-graduate mr-1 text-indigo-500"></i>${escapeHtml(issue.studentName)} (<span class="font-mono font-bold">${issue.regNo}</span>)</span>
                <span><i class="fa-regular fa-envelope mr-1 text-slate-400"></i>${escapeHtml(issue.studentEmail)}</span>
                <span><i class="fa-regular fa-calendar mr-1 text-slate-400"></i>Raised: ${new Date(issue.createdAt).toLocaleDateString()}</span>
                <span class="text-emerald-600 font-semibold"><i class="fa-solid fa-database mr-1"></i>MySQL DB</span>
              </div>

              ${issue.resolutionNotes ? `
                <div class="mt-2 text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-200">
                  <strong><i class="fa-solid fa-check-double mr-1"></i>Resolution:</strong> ${escapeHtml(issue.resolutionNotes)}
                  <div class="text-[11px] text-emerald-600 mt-0.5">Resolved by ${issue.resolvedBy || 'Hostel Admin'} on ${new Date(issue.resolvedAt).toLocaleString()}</div>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 flex-shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${daysBadgeClass}">
              <i class="fa-solid ${daysIcon}"></i>
              <span>${issue.status === 'Resolved' ? `Resolved in ${daysInfo.formatted}` : `${daysInfo.formatted} Unresolved`}</span>
            </div>

            <div class="flex items-center space-x-2">
              ${issue.status !== 'Resolved' ? `
                ${issue.status === 'Pending' ? `
                  <button onclick="updateIssueStatus('${issue.id}', 'In Progress')" class="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition inline-flex items-center space-x-1">
                    <i class="fa-solid fa-hourglass-start"></i>
                    <span>Mark In Progress</span>
                  </button>
                ` : `
                  <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800">
                    <i class="fa-solid fa-gear fa-spin mr-1"></i>In Progress
                  </span>
                `}

                <button onclick="openResolveModal('${issue.id}')" class="text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm px-3.5 py-1.5 rounded-xl transition inline-flex items-center space-x-1.5">
                  <i class="fa-solid fa-circle-check"></i>
                  <span>Resolve & Remove</span>
                </button>
              ` : `
                <button onclick="previewIssueEmail('${issue.id}')" class="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition inline-flex items-center space-x-1">
                  <i class="fa-solid fa-envelope"></i>
                  <span>View Sent Email</span>
                </button>
              `}
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    showToast(`Error loading admin issues: ${err.message}`, 'warning');
  }
}

// Update Issue Status (API -> MySQL)
async function updateIssueStatus(issueId, newStatus) {
  try {
    const res = await fetch(`/api/issues/${encodeURIComponent(issueId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (!res.ok) {
      showToast(`Error updating status: ${result.error}`, 'warning');
      return;
    }
    showToast(`Ticket #${issueId} status updated in MySQL to "${newStatus}"`, 'info');
    renderAdminDashboard();
  } catch (err) {
    showToast(`Connection error: ${err.message}`, 'warning');
  }
}

// --- RESOLVE & SEND EMAIL MODAL ---
function openResolveModal(issueId) {
  const issue = appState.issues.find(i => i.id === issueId);
  if (!issue) return;

  const daysInfo = calculateDaysUnresolved(issue.createdAt);

  document.getElementById('resolveIssueId').value = issue.id;
  document.getElementById('resolveTicketId').textContent = `#${issue.id}`;
  document.getElementById('resolveStudentName').textContent = issue.studentName;
  document.getElementById('resolveStudentEmail').textContent = issue.studentEmail;
  document.getElementById('resolveLocation').textContent = `${issue.hostel} - Room ${issue.roomNo}`;
  document.getElementById('resolveDaysPending').textContent = `${daysInfo.formatted} pending`;
  
  document.getElementById('resolveNotes').value = `Maintenance team inspected and resolved the "${issue.title}". Technician verified proper functionality in room ${issue.roomNo}.`;

  document.getElementById('resolveModal').classList.remove('hidden');
  document.getElementById('resolveModal').classList.add('flex');
}

function closeResolveModal() {
  document.getElementById('resolveModal').classList.add('hidden');
  document.getElementById('resolveModal').classList.remove('flex');
}

// Handle Issue Resolution & Automated Email Dispatch (API -> MySQL)
async function handleResolveSubmit(e) {
  e.preventDefault();
  const issueId = document.getElementById('resolveIssueId').value;
  const resolutionNotes = document.getElementById('resolveNotes').value.trim();

  const issue = appState.issues.find(i => i.id === issueId);
  if (!issue) return;

  const emailData = {
    id: `EML-${Math.floor(1000 + Math.random() * 9000)}`,
    recipientEmail: issue.studentEmail,
    recipientName: issue.studentName,
    regNo: issue.regNo,
    hostel: issue.hostel,
    roomNo: issue.roomNo,
    category: issue.category,
    title: issue.title,
    subject: `[Resolved] Hostel Maintenance Ticket #${issue.id}: ${issue.title}`,
    body: `Dear ${issue.studentName},\n\nWe are pleased to inform you that your reported issue has been successfully RESOLVED by the facilities team.\n\nTicket Summary:\n- Ticket ID: #${issue.id}\n- Hostel: ${issue.hostel} | Room: ${issue.roomNo}\n- Category: ${issue.category}\n- Issue: ${issue.title}\n\nResolution Remarks from Warden Office:\n"${resolutionNotes}"\n\nThe issue has now been removed from the active maintenance list. If you continue experiencing any trouble, please feel free to raise a new request on HostelCare.\n\nWarm regards,\nHostel Management Office\nAmethyst, Amber, Sapphire & Jasper Facilities`,
    status: 'Delivered'
  };

  try {
    const res = await fetch(`/api/issues/${encodeURIComponent(issueId)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolutionNotes,
        resolvedBy: appState.currentUser?.name || 'Chief Hostel Warden',
        emailData
      })
    });
    const result = await res.json();

    if (!res.ok) {
      showToast(`Error resolving ticket in MySQL: ${result.error}`, 'warning');
      return;
    }

    closeResolveModal();
    updateEmailBadge();

    const toastMsg = result.emailSent 
      ? `Ticket #${issue.id} sorted out! Live email delivered to ${issue.studentEmail}`
      : `Ticket #${issue.id} marked as Resolved! (${result.emailStatus || 'Recorded in MySQL'})`;
    showToast(toastMsg, result.emailSent ? 'success' : 'info');

    renderAdminDashboard();

    setTimeout(() => {
      previewIssueEmail(issue.id);
    }, 400);
  } catch (err) {
    showToast(`Failed to resolve issue: ${err.message}`, 'warning');
  }
}

// --- EMAIL CONFIGURATION (SMTP) HANDLERS ---
async function checkEmailConfig() {
  const statusText = document.getElementById('smtpGatewayStatusText');
  try {
    const res = await fetch('/api/config/email', { cache: 'no-store' });
    if (!res.ok) throw new Error(`SMTP status request failed (${res.status})`);
    const data = await res.json();
    if (statusText) {
      if (data.configured) {
        statusText.innerHTML = `<span class="text-emerald-600 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Active (${escapeHtml(data.smtp_user || data.smtp_host)})</span>`;
      } else {
        statusText.innerHTML = `<span class="text-amber-600 font-semibold"><i class="fa-solid fa-circle-info mr-1"></i>Not configured (Click to set)</span>`;
      }
    }
    if (data.smtp_host && document.getElementById('cfgSmtpHost')) document.getElementById('cfgSmtpHost').value = data.smtp_host;
    if (data.smtp_port && document.getElementById('cfgSmtpPort')) document.getElementById('cfgSmtpPort').value = data.smtp_port;
    if (data.smtp_user && document.getElementById('cfgSmtpUser')) document.getElementById('cfgSmtpUser').value = data.smtp_user;
    if (data.from_name && document.getElementById('cfgSmtpFromName')) document.getElementById('cfgSmtpFromName').value = data.from_name;
  } catch (err) {
    if (statusText) {
      statusText.innerHTML = '<span class="text-rose-600 font-semibold"><i class="fa-solid fa-circle-exclamation mr-1"></i>Unavailable</span>';
      statusText.title = 'Could not contact the SMTP configuration endpoint. Refresh the page after the server is online.';
    }
  }
}

function openEmailConfigModal() {
  const modal = document.getElementById('emailConfigModal');
  const msgEl = document.getElementById('emailConfigStatusMsg');
  if (msgEl) msgEl.classList.add('hidden');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  // Fetch after opening so the user immediately sees the form, even while a
  // deployed service is waking up or its configuration request is delayed.
  checkEmailConfig();
}

function closeEmailConfigModal() {
  const modal = document.getElementById('emailConfigModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function handleEmailConfigSubmit(e) {
  e.preventDefault();
  const msgEl = document.getElementById('emailConfigStatusMsg');
  const btn = document.getElementById('btnSaveEmailConfig');
  const originalText = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Testing SMTP...';
  msgEl.classList.add('hidden');

  const payload = {
    smtp_host: document.getElementById('cfgSmtpHost').value.trim(),
    smtp_port: parseInt(document.getElementById('cfgSmtpPort').value.trim()) || 587,
    smtp_user: document.getElementById('cfgSmtpUser').value.trim(),
    smtp_password: document.getElementById('cfgSmtpPassword').value,
    from_name: document.getElementById('cfgSmtpFromName').value.trim(),
    testEmail: document.getElementById('cfgSmtpTestEmail').value.trim()
  };

  try {
    const res = await fetch('/api/config/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      msgEl.className = 'p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold';
      msgEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i> ${result.message}`;
      msgEl.classList.remove('hidden');
      showToast('SMTP credentials saved! Real emails enabled.', 'success');
      checkEmailConfig();
      setTimeout(closeEmailConfigModal, 1500);
    } else {
      msgEl.className = 'p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold';
      msgEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-600 mr-1.5"></i> ${result.message}`;
      msgEl.classList.remove('hidden');
    }
  } catch (err) {
    msgEl.className = 'p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold';
    msgEl.innerHTML = `<i class="fa-solid fa-circle-exclamation text-rose-600 mr-1.5"></i> ${err.message}`;
    msgEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// --- EMAIL OUTBOX MODAL & PREVIEW (API -> MySQL) ---
async function updateEmailBadge() {
  const badge = document.getElementById('emailBadgeCount');
  try {
    const res = await fetch('/api/emails');
    const emails = await res.json();
    appState.emails = emails;
    if (badge) {
      badge.textContent = emails.length;
    }
  } catch (err) {
    // ignore
  }
}

async function openEmailOutboxModal() {
  await renderEmailLogs();
  checkEmailConfig();
  document.getElementById('emailModal').classList.remove('hidden');
  document.getElementById('emailModal').classList.add('flex');
}

function closeEmailOutboxModal() {
  document.getElementById('emailModal').classList.add('hidden');
  document.getElementById('emailModal').classList.remove('flex');
}

async function renderEmailLogs() {
  const container = document.getElementById('emailLogContainer');
  const emptyEl = document.getElementById('emailEmptyState');
  container.innerHTML = '';

  try {
    const res = await fetch('/api/emails');
    const emails = await res.json();
    appState.emails = emails;

    if (emails.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    emails.forEach(email => {
      const card = document.createElement('div');
      card.className = 'p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="font-bold text-slate-800">${escapeHtml(email.recipientName)}</span>
            <span class="font-mono text-slate-500">&lt;${escapeHtml(email.recipientEmail)}&gt;</span>
          </div>
          <span class="text-slate-400 text-[11px]">${new Date(email.sentAt).toLocaleString()}</span>
        </div>
        <div class="font-bold text-slate-700 text-sm">${escapeHtml(email.subject)}</div>
        <div class="bg-white p-3 rounded-xl border border-slate-200 whitespace-pre-wrap font-sans text-slate-600 leading-relaxed">${escapeHtml(email.body)}</div>
        <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>Delivery: <strong class="${email.status === 'Delivered' ? 'text-emerald-600' : 'text-amber-600'}">${escapeHtml(email.status || 'Logged')}</strong></span>
          <span>Linked Ticket: <strong class="font-mono text-indigo-600">#${email.issueId}</strong></span>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    showToast(`Error fetching emails from MySQL: ${err.message}`, 'warning');
  }
}

async function previewIssueEmail(issueId) {
  await openEmailOutboxModal();
}

// --- UTILITY: TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : (type === 'warning' ? 'bg-amber-600' : 'bg-indigo-600');
  const icon = type === 'success' ? 'fa-circle-check' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info');

  toast.className = `${bg} text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-xs sm:text-sm font-semibold animate-fadeIn pointer-events-auto max-w-sm transition-all`;
  toast.innerHTML = `
    <i class="fa-solid ${icon} text-base"></i>
    <span class="flex-grow">${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" class="text-white/80 hover:text-white">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// XSS Protection
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
