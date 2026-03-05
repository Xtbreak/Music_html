// ====================
// 全局变量
// ====================

let currentUser = null;
let currentCategoryId = null;
let categories = [];
let songs = [];
let currentEditingSong = null;

// ====================
// 工具函数
// ====================

/**
 * HTML 转义函数，防止 XSS 攻击
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ====================
// 初始化
// ====================

document.addEventListener('DOMContentLoaded', async () => {
  await checkLoginStatus();
  await loadCategories();
  await loadSongs();
  setupEventListeners();
});

// ====================
// 认证相关
// ====================

async function checkLoginStatus() {
  try {
    const response = await fetch('/api/auth/check-login');
    const data = await response.json();

    if (data.loggedIn) {
      currentUser = data.user;
      updateLoginUI();
    }
  } catch (error) {
    console.error('检查登录状态失败:', error);
  }
}

function updateLoginUI() {
  const loginBtn = document.getElementById('loginBtn');
  const adminInfo = document.getElementById('adminInfo');
  const adminToolbar = document.getElementById('adminToolbar');
  const manageUsersBtn = document.getElementById('manageUsersBtn');

  if (currentUser) {
    loginBtn.style.display = 'none';
    adminInfo.style.display = 'flex';
    adminInfo.querySelector('.admin-name').textContent = currentUser.username;
    adminInfo.querySelector('.admin-role').textContent = currentUser.role === 'super_admin' ? '超级管理员' : '管理员';

    adminToolbar.style.display = 'block';

    if (currentUser.role === 'super_admin') {
      manageUsersBtn.style.display = 'inline-flex';
    }
  } else {
    loginBtn.style.display = 'inline-flex';
    adminInfo.style.display = 'none';
    adminToolbar.style.display = 'none';
  }
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    updateLoginUI();
    loadSongs();
  } catch (error) {
    console.error('登出失败:', error);
  }
}
// ====================
// 分类相关
// ====================

let totalSongsCount = 0; // 全部歌曲总数

async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    categories = await response.json();

    // 计算全部歌曲总数
    totalSongsCount = categories.reduce((sum, cat) => sum + (cat.song_count || 0), 0);

    renderCategories();
    // 更新表单中的分类选项
    updateCategorySelect();
  } catch (error) {
    console.error('加载分类失败:', error);
  }
}

function updateCategorySelect() {
  const categorySelect = document.getElementById('songCategory');
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">选择分类</option>';
    categories.forEach(cat => {
      categorySelect.innerHTML += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
    });
  }
}

function renderCategories() {
  const categoryList = document.getElementById('categoryList');

  // 全部歌曲 - 使用总数而不是当前筛选的歌曲数
  let html = `
    <div class="category-item ${currentCategoryId === null ? 'active' : ''}" onclick="selectCategory(null)">
      <span class="category-name">全部歌曲</span>
      <span class="category-count">${totalSongsCount}</span>
    </div>
  `;

  // 分类列表
  categories.forEach(cat => {
    html += `
      <div class="category-item ${currentCategoryId === cat.id ? 'active' : ''}" onclick="selectCategory(${cat.id})">
        <span class="category-name">${escapeHtml(cat.name)}</span>
        <span class="category-count">${cat.song_count || 0}</span>
      </div>
    `;
  });

  categoryList.innerHTML = html;
}

function selectCategory(categoryId) {
  currentCategoryId = categoryId;
  renderCategories();
  loadSongs();
}
// ====================
// 歌曲相关
// ====================

async function loadSongs() {
  try {
    let url = '/api/songs';
    if (currentCategoryId !== null) {
      url += `?category_id=${currentCategoryId}`;
    }

    const response = await fetch(url);
    songs = await response.json();
    renderSongs();
    // 更新分类统计（在歌曲加载完成后）
    renderCategories();
  } catch (error) {
    console.error('加载歌曲失败:', error);
  }
}

function renderSongs() {
  const grid = document.getElementById('songsGrid');
  const emptyState = document.getElementById('emptyState');
  const titleEl = document.getElementById('currentCategoryTitle');
  const countEl = document.getElementById('songCount');

  // 更新标题
  if (currentCategoryId === null) {
    titleEl.textContent = '全部歌曲';
  } else {
    const category = categories.find(c => c.id === currentCategoryId);
    titleEl.textContent = category ? category.name : '歌曲';
  }
  countEl.textContent = `${songs.length} 首歌曲`;

  // 空状态处理
  if (songs.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  grid.style.display = 'block';
  emptyState.style.display = 'none';

  // 渲染歌曲列表（行形式）
  let html = `
    <div class="song-row-header">
      <span class="song-row-header-title">歌曲名称</span>
      <span class="song-row-header-category">类别</span>
      <span class="song-row-header-date">创建时间</span>
      <span class="song-row-header-actions">操作</span>
    </div>
  `;

  html += songs.map(song => {
    const category = categories.find(c => c.id === song.category_id);
    const categoryName = category ? escapeHtml(category.name) : '未分类';
    const categoryId = category ? category.id : 0;
    const createdDate = new Date(song.created_at).toLocaleDateString('zh-CN');

    // 根据类别ID生成不同颜色（浅色系）
    const categoryColors = [
      '#B794F4', '#FC8181', '#68D391', '#9F7AEA', '#63B3ED',
      '#D6BCFA', '#4FC3F7', '#81E6D9', '#FBB6CE', '#CBD5E0'
    ];
    const colorIndex = categoryId % categoryColors.length;
    const categoryColor = categoryColors[colorIndex];

    return `
      <div class="song-row-item" onclick="openSongDetail(${song.id})">
        <span class="song-row-title">${escapeHtml(song.title)}</span>
        <span class="song-row-category" style="background: ${categoryColor}">${categoryName}</span>
        <span class="song-row-date">${createdDate}</span>
        <div class="song-row-actions">
          <button class="btn-row btn-row-view" onclick="event.stopPropagation(); openSongDetail(${song.id})">查看</button>
          ${currentUser ? `
            <button class="btn-row btn-row-edit" onclick="event.stopPropagation(); editSong(${song.id})">编辑</button>
            <button class="btn-row btn-row-delete" onclick="event.stopPropagation(); deleteSong(${song.id})">删除</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  grid.innerHTML = html;
}

async function searchSongs(query) {
  if (!query.trim()) {
    loadSongs();
    return;
  }

  try {
    const response = await fetch(`/api/songs/search?q=${encodeURIComponent(query)}`);
    const results = await response.json();

    songs = results;
    renderSongs();
  } catch (error) {
    console.error('搜索失败:', error);
  }
}

async function openSongDetail(songId) {
  try {
    const response = await fetch(`/api/songs/${songId}`);
    const song = await response.json();

    // 填充数据
    document.getElementById('modalSongTitle').textContent = song.title;
    document.getElementById('modalCategory').textContent = song.category_name || '未分类';
    document.getElementById('modalCreatedAt').textContent = new Date(song.created_at).toLocaleDateString('zh-CN');

    // 显示图片
    const scoreImageContainer = document.getElementById('scoreImageContainer');
    const modalScoreImage = document.getElementById('modalScoreImage');
    const textContentContainer = document.getElementById('textContentContainer');
    const modalContent = document.getElementById('modalContent');

    if (song.score_image) {
      modalScoreImage.src = `/uploads/scores/${song.score_image}`;
      scoreImageContainer.style.display = 'block';
    } else {
      scoreImageContainer.style.display = 'none';
    }

    // 显示文字内容
    if (song.content) {
      modalContent.textContent = song.content;
      textContentContainer.style.display = 'block';
    } else {
      textContentContainer.style.display = 'none';
    }

    // 按钮显示
    const adminActions = document.getElementById('modalAdminActions');
    const userActions = document.getElementById('modalUserActions');

    if (currentUser) {
      adminActions.style.display = 'flex';
      userActions.style.display = 'none';

      // 设置删除按钮事件
      document.getElementById('deleteSongBtn').onclick = () => {
        showConfirmModal(
          '删除歌曲',
          '确定要删除这首歌吗？',
          () => {
            deleteSong(song.id);
            closeModal();
          }
        );
      };

      document.getElementById('editSongBtn').onclick = () => {
        closeModal();
        editSong(song.id);
      };
    } else {
      adminActions.style.display = 'none';
      userActions.style.display = 'flex';
    }

    // 显示弹窗
    document.getElementById('songModal').style.display = 'flex';
  } catch (error) {
    console.error('加载歌曲详情失败:', error);
  }
}

function closeModal() {
  document.getElementById('songModal').style.display = 'none';
}

// 图片缩放功能
let currentZoom = 1;

function zoomIn() {
  currentZoom = Math.min(currentZoom + 0.2, 3);
  applyZoom();
}

function zoomOut() {
  currentZoom = Math.max(currentZoom - 0.2, 0.5);
  applyZoom();
}
function applyZoom() {
  const img = document.getElementById('modalScoreImage');
  img.style.transform = `scale(${currentZoom})`;
}
function downloadImage() {
  const img = document.getElementById('modalScoreImage');
  const link = document.createElement('a');
  link.href = img.src;
  link.download = 'score.jpg';
  link.click();
}
// ====================
// 新增/编辑歌曲
// ====================
function openSongForm(isEdit = false) {
  document.getElementById('songFormTitle').textContent = isEdit ? '✏️ 编辑歌曲' : '🎵 新增歌曲';
  document.getElementById('songFormModal').style.display = 'flex';

  // 重置表单
  document.getElementById('songForm').reset();
  resetImagePreviews();

  // 更新分类选项
  updateCategorySelect();
}
async function editSong(songId) {
  try {
    const response = await fetch(`/api/songs/${songId}`);
    const song = await response.json();

    currentEditingSong = song;
    openSongForm(true);

    // 填充表单
    document.getElementById('songId').value = song.id;
    document.getElementById('songTitle').value = song.title;
    document.getElementById('songCategory').value = song.category_id || '';
    document.getElementById('songContent').value = song.content || '';

    // 歌谱图片
    if (song.score_image) {
      const scorePreview = document.getElementById('scorePreview');
      scorePreview.src = `/uploads/scores/${song.score_image}`;
      scorePreview.style.display = 'block';
      document.getElementById('scorePlaceholder').style.display = 'none';
      document.getElementById('removeScoreBtn').style.display = 'inline-flex';
      // 保存原有图片文件名到隐藏字段
      document.getElementById('existingScoreImage').value = song.score_image;
    } else {
      document.getElementById('existingScoreImage').value = '';
    }
  } catch (error) {
    console.error('加载歌曲失败:', error);
    showMessageModal('错误', '加载歌曲失败');
  }
}
function closeSongForm() {
  document.getElementById('songFormModal').style.display = 'none';
  document.getElementById('songForm').reset();
  resetImagePreviews();
  currentEditingSong = null;
}
function resetImagePreviews() {
  // 重置歌谱
  document.getElementById('scorePreview').style.display = 'none';
  document.getElementById('scorePreview').src = '';
  document.getElementById('scorePlaceholder').style.display = 'block';
  document.getElementById('removeScoreBtn').style.display = 'none';
  document.getElementById('scoreImage').value = '';
  document.getElementById('existingScoreImage').value = '';
}
function removeScore() {
  document.getElementById('scorePreview').style.display = 'none';
  document.getElementById('scorePreview').src = '';
  document.getElementById('scorePlaceholder').style.display = 'block';
  document.getElementById('removeScoreBtn').style.display = 'none';
  document.getElementById('scoreImage').value = '';
  document.getElementById('existingScoreImage').value = '';
}
async function saveSong(formData) {
  try {
    const songId = document.getElementById('songId').value;
    const url = songId ? `/api/songs/${songId}` : '/api/songs';
    const method = songId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      body: formData
    });
    const data = await response.json();
    if (data.success) {
      closeSongForm();
      // 重置到全部歌曲视图，避免筛选导致看不到新歌曲
      currentCategoryId = null;
      loadSongs();
      loadCategories();
    } else {
      showMessageModal('错误', data.error || '保存失败');
    }
  } catch (error) {
    console.error('保存歌曲失败:', error);
    showMessageModal('错误', '保存失败，请重试');
  }
}
async function deleteSong(songId) {
  try {
    const response = await fetch(`/api/songs/${songId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      loadSongs();
      loadCategories();
    } else {
      showMessageModal('错误', data.error || '删除失败');
    }
  } catch (error) {
    console.error('删除歌曲失败:', error);
    showMessageModal('错误', '删除失败，请重试');
  }
}
// ====================
// 消息弹窗
// ====================
let messageCallback = null;

function showMessageModal(title, message, callback = null) {
  document.getElementById('messageTitle').textContent = title;
  document.getElementById('messageText').textContent = message;
  document.getElementById('messageModal').style.display = 'flex';
  messageCallback = callback;
}

function closeMessageModal() {
  document.getElementById('messageModal').style.display = 'none';
  if (messageCallback) {
    messageCallback();
    messageCallback = null;
  }
}

// ====================
// 确认弹窗
// ====================
let confirmCallback = null;

function showConfirmModal(title, message, callback) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmModal').style.display = 'flex';
  confirmCallback = callback;
}

function closeConfirmModal() {
  document.getElementById('confirmModal').style.display = 'none';
  confirmCallback = null;
}

function executeConfirm() {
  if (confirmCallback) {
    confirmCallback();
  }
  closeConfirmModal();
}

// ====================
// 分类管理
// ====================
function openCategoryManageModal() {
  document.getElementById('categoryFormModal').style.display = 'flex';
  loadCategoryManageList();
}
function closeCategoryManageModal() {
  document.getElementById('categoryFormModal').style.display = 'none';
}
async function loadCategoryManageList() {
  try {
    const response = await fetch('/api/categories');
    const cats = await response.json();
    renderCategoryManageList(cats);
  } catch (error) {
    console.error('加载分类列表失败:', error);
  }
}
function renderCategoryManageList(cats) {
  const listContainer = document.getElementById('categoryManageList');
  if (cats.length === 0) {
    listContainer.innerHTML = '<div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);">暂无分类，请点击下方按钮新增</div>';
    return;
  }
  listContainer.innerHTML = cats.map(cat => `
    <div class="category-manage-item">
      <span class="category-manage-name">${escapeHtml(cat.name)}</span>
      <div class="category-manage-actions">
        <button class="category-manage-btn" onclick="editCategory(${cat.id})" title="编辑">✏️</button>
        <button class="category-manage-btn" onclick="deleteCategory(${cat.id})" title="删除">🗑️</button>
      </div>
    </div>
  `).join('');
}
function openCategoryForm(isEdit = false) {
  const title = isEdit ? '✏️ 编辑分类' : '📝 新增分类';
  document.getElementById('categoryFormTitle').textContent = title;
  if (!isEdit) {
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
  }
  document.getElementById('categoryEditFormModal').style.display = 'flex';
}
function closeCategoryForm() {
  document.getElementById('categoryEditFormModal').style.display = 'none';
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
}
async function saveCategory(formData) {
  try {
    const categoryId = document.getElementById('categoryId').value;
    const url = categoryId ? `/api/categories/${categoryId}` : '/api/categories';
    const method = categoryId ? 'PUT' : 'POST';
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    const data = await response.json();
    if (data.success) {
      // 关闭编辑表单弹窗
      closeCategoryForm();
      // 关闭分类管理弹窗
      closeCategoryManageModal();
      // 刷新分类数据
      loadCategories();
      // 重新打开分类管理弹窗以显示更新后的列表
      openCategoryManageModal();
    } else {
      showMessageModal('错误', data.error || '保存失败');
    }
  } catch (error) {
    console.error('保存分类失败:', error);
    showMessageModal('错误', '保存失败，请重试');
  }
}
async function editCategory(categoryId) {
  try {
    const response = await fetch(`/api/categories/${categoryId}`);
    const category = await response.json();
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    openCategoryForm(true);
  } catch (error) {
    console.error('加载分类失败:', error);
    showMessageModal('错误', '加载分类失败');
  }
}
async function deleteCategory(categoryId) {
  showConfirmModal(
    '删除分类',
    '确定要删除这个分类吗？该分类下的歌曲也会被删除！',
    async () => {
      try {
        const response = await fetch(`/api/categories/${categoryId}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          // 关闭分类管理弹窗
          closeCategoryManageModal();
          // 刷新分类数据
          loadCategories();
          // 刷新歌曲数据
          loadSongs();
          // 重置当前分类选择
          if (currentCategoryId === categoryId) {
            currentCategoryId = null;
          }
          // 重新打开分类管理弹窗
          openCategoryManageModal();
        } else {
          showMessageModal('错误', data.error || '删除失败');
        }
      } catch (error) {
        console.error('删除分类失败:', error);
        showMessageModal('错误', '删除失败，请重试');
      }
    }
  );
}
// ====================
// 用户管理
// ====================
async function loadUsers() {
  try {
    const response = await fetch('/api/admin/users');
    const users = await response.json();
    renderUsers(users);
  } catch (error) {
    console.error('加载用户失败:', error);
  }
}
function renderUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${escapeHtml(user.username)}</td>
      <td>${user.role === 'super_admin' ? '超级管理员' : '管理员'}</td>
      <td>${new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
      <td>
        ${currentUser && user.id !== currentUser.id ? `
          <button class="btn-secondary" onclick="editUser(${user.id})" style="padding: 6px 12px; font-size: 12px;">编辑</button>
          <button class="btn-danger" onclick="deleteUser(${user.id})" style="padding: 6px 12px; font-size: 12px;">删除</button>
        ` : '<span style="color: var(--text-secondary);">当前用户</span>'}
      </td>
    </tr>
  `).join('');
}
function openUsersModal() {
  document.getElementById('usersModal').style.display = 'flex';
  loadUsers();
}
function closeUsersModal() {
  document.getElementById('usersModal').style.display = 'none';
}
function openUserForm(isEdit = false) {
  document.getElementById('userFormTitle').textContent = isEdit ? '编辑用户' : '新增用户';
  document.getElementById('userFormModal').style.display = 'flex';
}
function closeUserForm() {
  document.getElementById('userFormModal').style.display = 'none';
  document.getElementById('userForm').reset();
}
async function editUser(userId) {
  try {
    const users = await (await fetch('/api/admin/users')).json();
    const user = users.find(u => u.id === userId);
    if (user) {
      document.getElementById('userId').value = user.id;
      document.getElementById('userName').value = user.username;
      document.getElementById('userRole').value = user.role;
      document.getElementById('userPassword').value = '';
      document.getElementById('userPassword').placeholder = '留空则不修改密码';
      openUserForm(true);
    }
  } catch (error) {
    console.error('加载用户失败:', error);
  }
}
async function saveUser(formData) {
  try {
    const userId = document.getElementById('userId').value;
    const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users';
    const method = userId ? 'PUT' : 'POST';
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    const data = await response.json();
    if (data.success) {
      closeUserForm();
      loadUsers();
    } else {
      showMessageModal('错误', data.error || '保存失败');
    }
  } catch (error) {
    console.error('保存用户失败:', error);
    showMessageModal('错误', '保存失败，请重试');
  }
}
async function deleteUser(userId) {
  if (!confirm('确定要删除这个用户吗？')) {
    return;
  }
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      loadUsers();
    } else {
      showMessageModal('错误', data.error || '删除失败');
    }
  } catch (error) {
    console.error('删除用户失败:', error);
    showMessageModal('错误', '删除失败，请重试');
  }
}
// ====================
// 事件监听
// ====================
function setupEventListeners() {
  // 登录/登出
  document.getElementById('loginBtn').addEventListener('click', () => {
    window.location.href = '/login';
  });
  document.getElementById('logoutBtn').addEventListener('click', logout);
  // 搜索
  const searchInput = document.getElementById('searchInput');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchSongs(e.target.value);
    }, 300);
  });
  // 管理员工具栏
  document.getElementById('addSongBtn').addEventListener('click', () => openSongForm(false));
  document.getElementById('addCategoryBtn').addEventListener('click', openCategoryManageModal);
  document.getElementById('manageUsersBtn')?.addEventListener('click', openUsersModal);
  // 回收站
  document.getElementById('trashBtn').addEventListener('click', openTrashModal);
  // 歌曲表单提交
  document.getElementById('songForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    saveSong(formData);
  });
  // 分类表单提交
  document.getElementById('categoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = {
      name: document.getElementById('categoryName').value,
      description: document.getElementById('categoryDescription').value
    };
    saveCategory(formData);
  });
  // 用户表单提交
  document.getElementById('userForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = {
      username: document.getElementById('userName').value,
      password: document.getElementById('userPassword').value,
      role: document.getElementById('userRole').value
    };
    if (!formData.password && document.getElementById('userId').value) {
      delete formData.password;
    }
    saveUser(formData);
  });
  document.getElementById('addUserBtn').addEventListener('click', () => openUserForm(false));
  // 分类管理弹窗中的新增分类按钮
  document.getElementById('btnAddCategory').addEventListener('click', () => {
    closeCategoryManageModal();
    openCategoryForm(false);
  });
  // 图片预览 - 歌谱
  document.getElementById('scoreImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById('scorePreview');
        preview.src = e.target.result;
        preview.style.display = 'block';
        document.getElementById('scorePlaceholder').style.display = 'none';
        document.getElementById('removeScoreBtn').style.display = 'inline-flex';
      };
      reader.readAsDataURL(file);
    }
  });
  // 点击弹窗外部关闭
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
  // 拖拽上传
  ['scoreUploadArea'].forEach(areaId => {
    const area = document.getElementById(areaId);
    const inputId = 'scoreImage';
    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.classList.add('dragover');
    });
    area.addEventListener('dragleave', (e) => {
      e.preventDefault();
      area.classList.remove('dragover');
    });
    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const input = document.getElementById(inputId);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        // 触发change事件
        input.dispatchEvent(new Event('change'));
      }
    });
  });
  // ESC键关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.style.display = 'none';
      });
    }
  });

  // 确认弹窗按钮事件
  document.getElementById('confirmBtn').addEventListener('click', () => {
    if (confirmCallback) {
      confirmCallback();
    }
    closeConfirmModal();
  });
}

// ====================
// 回收站功能
// ====================

function openTrashModal() {
  document.getElementById('trashModal').style.display = 'flex';
  loadTrashList();
}

function closeTrashModal() {
  document.getElementById('trashModal').style.display = 'none';
}

async function loadTrashList() {
  try {
    const response = await fetch('/api/songs/trash/list');
    const trashList = await response.json();

    const trashListEl = document.getElementById('trashList');
    const emptyState = document.getElementById('trashEmptyState');

    if (trashList.length === 0) {
      emptyState.style.display = 'flex';
      trashListEl.innerHTML = '';
      return;
    }

    emptyState.style.display = 'none';

    let html = '';
    trashList.forEach(song => {
      const deletedDate = new Date(song.deleted_at).toLocaleString('zh-CN');
      html += `
        <div class="trash-item">
          <div class="trash-item-info">
            <span class="trash-item-title">${escapeHtml(song.title)}</span>
            <span class="trash-item-meta">${song.category_name || '未分类'} • 删除于 ${deletedDate}</span>
          </div>
          <div class="trash-item-actions">
            <button class="btn-restore" onclick="restoreSong(${song.id})">恢复</button>
            <button class="btn-danger" onclick="permanentDeleteSong(${song.id})">永久删除</button>
          </div>
        </div>
      `;
    });

    trashListEl.innerHTML = html;
  } catch (error) {
    console.error('加载回收站失败:', error);
    showMessageModal('错误', '加载回收站失败');
  }
}

async function restoreSong(songId) {
  try {
    const response = await fetch(`/api/songs/trash/${songId}/restore`, {
      method: 'POST'
    });
    const data = await response.json();
    if (data.success) {
      loadTrashList();
      loadSongs();
      loadCategories();
    } else {
      showMessageModal('错误', data.error || '恢复失败');
    }
  } catch (error) {
    console.error('恢复歌曲失败:', error);
    showMessageModal('错误', '恢复失败');
  }
}

async function permanentDeleteSong(songId) {
  try {
    const response = await fetch(`/api/songs/trash/${songId}/permanent`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      loadTrashList();
      loadCategories();
    } else {
      showMessageModal('错误', data.error || '删除失败');
    }
  } catch (error) {
    console.error('永久删除失败:', error);
    showMessageModal('错误', '删除失败');
  }
}

async function clearTrash() {
  try {
    const response = await fetch('/api/songs/trash/clear', {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      loadTrashList();
      loadCategories();
    } else {
      showMessageModal('错误', data.error || '清空失败');
    }
  } catch (error) {
    console.error('清空回收站失败:', error);
    showMessageModal('错误', '清空失败');
  }
}
