import { ref, computed } from 'vue'
import type {
  Passenger,
  PassengerFilter,
  PassengerStatistics,
  UploadRecord,
  AutoUploadConfig
} from '@/types/passenger'
import { BoardingStatus, UploadType, UploadStatus } from '@/types/passenger'
import { mockPassengers, mockUploadRecords } from '@/constants/mockPassengers'

/**
 * 乘客清單管理 Composable
 */
export function usePassengers() {
  // 乘客列表
  const passengers = ref<Passenger[]>([...mockPassengers])

  // 上傳記錄
  const uploadRecords = ref<UploadRecord[]>([...mockUploadRecords])

  // 自動上傳配置
  const autoUploadConfig = ref<AutoUploadConfig>({
    enabled: true,
    intervalMinutes: 30,
    lastUploadTime: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  })

  // 篩選條件
  const filter = ref<PassengerFilter>({
    date: '',
    scheduleId: '',
    route: '',
    searchQuery: ''
  })

  // 是否已執行查詢
  const hasSearched = ref(false)

  // 篩選後的乘客列表
  const filteredPassengers = computed(() => {
    // 如果還沒執行查詢，返回空陣列
    if (!hasSearched.value) {
      return []
    }

    let result = passengers.value

    // 按日期篩選
    if (filter.value.date) {
      result = result.filter((p) => p.scheduleDate === filter.value.date)
    }

    // 按船班篩選
    if (filter.value.scheduleId) {
      result = result.filter((p) => p.scheduleId === filter.value.scheduleId)
    }

    // 按航線篩選
    if (filter.value.route) {
      result = result.filter((p) => p.route === filter.value.route)
    }

    // 按關鍵字搜尋（姓名或身分證）
    if (filter.value.searchQuery) {
      const query = filter.value.searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.idNumber.toLowerCase().includes(query) ||
          p.phone.includes(query)
      )
    }

    return result
  })

  // 統計資訊
  const statistics = computed<PassengerStatistics>(() => {
    const filtered = filteredPassengers.value
    return {
      totalPassengers: filtered.length,
      pendingCount: filtered.filter((p) => p.boardingStatus === BoardingStatus.PENDING).length,
      boardedCount: filtered.filter((p) => p.boardingStatus === BoardingStatus.BOARDED).length,
      cancelledCount: filtered.filter((p) => p.boardingStatus === BoardingStatus.CANCELLED)
        .length
    }
  })

  // 根據船班分組的乘客列表
  const passengersBySchedule = computed(() => {
    const groups = new Map<string, Passenger[]>()

    filteredPassengers.value.forEach((passenger) => {
      const scheduleId = passenger.scheduleId
      if (!groups.has(scheduleId)) {
        groups.set(scheduleId, [])
      }
      groups.get(scheduleId)!.push(passenger)
    })

    return groups
  })

  // 取得船班的乘客數量
  const getPassengerCount = (scheduleId: string): number => {
    return passengers.value.filter((p) => p.scheduleId === scheduleId).length
  }

  // 更新篩選條件
  const updateFilter = (newFilter: Partial<PassengerFilter>) => {
    filter.value = { ...filter.value, ...newFilter }
  }

  // 執行查詢
  const executeSearch = () => {
    hasSearched.value = true
  }

  // 重置查詢
  const resetSearch = () => {
    filter.value = {
      date: '',
      scheduleId: '',
      route: '',
      searchQuery: ''
    }
    hasSearched.value = false
  }

  // 手動上傳乘客清單
  const uploadPassengerList = async (
    scheduleId: string,
    scheduleName: string
  ): Promise<boolean> => {
    try {
      const schedulePassengers = passengers.value.filter((p) => p.scheduleId === scheduleId)

      if (schedulePassengers.length === 0) {
        throw new Error('該船班無乘客資料')
      }

      // 模擬上傳過程
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // 模擬 90% 成功率
      const isSuccess = Math.random() > 0.1

      const newRecord: UploadRecord = {
        id: `UPLOAD${Date.now()}`,
        scheduleId,
        scheduleName,
        scheduleDate: schedulePassengers[0]!.scheduleDate,
        passengerCount: schedulePassengers.length,
        uploadTime: new Date().toISOString(),
        uploadType: UploadType.MANUAL,
        status: isSuccess ? UploadStatus.SUCCESS : UploadStatus.FAILED,
        errorMessage: isSuccess ? undefined : '上傳失敗，請稍後再試'
      }

      uploadRecords.value.unshift(newRecord)

      return isSuccess
    } catch (error) {
      console.error('上傳失敗:', error)
      return false
    }
  }

  // 更新登船狀態
  const updateBoardingStatus = (passengerId: string, status: BoardingStatus): boolean => {
    const passenger = passengers.value.find((p) => p.id === passengerId)
    if (!passenger) return false

    passenger.boardingStatus = status
    passenger.updatedAt = new Date().toISOString()
    return true
  }

  // 批量更新登船狀態
  const batchUpdateBoardingStatus = (
    passengerIds: string[],
    status: BoardingStatus
  ): number => {
    let count = 0
    passengerIds.forEach((id) => {
      if (updateBoardingStatus(id, status)) {
        count++
      }
    })
    return count
  }

  // 更新自動上傳配置
  const updateAutoUploadConfig = (config: Partial<AutoUploadConfig>) => {
    autoUploadConfig.value = { ...autoUploadConfig.value, ...config }
  }

  // 模擬自動上傳
  const simulateAutoUpload = async (): Promise<void> => {
    if (!autoUploadConfig.value.enabled) return

    const now = new Date()
    const lastUpload = autoUploadConfig.value.lastUploadTime
      ? new Date(autoUploadConfig.value.lastUploadTime)
      : new Date(0)

    const minutesSinceLastUpload = (now.getTime() - lastUpload.getTime()) / 1000 / 60

    if (minutesSinceLastUpload >= autoUploadConfig.value.intervalMinutes) {
      // 找出需要自動上傳的船班（已出發的船班）
      const currentTime = now.toTimeString().slice(0, 5)
      const schedulesToUpload = Array.from(passengersBySchedule.value.entries()).filter(
        ([, passengerList]) => {
          const departureTime = passengerList[0]?.departureTime
          return departureTime && departureTime < currentTime
        }
      )

      // 執行自動上傳
      for (const [scheduleId, passengerList] of schedulesToUpload) {
        const newRecord: UploadRecord = {
          id: `UPLOAD${Date.now()}_${scheduleId}`,
          scheduleId,
          scheduleName: passengerList[0]!.scheduleName,
          scheduleDate: passengerList[0]!.scheduleDate,
          passengerCount: passengerList.length,
          uploadTime: new Date().toISOString(),
          uploadType: UploadType.AUTO,
          status: UploadStatus.SUCCESS
        }

        uploadRecords.value.unshift(newRecord)
      }

      autoUploadConfig.value.lastUploadTime = now.toISOString()
    }
  }

  // 匯出乘客清單為 CSV
  const exportToCSV = (scheduleId?: string): string => {
    const data = scheduleId
      ? passengers.value.filter((p) => p.scheduleId === scheduleId)
      : filteredPassengers.value

    const headers = [
      '船班編號',
      '船班名稱',
      '航行日期',
      '出發時間',
      '航線',
      '姓名',
      '身分證字號',
      '聯絡電話',
      '票種',
      '座位號碼',
      '登船狀態'
    ]

    const rows = data.map((p) => [
      p.scheduleId,
      p.scheduleName,
      p.scheduleDate,
      p.departureTime,
      p.route,
      p.name,
      p.idNumber,
      p.phone,
      p.ticketType,
      p.seatNumber || '-',
      p.boardingStatus === BoardingStatus.BOARDED
        ? '已登船'
        : p.boardingStatus === BoardingStatus.PENDING
          ? '待登船'
          : '已取消'
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')

    return csvContent
  }

  // 匯出上傳記錄為 CSV
  const exportUploadRecordsToCSV = (): string => {
    const headers = [
      '上傳編號',
      '船班編號',
      '船班名稱',
      '航行日期',
      '乘客數量',
      '上傳時間',
      '上傳類型',
      '狀態',
      '錯誤訊息'
    ]

    const rows = uploadRecords.value.map((r) => [
      r.id,
      r.scheduleId,
      r.scheduleName,
      r.scheduleDate,
      r.passengerCount.toString(),
      new Date(r.uploadTime).toLocaleString('zh-TW'),
      r.uploadType === UploadType.MANUAL ? '手動上傳' : '自動上傳',
      r.status === UploadStatus.SUCCESS
        ? '成功'
        : r.status === UploadStatus.FAILED
          ? '失敗'
          : '上傳中',
      r.errorMessage || '-'
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')

    return csvContent
  }

  return {
    // 狀態
    passengers,
    uploadRecords,
    autoUploadConfig,
    filter,
    hasSearched,

    // 計算屬性
    filteredPassengers,
    statistics,
    passengersBySchedule,

    // 方法
    getPassengerCount,
    updateFilter,
    executeSearch,
    resetSearch,
    uploadPassengerList,
    updateBoardingStatus,
    batchUpdateBoardingStatus,
    updateAutoUploadConfig,
    simulateAutoUpload,
    exportToCSV,
    exportUploadRecordsToCSV,

    // 枚舉
    BoardingStatus,
    UploadType,
    UploadStatus
  }
}
