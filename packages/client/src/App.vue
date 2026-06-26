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
          <svg class="github-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656"></path>
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
