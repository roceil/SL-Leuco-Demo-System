# 多航商 RBAC 權限管控實作記錄

**日期：** 2026-02-25
**分支：** `feat/green-island`

---

## 背景

系統原有 2 個航商（凱旋 kx、金星 jx），需建立正式多租戶權限架構。原有問題：

1. 角色硬編碼（role-kx-admin），不易擴展
2. 無組織管理 UI
3. 資源（Order, Ship, Schedule）未標記 `organizationId`，無法資料隔離
4. `hasPermission()` 不考慮資源所屬組織
5. 缺少 `maritime_staff`（船務人員）和 `partner`（合作廠商）角色
6. 無 `manage-organization`、`manage-report` 權限資源

---

## 角色範本與權限矩陣

### 5 種角色範本

| 角色範本 | 說明 |
|---|---|
| `super_admin` | 系統超管，無組織限制 |
| `operator_admin` | 航商管理員，管理本航商資源 |
| `maritime_staff` | 船務人員，跨航商看船班 |
| `ticket_staff` | 票口人員，售票＋跨航商看船班 |
| `partner` | 合作廠商，受限唯讀 |

### 資源存取矩陣

| 資源 | super_admin | operator_admin | maritime_staff | ticket_staff | partner |
|---|---|---|---|---|---|
| manage-organization | ✅ 全部 | ❌ | ❌ | ❌ | ❌ |
| manage-member | ✅ 全部 | ✅ 本航商 | ❌ | ❌ | ❌ |
| manage-ship | ✅ 全部 | ✅ 本航商 | ❌ | ❌ | ❌ |
| manage-schedule（CRUD） | ✅ 全部 | ✅ 本航商 | ✅ 本航商 | ❌ | ❌ |
| **manage-schedule（READ）** | ✅ **跨航商** | ✅ **跨航商** | ✅ **跨航商** | ✅ **跨航商** | ✅ **跨航商** |
| manage-order | ✅ 全部 | ✅ 本航商 | ❌ | ✅ 本航商 | ❌ |
| manage-ticket | ✅ 全部 | ✅ 本航商 | ❌ | ✅ 本航商 | ❌ |
| manage-whitelist | ✅ 全部 | ✅ 本航商 | ❌ | ✅ 本航商 | ❌ |
| manage-rbac | ✅ 全部 | ✅ 本航商 | ❌ | ❌ | ❌ |
| manage-report（READ） | ✅ **跨航商** | ✅ 本航商 | ❌ | ✅ 本航商 | ❌ |
| view-audit-log | ✅ 全部 | ✅ 本航商 | ❌ | ❌ | ❌ |

**核心規則：** `manage-schedule` 的 READ 是唯一跨航商共享的資源。

---

## 實作步驟

### Step 1：型別定義更新

#### `src/types/rbac.ts`
- 新增 `RoleTemplate` 聯合型別：`'super_admin' | 'operator_admin' | 'maritime_staff' | 'ticket_staff' | 'partner'`
- `Organization` 介面新增 `contactEmail?`、`contactPhone?`、`createdAt`、`updatedAt`
- `Role` 介面新增 `roleTemplate: RoleTemplate` 欄位

#### `src/types/order.ts`
- `Order` 介面新增 `organizationId?: string`

#### `src/types/ship.ts`
- `Ship` 介面新增 `organizationId: string`（必填）
- `ShipFormData` 介面新增 `organizationId: string`（必填）

#### `src/types/schedule.ts`
- `Schedule` 介面新增 `organizationId?: string`

---

### Step 2：RBAC Store 強化

**`src/stores/rbac.ts`** 新增：

```typescript
// 組織 CRUD
async function createOrganization(data): Promise<Organization>
async function updateOrganization(id, data): Promise<void>
async function deleteOrganization(id): Promise<void>  // 有關聯帳號時拋錯

// 核心跨組織存取檢查
function canAccessResource(
  accountId: string,
  resource: string,
  action: PermissionAction,
  resourceOrgId?: string
): boolean {
  // 1. 先確認有此權限
  // 2. manage-schedule READ → 允許跨組織
  // 3. super_admin → 無限制
  // 4. 其他 → 只能存取本組織資源
}

// 輔助函數
function isSuperAdmin(accountId: string): boolean
function getAccountOrgId(accountId: string): string | null
```

---

### Step 3：db.json 重構

#### `rbac_organizations`
補充三個組織的 `contactEmail`、`contactPhone`、`createdAt`、`updatedAt`。

#### `rbac_roles`
- 全部角色加上 `roleTemplate` 欄位
- 新增 `role-kx-maritime`（凱旋船務人員，`maritime_staff`）
- 新增 `role-jx-maritime`（金星船務人員，`maritime_staff`）

#### `rbac_permission_groups`
| 群組 | 變更 |
|---|---|
| `pg-all` | 新增 `manage-organization`（CRUD）、`manage-report`（R） |
| `pg-kx-admin` | 新增 `manage-rbac`（RCU）、`manage-report`（R） |
| `pg-jx-admin` | 新增 `manage-rbac`（RCU）、`manage-report`（R） |
| `pg-ticket-agent` | 新增 `manage-report`（R） |
| `pg-maritime-staff` | **新增**：`manage-schedule`（RCU） |
| `pg-partner` | **新增**：`manage-schedule`（R）、`manage-ticket`（R） |

#### 資源補上 `organizationId`
- `ships`：`ship-kx*` → `org-kx`，`ship-jx*` → `org-jx`（Node.js 腳本批次處理）
- `schedules`：依 `shipId` 推斷組織，批次補上
- `orders`：依 `scheduleId` 航線推斷組織，批次補上

#### 測試帳號新增
手動新增 `kx-maritime`（凱旋船務人員）帳號供測試。

---

### Step 4：組織管理 UI

**新建 `src/views/OrganizationManagement.vue`**

功能：
- 列出所有航商（表格：名稱、聯絡信箱、電話、關聯帳號數、建立時間）
- 新增航商（Modal 表單）
- 編輯航商資訊
- 刪除航商（有關聯帳號時顯示錯誤，`org-sys` 禁止刪除）
- 頁面守衛：無 `manage-organization` 權限時顯示警告

---

### Step 5：路由與導覽更新

**`src/router/index.ts`**
```typescript
{
  path: '/organization-management',
  name: 'organization-management',
  component: () => import('../views/OrganizationManagement.vue')
}
```

**`src/components/Sidebar.vue`**
- import `BuildingOfficeIcon`
- 在帳號管理前新增「組織管理」項目，路由 `/organization-management`

---

### Step 6：現有頁面加入組織過濾

#### `AccountManagement.vue`
```typescript
// 非 super_admin 只看到本組織帳號
const filteredAccounts = computed(() => {
  let result = rbacStore.accounts
  if (!isCurrentSuperAdmin.value && currentOrgId.value) {
    result = result.filter(acc => acc.organizationId === currentOrgId.value)
  }
  // ... 其他篩選
})

// 非 super_admin 只看到本組織角色（用於選單）
const visibleRoles = computed(() => {
  if (isCurrentSuperAdmin.value) return rbacStore.roles
  return rbacStore.roles.filter(r => r.organizationId === currentOrgId.value)
})
```

#### `RoleManagement.vue`
- 同上模式過濾角色列表
- 新增 `roleTemplate` 下拉選單到角色表單
- 建立角色時非 super_admin 強制帶入本組織 ID

#### `ShipManagement.vue`
- 非 super_admin 只看到本組織船隻
- 表單 `formData` 加入 `organizationId`，預設為當前使用者的組織

---

### Step 7：修復 `currentUser` 跨元件共享問題（Bug Fix）

**問題根因：**
`useAuth()` 裡的 `currentUser` 是函式**內部**宣告的 `ref`，每次呼叫 `useAuth()` 都建立全新的 `ref(null)`。Login 頁面設定的值只存在該次呼叫的 ref，其他元件拿到的永遠是 `null`。

**影響：**
- Navbar 永遠顯示「管理員」（hardcoded fallback）
- OrganizationManagement.vue 中 `currentAccountId` 永遠為空字串，導致權限檢查失敗

**修法：`src/composables/useAuth.ts`**
```typescript
// 修改前（函式內部，不共享）
export function useAuth() {
  const currentUser = ref<string | null>(null)
  const isAuthenticated = ref(false)
  ...
}

// 修改後（模組層級，singleton，所有呼叫者共享同一個 ref）
const currentUser = ref<string | null>(null)   // ← 移到函式外
const isAuthenticated = ref(false)              // ← 移到函式外

export function useAuth() {
  ...
}
```

**`src/components/Navbar.vue`**
不再依賴 `username` prop，改直接讀取 `useAuth().currentUser`：
```typescript
const { currentUser } = useAuth()
const displayName = computed(() => {
  const account = rbacStore.accounts.find(a => a.username === currentUser.value)
  return account?.name || currentUser.value
})
```
模板改為：`{{ displayName || username || '未登入' }}`

---

## 測試帳號

| 帳號 | 密碼 | 組織 | 角色範本 |
|---|---|---|---|
| `admin` | 任意非空 | 系統管理 | `super_admin` |
| `kx-admin` | 任意非空 | 凱旋航運 | `operator_admin` |
| `kx-maritime` | 任意非空 | 凱旋航運 | `maritime_staff` |
| `kx-ticket1` | 任意非空 | 凱旋航運 | `ticket_staff` |
| `jx-admin` | 任意非空 | 金星航運 | `operator_admin` |
| `jx-ticket1` | 任意非空 | 金星航運 | `ticket_staff` |

> 密碼機制：`validateCredentials` 僅檢查帳號密碼非空字串，任意值皆可登入。

---

## 驗證腳本

```
1. 組織管理
   admin → 側欄「組織管理」→ 可新增/編輯/刪除航商
   kx-admin → 側欄「組織管理」→ 進入後顯示「無權限」

2. 帳號隔離
   kx-admin → 帳號管理 → 只看到凱旋的帳號
   jx-admin → 帳號管理 → 只看到金星的帳號
   admin    → 帳號管理 → 看到所有帳號

3. 船隻隔離
   kx-admin → 船隻管理 → 只看到凱旋 1/2/3 號
   jx-admin → 船隻管理 → 只看到金星 1/2/3 號

4. 跨航商看船班（不隔離）
   kx-ticket1 → 船班管理 → 看到凱旋 + 金星所有船班

5. maritime_staff 限制
   kx-maritime → 可進入船班管理（CRUD）
   kx-maritime → 無法進入訂單管理、報表

6. super_admin 全覽
   admin → 所有管理頁面 → 看到跨航商所有資料
```

---

## 修改檔案清單

| 動作 | 檔案 |
|---|---|
| 修改 | `src/types/rbac.ts` |
| 修改 | `src/types/order.ts` |
| 修改 | `src/types/ship.ts` |
| 修改 | `src/types/schedule.ts` |
| 修改 | `src/stores/rbac.ts` |
| 修改 | `src/composables/useAuth.ts`（singleton 修復） |
| 修改 | `src/composables/useShips.ts` |
| 修改 | `src/components/Navbar.vue`（動態顯示帳號名） |
| 修改 | `src/components/Sidebar.vue`（新增組織管理入口） |
| 修改 | `src/router/index.ts` |
| 修改 | `src/views/AccountManagement.vue` |
| 修改 | `src/views/RoleManagement.vue` |
| 修改 | `src/views/ShipManagement.vue` |
| 新建 | `src/views/OrganizationManagement.vue` |
| 修改 | `db.json`（organizations, roles, permission_groups, ships, schedules, orders） |
