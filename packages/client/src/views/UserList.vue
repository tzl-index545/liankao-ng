
<template>
  <div class="user-list-container">
    <div class="header">
      <h1>用户列表</h1>
      <div class="sort-bar">
        <el-select class="sort-select" v-model="sortDirection" @change="handleSortChange" placeholder="排序方向">
          <el-option label="Rating 降序" value="desc" />
          <el-option label="Rating 升序" value="asc" />
        </el-select>
      </div>
    </div>
    <div class="user-list" v-loading="loading">
      <el-table v-if="users.length > 0" :data="users">
        <el-table-column label="昵称" min-width="200">
          <template #default="{ row }">
            <UserName :uid="row.id" :user="row" />
          </template>
        </el-table-column>
        <el-table-column label="Rating" width="150">
          <template #default="{ row }">
            <span class="rating-value">{{ row.rating !== null && row.rating !== undefined ? row.rating : '-' }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && users.length === 0" description="暂无用户" />
    </div>
    <div class="pagination" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElTable, ElTableColumn, ElSelect, ElOption, ElPagination, ElEmpty, ElMessage } from 'element-plus'
import { getUserList } from '../api/user'
import UserName from '../components/UserName.vue'

const loading = ref(false)
const users = ref([])
const sortDirection = ref('desc')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const fetchUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      order: sortDirection.value === 'asc' ? 'rating-asc' : 'rating-desc'
    }
    const res = await getUserList(params)
    users.value = res.data.items
    total.value = res.data.total
  } catch (error) {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSortChange = () => {
  currentPage.value = 1
  fetchUsers()
}

const handleSizeChange = () => {
  currentPage.value = 1
  fetchUsers()
}

const handlePageChange = () => {
  fetchUsers()
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-list-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  margin-bottom: 24px;
}

.header h1 {
  margin: 0 0 16px 0;
  font-size: 28px;
  color: #303133;
}

.sort-bar {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  align-items: center;
  margin-bottom: 16px;
}

.sort-select {
  width: 150px;
}

.user-list {
  min-height: 200px;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.rating-value {
  font-weight: 500;
}
</style>
