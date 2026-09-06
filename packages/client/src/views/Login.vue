
<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>登录</h2>
          <p class="form-hint">使用注册评分站时设置的昵称和密码登录。</p>
        </div>
      </template>
      <el-form :model="loginForm" :rules="rules" ref="loginFormRef" label-position="top">
        <el-form-item label="评分站昵称" prop="nickname">
          <el-input v-model="loginForm.nickname" placeholder="请输入注册评分站时设置的昵称" />
        </el-form-item>
        <el-form-item label="评分站密码" prop="unHashedPassword">
          <el-input 
            v-model="loginForm.unHashedPassword" 
            type="password" 
            placeholder="请输入评分站密码"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleLogin" :loading="loading" style="width: 100%">
            登录
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="text" @click="goToRegister" style="width: 100%">
            没有账号？立即注册
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElCard, ElForm, ElFormItem, ElInput, ElButton, ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'

const router = useRouter()
const userStore = useUserStore()
const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  nickname: '',
  unHashedPassword: ''
})

const rules = {
  nickname: [
    { required: true, message: '请输入注册评分站时设置的昵称', trigger: 'blur' }
  ],
  unHashedPassword: [
    { required: true, message: '请输入评分站密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await userStore.loginAction(loginForm)
        ElMessage.success('登录成功')
        console.log('After login, isLoggedIn:', userStore.isLoggedIn)
        // 等待状态更新
        await new Promise(resolve => setTimeout(resolve, 100))
        console.log('Before router push, isLoggedIn:', userStore.isLoggedIn)
        router.push('/contests')
      } catch (error) {
        ElMessage.error(error.message || '登录暂时失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
  })
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f7fb;
}

.login-card {
  width: 400px;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0;
  color: #303133;
}

.form-hint {
  margin: 12px 0 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
}
</style>
