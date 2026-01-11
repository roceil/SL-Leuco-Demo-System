# RBAC 系統實現指南

## 概述

本專案已成功實現了基於角色的訪問控制（RBAC）系統，參考了東琉線聯營處售票系統的設計。

## 系統架構

### 三層權限模型

```
帳戶 (Account)
  ↓ 綁定
角色 (Role)
  ↓ 包含多個
權限組 (Permission Group)
  ↓ 定義
權限 (Permission) = 資源 (Resource) × 操作 (CRUD)
```

## 已實現的文件

### 1. 類型定義

**文件**: `src/types/rbac.ts`

定義了完整的 RBAC 類型系統：
- `PermissionAction` - 權限操作枚舉（讀取、新增、修改、刪除）
- `Permission` - 權限項目
- `PermissionGroup` - 權限組
- `Role` - 角色
- `Organization` - 機構
- `Account` - 帳戶
- `ResourceDefinition` - 資源定義

### 2. 資源配置

**文件**: `src/constants/resources.ts`

定義了系統中所有可用的資源（頁面/功能）：
- 系統管理（admin, manage-role, manage-permission）
- 帳戶管理（manage-account）
- 訂單管理（manage-order, order-search）
- 報表（report, report-detail）
- 經銷商（manage-distributor）
- 設定（account-settings）

### 3. Mock 資料

**文件**: `src/constants/mockRBAC.ts`

提供了示例資料：
- 2 個機構（東琉聯營處、系統管理）
- 5 個權限組（系統管理權限、訂單管理權限、報表查詢權限、一般使用者權限、經銷商管理權限）
- 5 個角色（系統管理員、訂單管理員、一般使用者、報表查詢員、經銷商管理員）
- 3 個帳戶示例

### 4. Pinia Store

**文件**: `src/stores/rbac.ts`

集中管理 RBAC 狀態和操作：

#### State
- `roles` - 角色列表
- `permissionGroups` - 權限組列表
- `organizations` - 機構列表
- `accounts` - 帳戶列表
- `selectedRoleId` - 當前選中的角色 ID
- `selectedPermissionGroupId` - 當前選中的權限組 ID

#### 角色管理 Actions
- `selectRole(roleId)` - 選擇角色
- `createRole(role)` - 創建角色
- `updateRole(roleId, updates)` - 更新角色
- `deleteRole(roleId)` - 刪除角色

#### 權限組管理 Actions
- `selectPermissionGroup(groupId)` - 選擇權限組
- `createPermissionGroup(group)` - 創建權限組
- `updatePermissionGroup(groupId, updates)` - 更新權限組
- `deletePermissionGroup(groupId)` - 刪除權限組

#### 權限檢查工具
- `hasPermission(accountId, resource, action)` - 檢查帳戶是否有特定資源的特定操作權限
- `getAccountPermissions(accountId)` - 獲取帳戶的所有權限

### 5. 頁面組件

#### 角色管理頁面

**文件**: `src/views/RoleManagement.vue`

**功能**:
- 左側面板：
  - 機構選擇下拉選單
  - 新增角色按鈕
  - 角色列表（可點擊選擇）
- 右側面板：
  - 角色名稱輸入
  - 登入預設路徑設定
  - 登入後台權限開關
  - 權限組多選（checkbox 列表）
  - 刪除角色按鈕
  - 更新/創建按鈕

**路由**: `/role-management`

#### 權限管理頁面

**文件**: `src/views/PermissionManagement.vue`

**功能**:
- 左側面板：
  - 新增權限組按鈕
  - 權限組列表（可點擊選擇）
- 右側面板：
  - 權限組名稱輸入
  - **權限矩陣表格**：
    - 列：資源/頁面
    - 欄：操作（讀取、新增、修改、刪除）
    - 每個交叉點：checkbox
  - 刪除權限組按鈕
  - 更新/創建按鈕

**路由**: `/permission-management`

### 6. 路由配置

**文件**: `src/router/index.ts`

新增了兩個路由：
- `/role-management` - 角色管理
- `/permission-management` - 權限管理

### 7. 側邊欄更新

**文件**: `src/components/Sidebar.vue`

在帳號設定和登出之間新增了：
- 👥 角色管理
- 🔐 權限管理

## 使用方式

### 啟動開發伺服器

```bash
pnpm dev
```

### 訪問 RBAC 管理頁面

1. 角色管理：http://localhost:5173/role-management
2. 權限管理：http://localhost:5173/permission-management

### 操作流程

#### 1. 創建權限組

1. 進入權限管理頁面
2. 點擊「+ 新增權限組」
3. 輸入權限組名稱
4. 在權限矩陣中勾選所需的資源和操作權限
5. 點擊「創建權限組」

#### 2. 創建角色

1. 進入角色管理頁面
2. 選擇機構
3. 點擊「+ 新增角色」
4. 填寫角色資訊：
   - 名稱
   - 登入預設路徑（如 `/dashboard`）
   - 是否可登入後台
5. 勾選此角色需要的權限組
6. 點擊「創建角色」

#### 3. 新建帳戶（概念）

在實際應用中，新建帳戶時只需：
1. 填寫帳戶基本資訊
2. 選擇一個角色
3. 帳戶自動繼承該角色的所有權限

### 權限檢查示例

```typescript
import { useRbacStore } from '@/stores/rbac'
import { PermissionAction } from '@/types/rbac'

const rbacStore = useRbacStore()

// 檢查帳戶是否有某個權限
const canRead = rbacStore.hasPermission('acc-1', 'manage-order', PermissionAction.READ)
const canCreate = rbacStore.hasPermission('acc-1', 'manage-order', PermissionAction.CREATE)

// 獲取帳戶的所有權限
const permissions = rbacStore.getAccountPermissions('acc-1')
console.log(permissions)
// [
//   { resource: 'manage-order', actions: ['read', 'create', 'update', 'delete'] },
//   { resource: 'report', actions: ['read'] },
//   ...
// ]
```

## 核心特性

### 1. 靈活的權限控制
- 權限組可以重複使用
- 角色可以組合多個權限組
- 調整權限組會自動影響所有相關角色

### 2. 視覺化權限矩陣
- 直觀的表格展示
- 快速勾選/取消權限
- 按資源分類顯示

### 3. 機構隔離
- 支援多機構管理
- 角色按機構分組
- 便於大型組織使用

### 4. 響應式設計
- 使用 Tailwind CSS
- 適應不同屏幕尺寸
- 清晰的視覺反饋

### 5. 類型安全
- 完整的 TypeScript 類型定義
- 編譯時錯誤檢查
- 更好的開發體驗

## 擴展建議

### 1. 後端整合
當前使用 mock 資料，建議：
- 連接實際的 API
- 實現資料持久化
- 添加錯誤處理和載入狀態

### 2. 權限守衛
在路由中添加權限檢查：

```typescript
router.beforeEach((to, from, next) => {
  const rbacStore = useRbacStore()
  const currentAccountId = getCurrentAccountId() // 獲取當前登入帳戶

  // 檢查是否有訪問權限
  if (to.meta.requiresPermission) {
    const hasAccess = rbacStore.hasPermission(
      currentAccountId,
      to.meta.resource,
      PermissionAction.READ
    )

    if (!hasAccess) {
      next('/unauthorized')
      return
    }
  }

  next()
})
```

### 3. UI 組件權限控制
基於權限隱藏/禁用按鈕：

```vue
<template>
  <button
    v-if="canDelete"
    @click="deleteItem"
  >
    刪除
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useRbacStore } from '@/stores/rbac'
import { PermissionAction } from '@/types/rbac'

const rbacStore = useRbacStore()
const currentAccountId = getCurrentAccountId()

const canDelete = computed(() =>
  rbacStore.hasPermission(
    currentAccountId,
    'manage-order',
    PermissionAction.DELETE
  )
)
</script>
```

### 4. 審計日誌
記錄所有 RBAC 操作：
- 誰創建/修改/刪除了角色
- 誰更改了權限組配置
- 權限檢查失敗記錄

### 5. 批量操作
- 批量分配權限組給多個角色
- 批量更新權限
- 匯入/匯出配置

## 技術棧

- **框架**: Vue 3 (Composition API)
- **狀態管理**: Pinia
- **路由**: Vue Router
- **樣式**: Tailwind CSS
- **語言**: TypeScript
- **構建工具**: Vite

## 參考資料

- 分析文檔：`samples/readme/RBAC-Analysis.md`
- 截圖：
  - `samples/readme/screenshot-role-management.png`
  - `samples/readme/screenshot-permission-management.png`
