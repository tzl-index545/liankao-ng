
<template>
  <div class="register-container">
    <el-card class="register-card">
      <template #header>
        <div class="card-header">
          <h2>注册</h2>
        </div>
      </template>
      <el-alert
        class="registration-notice"
        title="注册前请留意比赛时间"
        description="注册需要读取小视野账号的真实姓名。小视野有比赛正在进行时，无法获取真实姓名，请在比赛结束后注册。已有评分站账号可直接登录。"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-form :model="registerForm" :rules="rules" ref="registerFormRef" label-position="top">
        <el-form-item label="评分站昵称" prop="nickname">
          <el-input v-model="registerForm.nickname" placeholder="设置评分站登录昵称（4–20 个字符）" />
          <p class="field-hint">昵称用于登录评分站，可自行设置；请勿包含空格或特殊符号。</p>
        </el-form-item>
        <el-form-item label="评分站密码" prop="unHashedPassword">
          <el-input 
            v-model="registerForm.unHashedPassword" 
            type="password" 
            placeholder="设置评分站密码（至少 6 位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="小视野 PHPSESSID" prop="xsytoken">
          <el-input 
            v-model="registerForm.xsytoken" 
            type="text" 
            placeholder="仅粘贴 PHPSESSID 的值"
          />
          <p class="field-hint">先登录小视野，再从浏览器 Cookie 中复制 PHPSESSID 的值，用于验证身份；无需包含 PHPSESSID= 或其他 Cookie。</p>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleRegister" :loading="loading" style="width: 100%">
            注册
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="text" @click="goToLogin" style="width: 100%">
            已有账号？立即登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElAlert, ElCard, ElForm, ElFormItem, ElInput, ElButton, ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'

const router = useRouter()
const userStore = useUserStore()
const registerFormRef = ref(null)
const loading = ref(false)

const registerForm = reactive({
  nickname: '',
  unHashedPassword: '',
  xsytoken: ''
})

const rules = {
  nickname: [
    { required: true, message: '请设置用于登录评分站的昵称', trigger: 'blur' }
  ],
  unHashedPassword: [
    { required: true, message: '请设置评分站密码', trigger: 'blur' },
    { min: 6, message: '评分站密码至少需要 6 位', trigger: 'blur' }
  ],
  xsytoken: [
    { required: true, message: '请粘贴登录小视野后的 PHPSESSID 值', trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await userStore.registerAction(registerForm)
        ElMessage.success('注册成功')
        // 等待状态更新
        await new Promise(resolve => setTimeout(resolve, 100))
        router.push('/contests')
      } catch (error) {
        ElMessage.error(error.message || '注册暂时失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
  })
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f7fb;
}

.register-card {
  width: 400px;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0;
  color: #303133;
}

.registration-notice {
  margin-bottom: 20px;
}

.field-hint {
  margin: 6px 0 0;
  color: #606266;
  font-size: 12px;
  line-height: 1.6;
}
</style>
