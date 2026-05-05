/**
 * 統一的 XLSX 匯出工具（依規格書 §3.7 各報表使用）
 *
 * 為避免 exceljs（~900KB）拖累首屏載入，改用動態 import：
 * 只有真的點下「匯出 Excel」時才會載入 exceljs chunk。
 */

export type Cell = string | number | boolean | null | undefined

export interface ColumnSpec {
  header: string
  width?: number
}

export async function exportToXlsx(
  filename: string,
  sheetName: string,
  columns: ColumnSpec[],
  rows: Cell[][]
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = '藍白航運訂票系統'
  wb.created = new Date()
  const ws = wb.addWorksheet(sheetName, {
    properties: { defaultRowHeight: 18 },
  })

  // 標頭
  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.header,
    width: c.width ?? Math.max(12, c.header.length * 2.5),
  }))

  // 標頭樣式
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E79' },
  }
  headerRow.alignment = { vertical: 'middle' }

  // 資料列
  for (const row of rows) {
    ws.addRow(row)
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  link.click()
  URL.revokeObjectURL(link.href)
}
