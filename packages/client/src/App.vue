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
          <span class="username">{{ userStore.userInfo?.nickname || '' }}</span>
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
      <span>Made with ❤️ by index545</span>
      <a href="https://github.com/tzl-index545/liankao-ng" target="_blank" rel="noopener noreferrer">
        github.com/tzl-index545/liankao-ng
      </a>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMenu, ElMenuItem, ElButton } from 'element-plus'
import { useUserStore } from './store/user'

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

.username {
  font-size: 14px;
  color: #606266;
}

.main-content {
  padding: 24px;
  flex: 1;
}

.app-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 18px 24px 24px;
  color: #606266;
  font-size: 14px;
}

.app-footer a {
  color: #409eff;
  text-decoration: none;
}

.app-footer a:hover {
  text-decoration: underline;
}
</style>
