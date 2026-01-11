# RBAC 系統分析與設計文檔

## 觀察到的系統架構

### 1. 角色管理頁面設計

#### 頁面佈局
- **左側面板**：角色列表
  - 新增角色按鈕（+ 新增角色）
  - 機構選擇下拉選單
  - 可點擊的角色列表（顯示所有角色名稱）

- **右側面板**：選中角色的詳細配置
  - 角色名稱（必填）
  - 登入預設路徑（文字輸入框）
  - 登入後台權限（是/否選擇）
  - 權限組配置（checkbox 列表）
    - 可以為一個角色分配多個權限組
    - 每個權限組以 checkbox 形式呈現
  - 操作按鈕：
    - 刪除角色
    - 更新並儲存

#### 功能特點
1. 角色列表在左側，點擊切換查看不同角色
2. 角色可以包含多個權限組
3. 支援機構層級的角色隔離
4. 可設定角色的預設登入路徑

### 2. 權限管理頁面設計

#### 頁面佈局
- **左側面板**：權限組列表
  - 新增權限組按鈕（+ 新增權限組）
  - 可點擊的權限組列表

- **右側面板**：選中權限組的詳細配置
  - 權限組名稱（必填）
  - **權限矩陣表格**：
    - 列：頁面/功能模組名稱
    - 欄：操作類型（讀取、新增、修改、刪除）
    - 交叉點：checkbox（勾選表示該權限組對該頁面/功能擁有對應操作權限）
  - 操作按鈕：
    - 刪除權限組
    - 更新並儲存

#### 權限矩陣示例（觀察到的頁面權限）
| 頁面/功能 | 讀取 | 新增 | 修改 | 刪除 |
|----------|------|------|------|------|
| admin | ☑ | ☑ | ☑ | ☑ |
| manage-member | ☑ | ☑ | ☑ | ☑ |
| manage-order | ☑ | ☑ | ☑ | ☑ |
| manage-role | ☑ | ☑ | ☑ | ☑ |
| manage-permission | ☑ | ☑ | ☑ | ☑ |
| report | ☑ | ☐ | ☐ | ☐ |
| ... | ... | ... | ... | ... |

## RBAC 系統架構

```
帳戶 (Account)
  ↓ 綁定
角色 (Role)
  ↓ 包含多個
權限組 (Permission Group)
  ↓ 定義
權限 (Permission) = 資源 (Resource) × 操作 (CRUD)
```

### 三層權限模型

1. **帳戶層** (`Account`)
   - 帳號、密碼、個人資料
   - 綁定一個角色
   - 所屬機構

2. **角色層** (`Role`)
   - 角色名稱
   - 所屬機構
   - 登入預設路徑
   - 後台權限開關
   - 包含的權限組列表（多對多關係）

3. **權限組層** (`Permission Group`)
   - 權限組名稱
   - 權限列表（哪些資源的哪些操作）

4. **權限層** (`Permission`)
   - 資源/頁面標識符
   - 操作類型：讀取 (Read)、新增 (Create)、修改 (Update)、刪除 (Delete)

## 系統優勢

### 1. 靈活性
- 權限組可以重複使用
- 角色可以組合多個權限組
- 調整權限組會影響所有擁有該權限組的角色

### 2. 可維護性
- 集中管理權限組
- 新建帳號只需選擇角色
- 權限變更只需修改權限組或角色配置

### 3. 擴展性
- 支援多機構隔離
- 可以靈活新增新的資源和操作
- 角色和權限組解耦

## 實現建議

### 資料結構

```typescript
// 權限操作枚舉
enum PermissionAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

// 權限項目
interface Permission {
  resource: string         // 資源標識符，如 'manage-member'
  actions: PermissionAction[]  // 允許的操作列表
}

// 權限組
interface PermissionGroup {
  id: string
  name: string            // 如 "系統管理權限"
  permissions: Permission[]
}

// 角色
interface Role {
  id: string
  name: string           // 如 "東琉聯營處管理者"
  organizationId: string // 所屬機構
  loginRoute: string     // 登入預設路徑
  hasBackendAccess: boolean // 是否可登入後台
  permissionGroupIds: string[] // 包含的權限組 ID 列表
}

// 帳戶
interface Account {
  id: string
  username: string
  name: string
  organizationId: string
  roleId: string        // 綁定的角色 ID
  verified: boolean
}
```

### 頁面組件結構

```
views/
├── RoleManagement.vue       # 角色管理主頁面
│   ├── RoleList.vue         # 左側角色列表
│   └── RoleEditor.vue       # 右側角色編輯器
│
└── PermissionManagement.vue # 權限管理主頁面
    ├── PermissionGroupList.vue     # 左側權限組列表
    └── PermissionGroupEditor.vue   # 右側權限組編輯器
        └── PermissionMatrix.vue    # 權限矩陣表格
```

### 核心功能

#### 角色管理
1. CRUD 角色
2. 為角色分配權限組（多選）
3. 設定角色屬性（名稱、登入路徑、後台權限）
4. 機構隔離

#### 權限管理
1. CRUD 權限組
2. 配置權限矩陣（資源 × CRUD）
3. 權限組重用

#### 帳戶管理
1. 新建帳戶時選擇角色
2. 帳戶自動繼承角色的所有權限

### 權限檢查機制

```typescript
// 檢查用戶是否有某個資源的某個操作權限
function hasPermission(
  account: Account,
  resource: string,
  action: PermissionAction
): boolean {
  // 1. 獲取帳戶的角色
  const role = getRoleById(account.roleId)

  // 2. 獲取角色的所有權限組
  const permissionGroups = role.permissionGroupIds.map(id =>
    getPermissionGroupById(id)
  )

  // 3. 遍歷所有權限組，檢查是否有匹配的權限
  return permissionGroups.some(group =>
    group.permissions.some(permission =>
      permission.resource === resource &&
      permission.actions.includes(action)
    )
  )
}
```

## UI/UX 要點

1. **左右分欄佈局**
   - 左側：列表導航
   - 右側：詳細編輯

2. **即時反饋**
   - 選中項目高亮
   - 儲存成功提示
   - 驗證錯誤提示

3. **操作便利性**
   - 支援搜尋/過濾
   - 批量操作
   - 快速新增

4. **視覺化**
   - 權限矩陣表格清晰呈現
   - Checkbox 狀態一目了然
   - 顏色區分不同狀態

## 截圖參考

已儲存的截圖：
- 角色管理頁面：`screenshot-role-management.png`
- 權限管理頁面：`screenshot-permission-management.png`
