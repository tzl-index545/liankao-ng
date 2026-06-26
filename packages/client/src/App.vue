<template>
  <div class="app-container">
    <el-menu
      :default-active="activeMenu"
      class="navbar"
      mode="horizontal"
      :ellipsis="false"
      router
    >
      <div class="logo">
        <h1>联考评分站</h1>
      </div>
      <div class="menu-items">
        <el-menu-item index="/contests">比赛列表</el-menu-item>
        <el-menu-item index="/problems">题目列表</el-menu-item>
        <el-menu-item index="/users">用户列表</el-menu-item>
      </div>
      <div class="user-info">
        <template v-if="userStore.isLoggedIn">
          <UserName
            v-if="userStore.userInfo?.id"
            :uid="userStore.userInfo.id"
            :user="userStore.userInfo"
          />
          <el-button type="primary" link @click="handleLogout">退出</el-button>
        </template>
        <template v-else>
          <el-button type="primary" link @click="$router.push('/login')">登录</el-button>
          <el-button type="primary" link @click="$router.push('/register')">注册</el-button>
        </template>
      </div>
    </el-menu>
    <div class="main-content">
      <router-view />
    </div>
    <footer class="app-footer">
      <div class="footer-container">
        <!-- 左侧作者信息 -->
        <span class="text-muted">
          Made with <span class="heart">❤️</span> by <strong class="author">index545</strong>
        </span>
        
        <!-- 分割线 -->
        <span class="divider"></span>
        
        <!-- 右侧 Github 链接 -->
        <a 
          href="https://github.com/tzl-index545/liankao-ng" 
          target="_blank" 
          rel="noopener noreferrer"
          class="github-link"
          title="View source on GitHub"
        >
          <svg class="github-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
          <span class="link-text">liankao-ng</span>
        </a>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMenu, ElMenuItem, ElButton } from 'element-plus'
import { useUserStore } from './store/user'
import UserName from './components/UserName.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>

.app-footer {
  margin-top: 10px;
  padding-bottom: 30px;
  width: 100%;
  display: flex;
  justify-content: center;
  background-color: transparent; 
}

.footer-container {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.text-muted {
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.author {
  color: #606266;
  font-weight: 500;
}

.heart {
  color: #f56c6c;
  font-size: 13px;
  display: inline-block;
  animation: heartbeat 2s ease-in-out infinite;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.15); }
  30% { transform: scale(1); }
  45% { transform: scale(1.15); }
}

.divider {
  width: 1px;
  height: 14px;
  background-color: #dcdfe6;
}

.github-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  text-decoration: none;
  transition: color 0.2s ease;
}

.github-icon {
  width: 16px;
  height: 16px;
}

.github-link:hover {
  color: #409eff;
}

.app-container {
  min-height: 100vh;
  background: #f5f7fb;
  display: flex;
  flex-direction: column;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0 24px;
}

.logo {
  display: flex;
  align-items: center;
  margin-right: 40px;
}

.logo h1 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.menu-items {
  display: flex;
  align-items: center;
  flex: 1;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.main-content {
  padding: 24px;
  flex: 1;
}

</style>
