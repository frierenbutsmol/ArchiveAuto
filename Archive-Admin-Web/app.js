// ArchiveAuto Admin Portal — Client Script
// Strict CSP compliance: no inline scripts/handlers, safe DOM text methods only.
// Token stored in page-memory closure only — never localStorage.
(function () {
  'use strict';

  /* ========================================================
     STATE
     ======================================================== */
  let authToken          = null;
  let donutChart         = null;
  let barChart           = null;
  let currentCatalogPage = 1;
  let totalCatalogPages  = 1;
  let catalogDebounce    = null;
  let currentTab         = 'overview';
  let usersSkip          = 0;
  let usersTotalCount    = 0;
  let usersSearchDebounce = null;
  let pendingAction      = null; // { userId, action }
  const USERS_LIMIT      = 25;

  const TAB_TITLES = {
    overview: 'Overview',
    users:    'Users',
    catalog:  'Car Catalog',
    security: 'Security Events',
    audit:    'Audit Logs',
  };

  /* ========================================================
     DOM REFS
     ======================================================== */
  const loginScreen       = document.getElementById('login-screen');
  const dashboardScreen   = document.getElementById('dashboard-screen');
  const loginForm         = document.getElementById('login-form');
  const loginEmail        = document.getElementById('login-email');
  const loginPassword     = document.getElementById('login-password');
  const loginError        = document.getElementById('login-error');
  const loginBtn          = document.getElementById('login-btn');
  const logoutBtn         = document.getElementById('logout-btn');
  const userDisplay       = document.getElementById('user-display');
  const globalAlert       = document.getElementById('global-alert');
  const pageTitle         = document.getElementById('page-title');
  const sidebar           = document.getElementById('sidebar');
  const sidebarToggle     = document.getElementById('sidebar-toggle');
  const sidebarOverlay    = document.getElementById('sidebar-overlay');
  const topbarRefresh     = document.getElementById('topbar-refresh-btn');

  const statTotalUsers    = document.getElementById('stat-total-users');
  const statTotalVehicles = document.getElementById('stat-total-vehicles');
  const statTotalRecords  = document.getElementById('stat-total-records');
  const statNewUsers      = document.getElementById('stat-new-users');
  const statAiToday       = document.getElementById('stat-ai-today');

  const navItems          = document.querySelectorAll('.nav-item');
  const tabPanes          = document.querySelectorAll('.tab-pane');

  // Users screen
  const usersTbody        = document.getElementById('users-tbody');
  const usersSearch       = document.getElementById('users-search');
  const usersSearchBtn    = document.getElementById('users-search-btn');
  const usersPrevBtn      = document.getElementById('users-prev-btn');
  const usersNextBtn      = document.getElementById('users-next-btn');
  const usersPageInfo     = document.getElementById('users-page-info');

  // Action modal
  const actionModal       = document.getElementById('action-modal');
  const actionModalTitle  = document.getElementById('action-modal-title');
  const actionModalDesc   = document.getElementById('action-modal-desc');
  const actionModalError  = document.getElementById('action-modal-error');
  const actionReason      = document.getElementById('action-reason');
  const closeActionModal  = document.getElementById('close-action-modal');
  const cancelActionModal = document.getElementById('cancel-action-modal');
  const confirmActionBtn  = document.getElementById('confirm-action-btn');

  // Catalog screen
  const catalogTbody      = document.getElementById('catalog-tbody');
  const catalogSearch     = document.getElementById('catalog-search');
  const catalogTypeFilter = document.getElementById('catalog-type-filter');
  const catalogPrevBtn    = document.getElementById('catalog-prev-btn');
  const catalogNextBtn    = document.getElementById('catalog-next-btn');
  const catalogPageInfo   = document.getElementById('catalog-page-info');
  const openAddCatalogBtn = document.getElementById('open-add-catalog-btn');
  const catalogModal      = document.getElementById('catalog-modal');
  const closeCatalogModal = document.getElementById('close-catalog-modal');
  const cancelCatalogModal = document.getElementById('cancel-catalog-modal');
  const catalogForm       = document.getElementById('catalog-form');
  const modalError        = document.getElementById('modal-error');
  const catalogTypeInput  = document.getElementById('catalog-type-input');
  const catalogMakeInput  = document.getElementById('catalog-make-input');
  const catalogModelInput = document.getElementById('catalog-model-input');
  const catalogYearFrom   = document.getElementById('catalog-year-from');
  const catalogYearTo     = document.getElementById('catalog-year-to');

  // Security / Audit
  const securityTbody     = document.getElementById('security-tbody');
  const auditTbody        = document.getElementById('audit-tbody');

  /* ========================================================
     API HELPER
     ======================================================== */
  async function api(path, opts) {
    opts = opts || {};
    if (!authToken && !opts.noAuth) { handleLogout('Session ended. Please sign in again.'); throw new Error('Not authenticated'); }
    const headers = { 'Content-Type': 'application/json' };
    if (authToken && !opts.noAuth) headers['Authorization'] = 'Bearer ' + authToken;
    const res = await fetch('/admin-api' + path, Object.assign({}, opts, { headers: headers }));
    if (res.status === 401 && !opts.noAuth) { handleLogout('Your session has expired.'); throw new Error('Expired'); }
    const json = await res.json().catch(function () { return null; });
    if (!res.ok) throw new Error((json && json.error) || 'Request failed (' + res.status + ')');
    if (!json || typeof json !== 'object') throw new Error('Invalid response from server');
    return json;
  }

  /* ========================================================
     SESSION
     ======================================================== */
  function handleLogout(msg) {
    authToken = null;
    try {
      localStorage.removeItem('aa_admin_token');
      localStorage.removeItem('aa_admin_user');
      sessionStorage.removeItem('aa_admin_active_tab');
    } catch (e) {}
    if (donutChart) { donutChart.destroy(); donutChart = null; }
    if (barChart)   { barChart.destroy();   barChart = null;   }
    dashboardScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginEmail.value = '';
    loginPassword.value = '';
    if (msg) { loginError.textContent = msg; loginError.classList.remove('hidden'); }
    else loginError.classList.add('hidden');
  }

  /* ========================================================
     ALERT
     ======================================================== */
  function showAlert(msg, type) {
    globalAlert.textContent = msg;
    globalAlert.className = 'alert ' + (type === 'error' ? 'alert-error' : 'alert-success');
    globalAlert.classList.remove('hidden');
    setTimeout(function () { globalAlert.classList.add('hidden'); }, 4000);
  }

  /* ========================================================
     SAFE DOM HELPERS
     ======================================================== */
  function cell(text, cls) {
    var td = document.createElement('td');
    td.textContent = (text !== null && text !== undefined) ? String(text) : '—';
    if (cls) td.className = cls;
    return td;
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toISOString().replace('T', ' ').slice(0, 19); } catch (e) { return String(iso); }
  }
  function clearBody(tbody) {
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  }
  function emptyRow(tbody, cols, msg) {
    clearBody(tbody);
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.setAttribute('colspan', String(cols));
    td.className = 'text-center text-muted';
    td.textContent = msg;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  function badge(text, cls) {
    var span = document.createElement('span');
    span.className = 'badge ' + cls;
    span.textContent = text;
    return span;
  }

  /* ========================================================
     LOGIN
     ======================================================== */
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.classList.add('hidden');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in…';
    api('/login', {
      method: 'POST', noAuth: true,
      body: JSON.stringify({ email: loginEmail.value.trim(), password: loginPassword.value }),
    }).then(function (data) {
      authToken = data.token;
      try {
        localStorage.setItem('aa_admin_token', data.token);
        if (data.user) localStorage.setItem('aa_admin_user', JSON.stringify(data.user));
      } catch (err) {}
      userDisplay.textContent = (data.user && data.user.display_name) ? data.user.display_name : 'Admin';
      loginPassword.value = '';
      loginScreen.classList.add('hidden');
      dashboardScreen.classList.remove('hidden');
      switchTab('overview');
    }).catch(function (err) {
      loginError.textContent = err.message || 'Invalid email or password.';
      loginError.classList.remove('hidden');
    }).finally(function () {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    });
  });

  logoutBtn.addEventListener('click', function () { handleLogout(); });

  /* ========================================================
     SIDEBAR
     ======================================================== */
  sidebarToggle.addEventListener('click', function () {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('hidden', !sidebar.classList.contains('open'));
  });
  sidebarOverlay.addEventListener('click', function () {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.add('hidden');
  });

  /* ========================================================
     TAB SWITCHING  — class-based only, NO inline display style
     ======================================================== */
  navItems.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tab = btn.getAttribute('data-tab');
      switchTab(tab);
      sidebar.classList.remove('open');
      sidebarOverlay.classList.add('hidden');
    });
  });

  function switchTab(tab) {
    currentTab = tab;
    try { sessionStorage.setItem('aa_admin_active_tab', tab); } catch (e) {}
    navItems.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
    tabPanes.forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + tab); });
    if (pageTitle) pageTitle.textContent = TAB_TITLES[tab] || tab;

    if (tab === 'overview')  loadOverview();
    else if (tab === 'users')    loadUsers(0);
    else if (tab === 'catalog')  loadCatalog(1);
    else if (tab === 'security') loadSecurityEvents();
    else if (tab === 'audit')    loadAuditLogs();
  }

  topbarRefresh.addEventListener('click', function () { switchTab(currentTab); });

  /* ========================================================
     OVERVIEW
     ======================================================== */
  function loadOverview() {
    [statTotalUsers, statTotalVehicles, statTotalRecords, statNewUsers, statAiToday]
      .forEach(function (el) { if (el) el.textContent = '…'; });
    api('/overview').then(function (d) {
      if (statTotalUsers)    statTotalUsers.textContent    = Number(d.total_users || 0).toLocaleString();
      if (statTotalVehicles) statTotalVehicles.textContent = Number(d.total_vehicles || 0).toLocaleString();
      if (statTotalRecords)  statTotalRecords.textContent  = Number(d.total_service_records || 0).toLocaleString();
      if (statNewUsers)      statNewUsers.textContent      = Number(d.new_users_7d || 0).toLocaleString();
      if (statAiToday)       statAiToday.textContent       = Number(d.ai_requests_today || 0).toLocaleString();
      renderOverviewCharts(d);
    }).catch(function (err) {
      showAlert('Failed to load overview: ' + err.message, 'error');
    });
  }

  function renderOverviewCharts(d) {
    if (typeof window.Chart === 'undefined') return;
    var accent = '#00e5cc';
    var blue   = '#3b82f6';
    var yellow = '#f59e0b';

    // Donut
    var donutCanvas = document.getElementById('overview-donut-canvas');
    if (donutCanvas) {
      if (donutChart) { donutChart.destroy(); donutChart = null; }
      donutChart = new window.Chart(donutCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Users', 'Vehicles', 'Service Records'],
          datasets: [{
            data: [d.total_users || 0, d.total_vehicles || 0, d.total_service_records || 0],
            backgroundColor: [accent, blue, yellow],
            borderColor: '#111827',
            borderWidth: 3,
            hoverOffset: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', padding: 16, font: { size: 11 }, usePointStyle: true, pointStyleWidth: 8 },
            },
            tooltip: { callbacks: { label: function (ctx) { return ' ' + ctx.label + ': ' + Number(ctx.raw || 0).toLocaleString(); } } },
          },
        },
      });
    }

    // Bar
    var barCanvas = document.getElementById('overview-bar-canvas');
    if (barCanvas) {
      if (barChart) { barChart.destroy(); barChart = null; }
      barChart = new window.Chart(barCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Total Users', 'Total Vehicles', 'Service Records', 'New Users (7d)', 'AI Today'],
          datasets: [{
            label: 'Count',
            data: [d.total_users || 0, d.total_vehicles || 0, d.total_service_records || 0, d.new_users_7d || 0, d.ai_requests_today || 0],
            backgroundColor: ['rgba(0,229,204,0.7)', 'rgba(59,130,246,0.7)', 'rgba(245,158,11,0.7)', 'rgba(16,185,129,0.7)', 'rgba(139,92,246,0.7)'],
            borderColor: [accent, blue, yellow, '#10b981', '#8b5cf6'],
            borderWidth: 1.5,
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: function (ctx) { return ' ' + Number(ctx.raw || 0).toLocaleString(); } } },
          },
          scales: {
            x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { beginAtZero: true, ticks: { color: '#64748b', font: { size: 11 }, callback: function (v) { return Number(v).toLocaleString(); } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          },
        },
      });
    }
  }

  /* ========================================================
     USERS SCREEN
     ======================================================== */
  function loadUsers(skip) {
    usersSkip = (typeof skip === 'number') ? skip : 0;
    emptyRow(usersTbody, 8, 'Loading users…');
    if (usersPrevBtn) usersPrevBtn.disabled = true;
    if (usersNextBtn) usersNextBtn.disabled = true;
    if (usersPageInfo) usersPageInfo.textContent = '—';

    var q = usersSearch ? usersSearch.value.trim() : '';
    var params = new URLSearchParams({ skip: String(usersSkip), limit: String(USERS_LIMIT) });
    if (q) params.set('search', q);

    api('/users?' + params.toString()).then(function (data) {
      var users = (data && Array.isArray(data.users)) ? data.users : [];
      usersTotalCount = (data && data.total) || 0;
      var end = usersSkip + users.length;

      if (usersPageInfo) usersPageInfo.textContent = end + ' of ' + usersTotalCount + ' users';
      if (usersPrevBtn) usersPrevBtn.disabled = usersSkip <= 0;
      if (usersNextBtn) usersNextBtn.disabled = end >= usersTotalCount;

      clearBody(usersTbody);
      if (users.length === 0) { emptyRow(usersTbody, 8, 'No users found.'); return; }

      users.forEach(function (u) {
        var tr = document.createElement('tr');

        // Display Name
        tr.appendChild(cell(u.display_name || '—'));

        // Unmasked Email
        tr.appendChild(cell(u.email || '—'));

        // Role
        var roleTd = document.createElement('td');
        roleTd.appendChild(badge(u.role || 'user', u.role === 'admin' ? 'badge-accent' : 'badge-muted'));
        tr.appendChild(roleTd);

        // Status: suspended > locked > active
        var statusTd = document.createElement('td');
        var statusText, statusClass;
        if (u.suspended) { statusText = 'suspended'; statusClass = 'badge-red'; }
        else if (u.locked) { statusText = 'locked'; statusClass = 'badge-yellow'; }
        else { statusText = 'active'; statusClass = 'badge-green'; }
        statusTd.appendChild(badge(statusText, statusClass));
        tr.appendChild(statusTd);

        // Verified
        var verTd = document.createElement('td');
        verTd.appendChild(badge(u.email_verified ? 'yes' : 'no', u.email_verified ? 'badge-green' : 'badge-muted'));
        tr.appendChild(verTd);

        // Created date
        tr.appendChild(cell(fmtDate(u.created_at)));

        // Vehicle count
        tr.appendChild(cell(u.vehicle_count !== undefined ? String(u.vehicle_count) : '—'));

        // Actions
        var actTd = document.createElement('td');
        var grp = document.createElement('div');
        grp.className = 'action-btn-group';

        var userLabel = (u.display_name && u.display_name !== '—' ? u.display_name + ' (' + u.email + ')' : u.email);

        if (u.locked && !u.suspended) {
          var unlockBtn = document.createElement('button');
          unlockBtn.className = 'btn btn-ghost btn-sm';
          unlockBtn.textContent = 'Unlock';
          (function (userId, label) {
            unlockBtn.addEventListener('click', function () {
              openActionModal(userId, 'unlock', 'Unlock Account', 'Account ' + label + ' is locked due to too many failed login attempts. Provide a reason for unlocking it.');
            });
          }(u.id, userLabel));
          grp.appendChild(unlockBtn);
        }

        if (!u.suspended && u.role !== 'admin') {
          var suspendBtn = document.createElement('button');
          suspendBtn.className = 'btn btn-warning btn-sm';
          suspendBtn.textContent = 'Suspend';
          (function (userId, label) {
            suspendBtn.addEventListener('click', function () {
              openActionModal(userId, 'suspend', 'Suspend Account', 'Suspend ' + label + '. This will immediately block login and end any active session. Provide a detailed reason.');
            });
          }(u.id, userLabel));
          grp.appendChild(suspendBtn);
        }

        if (u.suspended) {
          var restoreBtn = document.createElement('button');
          restoreBtn.className = 'btn btn-primary btn-sm';
          restoreBtn.textContent = 'Restore';
          (function (userId, label) {
            restoreBtn.addEventListener('click', function () {
              openActionModal(userId, 'restore', 'Restore Account', 'Restore access for ' + label + '. Provide a reason for restoring access.');
            });
          }(u.id, userLabel));
          grp.appendChild(restoreBtn);
        }

        actTd.appendChild(grp);
        tr.appendChild(actTd);
        usersTbody.appendChild(tr);
      });
    }).catch(function (err) {
      emptyRow(usersTbody, 8, 'Error: ' + err.message);
    });
  }

  // Search handlers
  if (usersSearch) {
    usersSearch.addEventListener('input', function () {
      clearTimeout(usersSearchDebounce);
      usersSearchDebounce = setTimeout(function () { loadUsers(0); }, 400);
    });
    usersSearch.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { clearTimeout(usersSearchDebounce); loadUsers(0); }
    });
  }
  if (usersSearchBtn) {
    usersSearchBtn.addEventListener('click', function () { clearTimeout(usersSearchDebounce); loadUsers(0); });
  }
  if (usersPrevBtn) {
    usersPrevBtn.addEventListener('click', function () { if (usersSkip > 0) loadUsers(Math.max(0, usersSkip - USERS_LIMIT)); });
  }
  if (usersNextBtn) {
    usersNextBtn.addEventListener('click', function () { loadUsers(usersSkip + USERS_LIMIT); });
  }

  /* ========================================================
     ACTION MODAL (unlock / suspend / restore)
     ======================================================== */
  function openActionModal(userId, action, title, desc) {
    pendingAction = { userId: userId, action: action };
    if (actionModalTitle) actionModalTitle.textContent = title || 'Confirm Action';
    if (actionModalDesc)  actionModalDesc.textContent  = desc  || '';
    if (actionModalError) actionModalError.classList.add('hidden');
    if (actionReason)     actionReason.value = '';
    if (confirmActionBtn) {
      confirmActionBtn.className = 'btn btn-sm ' + (action === 'suspend' ? 'btn-danger' : 'btn-primary');
      confirmActionBtn.textContent = title || 'Confirm';
    }
    if (actionModal) actionModal.classList.remove('hidden');
    if (actionReason) actionReason.focus();
  }

  function closeActionModalFn() {
    if (actionModal) actionModal.classList.add('hidden');
    pendingAction = null;
  }

  if (closeActionModal)  closeActionModal.addEventListener('click',  closeActionModalFn);
  if (cancelActionModal) cancelActionModal.addEventListener('click', closeActionModalFn);

  if (confirmActionBtn) {
    confirmActionBtn.addEventListener('click', function () {
      if (!pendingAction) return;
      var reason = actionReason ? actionReason.value.trim() : '';
      if (reason.length < 5) {
        if (actionModalError) { actionModalError.textContent = 'Reason must be at least 5 characters.'; actionModalError.classList.remove('hidden'); }
        return;
      }
      if (actionModalError) actionModalError.classList.add('hidden');
      confirmActionBtn.disabled = true;
      confirmActionBtn.textContent = 'Saving…';

      var action = pendingAction.action;
      var userId = pendingAction.userId;

      api('/users/' + userId + '/' + action, {
        method: 'POST',
        body: JSON.stringify({ reason: reason }),
      }).then(function () {
        closeActionModalFn();
        showAlert('Action applied successfully.', 'success');
        loadUsers(usersSkip);
      }).catch(function (err) {
        if (actionModalError) { actionModalError.textContent = err.message || 'Action failed.'; actionModalError.classList.remove('hidden'); }
      }).finally(function () {
        confirmActionBtn.disabled = false;
        confirmActionBtn.textContent = 'Confirm';
      });
    });
  }

  /* ========================================================
     CATALOG
     ======================================================== */
  function loadCatalog(page) {
    currentCatalogPage = page || currentCatalogPage;
    emptyRow(catalogTbody, 6, 'Loading vehicle catalog…');
    var q    = catalogSearch.value.trim();
    var type = catalogTypeFilter.value;
    var params = new URLSearchParams({ page: String(currentCatalogPage), limit: '15' });
    if (q)    params.set('q', q);
    if (type) params.set('type', type);

    api('/catalog?' + params.toString()).then(function (data) {
      currentCatalogPage = data.page || 1;
      totalCatalogPages  = data.totalPages || 1;
      catalogPageInfo.textContent = 'Page ' + currentCatalogPage + ' of ' + totalCatalogPages + ' (' + (data.total || 0) + ' entries)';
      catalogPrevBtn.disabled = currentCatalogPage <= 1;
      catalogNextBtn.disabled = currentCatalogPage >= totalCatalogPages;
      clearBody(catalogTbody);
      if (!data.items || data.items.length === 0) { emptyRow(catalogTbody, 6, 'No catalog entries found.'); return; }
      data.items.forEach(function (item) {
        var tr = document.createElement('tr');
        var typeTd = document.createElement('td');
        typeTd.appendChild(badge(item.type, 'badge-accent'));
        tr.appendChild(typeTd);
        tr.appendChild(cell(item.make));
        tr.appendChild(cell(item.model));
        tr.appendChild(cell((item.year_from || '—') + ' – ' + (item.year_to || '—')));
        var srcTd = document.createElement('td');
        srcTd.appendChild(badge(item.source || 'admin', 'badge-muted'));
        tr.appendChild(srcTd);
        var actTd = document.createElement('td');
        var del = document.createElement('button');
        del.className = 'btn btn-danger btn-sm';
        del.textContent = 'Delete';
        (function (id, name) {
          del.addEventListener('click', function () { deleteCatalog(id, name); });
        }(item.id, item.make + ' ' + item.model));
        actTd.appendChild(del);
        tr.appendChild(actTd);
        catalogTbody.appendChild(tr);
      });
    }).catch(function (err) {
      emptyRow(catalogTbody, 6, 'Error: ' + err.message);
    });
  }

  function deleteCatalog(id, name) {
    if (!confirm('Delete "' + name + '" from the catalog? This action will be audited.')) return;
    api('/catalog/' + id, { method: 'DELETE' }).then(function () {
      showAlert(name + ' removed from catalog.', 'success');
      loadCatalog(currentCatalogPage);
    }).catch(function (err) {
      showAlert('Delete failed: ' + err.message, 'error');
    });
  }

  catalogSearch.addEventListener('input', function () {
    clearTimeout(catalogDebounce);
    catalogDebounce = setTimeout(function () { loadCatalog(1); }, 350);
  });
  catalogTypeFilter.addEventListener('change', function () { loadCatalog(1); });
  catalogPrevBtn.addEventListener('click', function () { if (currentCatalogPage > 1) loadCatalog(currentCatalogPage - 1); });
  catalogNextBtn.addEventListener('click', function () { if (currentCatalogPage < totalCatalogPages) loadCatalog(currentCatalogPage + 1); });

  openAddCatalogBtn.addEventListener('click', function () {
    modalError.classList.add('hidden');
    catalogForm.reset();
    catalogModal.classList.remove('hidden');
  });
  function closeCatalogModalFn() { catalogModal.classList.add('hidden'); }
  closeCatalogModal.addEventListener('click', closeCatalogModalFn);
  cancelCatalogModal.addEventListener('click', closeCatalogModalFn);

  catalogForm.addEventListener('submit', function (e) {
    e.preventDefault();
    modalError.classList.add('hidden');
    var year_from = parseInt(catalogYearFrom.value, 10);
    var year_to   = parseInt(catalogYearTo.value, 10);
    if (isNaN(year_from) || isNaN(year_to)) { modalError.textContent = 'Years must be valid numbers.'; modalError.classList.remove('hidden'); return; }
    if (year_to < year_from) { modalError.textContent = 'Year To cannot be earlier than Year From.'; modalError.classList.remove('hidden'); return; }
    api('/catalog', {
      method: 'POST',
      body: JSON.stringify({ type: catalogTypeInput.value, make: catalogMakeInput.value.trim(), model: catalogModelInput.value.trim(), year_from: year_from, year_to: year_to }),
    }).then(function () {
      closeCatalogModalFn();
      showAlert('Catalog entry added successfully.', 'success');
      loadCatalog(1);
    }).catch(function (err) {
      modalError.textContent = err.message || 'Failed to save catalog entry.';
      modalError.classList.remove('hidden');
    });
  });

  /* ========================================================
     SECURITY EVENTS
     ======================================================== */
  function loadSecurityEvents() {
    emptyRow(securityTbody, 5, 'Loading security events…');
    api('/security-events').then(function (data) {
      clearBody(securityTbody);
      if (!data || data.length === 0) { emptyRow(securityTbody, 5, 'No security events recorded.'); return; }
      data.forEach(function (ev) {
        var tr = document.createElement('tr');
        tr.appendChild(cell(fmtDate(ev.created_at)));
        var typeTd = document.createElement('td');
        var isAlert = /failed|locked|escalation/i.test(ev.event_type || '');
        typeTd.appendChild(badge(ev.event_type || '—', isAlert ? 'badge-red' : 'badge-yellow'));
        tr.appendChild(typeTd);
        tr.appendChild(cell(ev.ip));
        tr.appendChild(cell(ev.path));
        var detail = '—';
        if (ev.details && typeof ev.details === 'object') {
          var parts = [];
          var keys = Object.keys(ev.details);
          for (var i = 0; i < keys.length; i++) parts.push(keys[i] + ': ' + ev.details[keys[i]]);
          if (parts.length) detail = parts.join(', ');
        }
        tr.appendChild(cell(detail));
        securityTbody.appendChild(tr);
      });
    }).catch(function (err) {
      emptyRow(securityTbody, 5, 'Error: ' + err.message);
    });
  }

  /* ========================================================
     AUDIT LOGS
     ======================================================== */
  function loadAuditLogs() {
    emptyRow(auditTbody, 6, 'Loading audit logs…');
    api('/audit-logs').then(function (data) {
      clearBody(auditTbody);
      if (!data || data.length === 0) { emptyRow(auditTbody, 6, 'No audit entries recorded.'); return; }
      data.forEach(function (log) {
        var tr = document.createElement('tr');
        tr.appendChild(cell(fmtDate(log.created_at)));
        var actionTd = document.createElement('td');
        actionTd.appendChild(badge(log.action, 'badge-accent'));
        tr.appendChild(actionTd);
        tr.appendChild(cell(log.target_type));
        var idTd = document.createElement('td');
        idTd.style.fontFamily = 'monospace';
        idTd.style.fontSize = '0.75rem';
        idTd.style.color = 'var(--text-secondary)';
        idTd.textContent = log.target_id ? String(log.target_id).slice(0, 12) + '…' : '—';
        tr.appendChild(idTd);
        tr.appendChild(cell(log.ip));
        var detail = '—';
        if (log.detail && typeof log.detail === 'object') {
          var parts2 = [];
          var keys2 = Object.keys(log.detail);
          for (var j = 0; j < keys2.length; j++) parts2.push(keys2[j] + ': ' + log.detail[keys2[j]]);
          if (parts2.length) detail = parts2.join(', ');
        }
        tr.appendChild(cell(detail));
        auditTbody.appendChild(tr);
      });
    }).catch(function (err) {
      emptyRow(auditTbody, 6, 'Error: ' + err.message);
    });
  }

  /* ========================================================
     INIT — Restore session from localStorage if present
     ======================================================== */
  try {
    var savedToken = localStorage.getItem('aa_admin_token');
    if (savedToken) {
      authToken = savedToken;
      var savedUser = null;
      try { savedUser = JSON.parse(localStorage.getItem('aa_admin_user') || 'null'); } catch (e) {}
      if (savedUser && savedUser.display_name) userDisplay.textContent = savedUser.display_name;

      var savedTab = 'overview';
      try { savedTab = sessionStorage.getItem('aa_admin_active_tab') || 'overview'; } catch (e) {}

      // Verify token is still valid with /me
      api('/me').then(function (me) {
        if (me && me.display_name) userDisplay.textContent = me.display_name;
        loginScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        switchTab(savedTab);
      }).catch(function () {
        handleLogout('Session expired. Please sign in again.');
      });
    }
  } catch (e) {}

})();
