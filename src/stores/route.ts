import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Port, RouteSegment, RouteSegmentWithPorts } from '@/types/route'
import { apiGet, apiPut } from '@/composables/useLocalStorage'
import { useAuditLog } from '@/composables/useAuditLog'

export const useRouteStore = defineStore('route', () => {
  const { logCrud, generateChanges } = useAuditLog()
  const isLoading = ref(false)
  const ports = ref<Port[]>([])
  const routeSegments = ref<RouteSegment[]>([])
  const selectedPortId = ref<string | null>(null)
  const selectedRouteSegmentId = ref<string | null>(null)

  async function init() {
    isLoading.value = true
    try {
      ;[ports.value, routeSegments.value] = await Promise.all([
        apiGet<Port[]>('ports'),
        apiGet<RouteSegment[]>('route_segments')
      ])
    } finally {
      isLoading.value = false
    }
  }

  // Getters
  const activePorts = computed(() => ports.value.filter((p) => p.isActive))

  const activeRouteSegments = computed(() => routeSegments.value.filter((r) => r.isActive))

  const selectedPort = computed(() => {
    if (!selectedPortId.value) return null
    return ports.value.find((p) => p.id === selectedPortId.value) || null
  })

  const selectedRouteSegment = computed(() => {
    if (!selectedRouteSegmentId.value) return null
    return routeSegments.value.find((r) => r.id === selectedRouteSegmentId.value) || null
  })

  function getPortById(portId: string): Port | undefined {
    return ports.value.find((p) => p.id === portId)
  }

  function getRouteSegmentWithPorts(segmentId: string): RouteSegmentWithPorts | undefined {
    const segment = routeSegments.value.find((r) => r.id === segmentId)
    if (!segment) return undefined

    const fromPort = getPortById(segment.fromPortId)
    const toPort = getPortById(segment.toPortId)

    if (!fromPort || !toPort) return undefined

    return { ...segment, fromPort, toPort }
  }

  function getSegmentsFromPort(portId: string): RouteSegmentWithPorts[] {
    return routeSegments.value
      .filter((r) => r.fromPortId === portId && r.isActive)
      .map((r) => getRouteSegmentWithPorts(r.id))
      .filter((r): r is RouteSegmentWithPorts => r !== undefined)
  }

  function getSegmentsToPort(portId: string): RouteSegmentWithPorts[] {
    return routeSegments.value
      .filter((r) => r.toPortId === portId && r.isActive)
      .map((r) => getRouteSegmentWithPorts(r.id))
      .filter((r): r is RouteSegmentWithPorts => r !== undefined)
  }

  function getAllowedNextSegments(segmentId: string): RouteSegmentWithPorts[] {
    const segment = routeSegments.value.find((r) => r.id === segmentId)
    if (!segment) return []

    return segment.allowedNextSegments
      .map((id) => getRouteSegmentWithPorts(id))
      .filter((r): r is RouteSegmentWithPorts => r !== undefined)
  }

  // Actions - Port
  function selectPort(portId: string | null) {
    selectedPortId.value = portId
  }

  function createPort(port: Omit<Port, 'id' | 'createdAt' | 'updatedAt'>): Port {
    const newPort: Port = {
      ...port,
      id: `port-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    ports.value.push(newPort)
    apiPut('ports', ports.value)

    void logCrud({
      entityType: 'port',
      entityId: newPort.id,
      entityName: newPort.name,
      action: 'create'
    })
    return newPort
  }

  function updatePort(portId: string, updates: Partial<Omit<Port, 'id' | 'createdAt'>>) {
    const index = ports.value.findIndex((p) => p.id === portId)
    if (index !== -1) {
      const oldPort = ports.value[index]!
      ports.value[index] = {
        ...ports.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      } as Port
      apiPut('ports', ports.value)

      const updatedPort = ports.value[index]!
      void logCrud({
        entityType: 'port',
        entityId: portId,
        entityName: updatedPort.name,
        action: 'update',
        changes: generateChanges(oldPort, updatedPort)
      })
    }
  }

  function deletePort(portId: string): boolean {
    const isUsed = routeSegments.value.some(
      (r) => r.fromPortId === portId || r.toPortId === portId
    )
    if (isUsed) return false

    const index = ports.value.findIndex((p) => p.id === portId)
    if (index !== -1) {
      const removed = ports.value[index]!
      ports.value.splice(index, 1)
      if (selectedPortId.value === portId) selectedPortId.value = null
      apiPut('ports', ports.value)

      void logCrud({
        entityType: 'port',
        entityId: portId,
        entityName: removed.name,
        action: 'delete'
      })
      return true
    }
    return false
  }

  // Actions - RouteSegment
  function selectRouteSegment(segmentId: string | null) {
    selectedRouteSegmentId.value = segmentId
  }

  function getSegmentDisplayName(segment: RouteSegment): string {
    const fromName = getPortById(segment.fromPortId)?.name ?? segment.fromPortId
    const toName = getPortById(segment.toPortId)?.name ?? segment.toPortId
    return `${fromName}→${toName}`
  }

  function createRouteSegment(
    segment: Omit<RouteSegment, 'id' | 'createdAt' | 'updatedAt'>
  ): RouteSegment {
    const newSegment: RouteSegment = {
      ...segment,
      id: `route-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    routeSegments.value.push(newSegment)
    apiPut('route_segments', routeSegments.value)

    void logCrud({
      entityType: 'route',
      entityId: newSegment.id,
      entityName: getSegmentDisplayName(newSegment),
      action: 'create'
    })
    return newSegment
  }

  function updateRouteSegment(
    segmentId: string,
    updates: Partial<Omit<RouteSegment, 'id' | 'createdAt'>>
  ) {
    const index = routeSegments.value.findIndex((r) => r.id === segmentId)
    if (index !== -1) {
      const oldSegment = routeSegments.value[index]!
      routeSegments.value[index] = {
        ...routeSegments.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      } as RouteSegment
      apiPut('route_segments', routeSegments.value)

      const updatedSegment = routeSegments.value[index]!
      void logCrud({
        entityType: 'route',
        entityId: segmentId,
        entityName: getSegmentDisplayName(updatedSegment),
        action: 'update',
        changes: generateChanges(oldSegment, updatedSegment)
      })
    }
  }

  function deleteRouteSegment(segmentId: string) {
    const index = routeSegments.value.findIndex((r) => r.id === segmentId)
    if (index !== -1) {
      const removed = routeSegments.value[index]!
      routeSegments.value.splice(index, 1)
      if (selectedRouteSegmentId.value === segmentId) selectedRouteSegmentId.value = null
      apiPut('route_segments', routeSegments.value)

      void logCrud({
        entityType: 'route',
        entityId: segmentId,
        entityName: getSegmentDisplayName(removed),
        action: 'delete'
      })
    }
  }

  return {
    // State
    isLoading,
    ports,
    routeSegments,
    selectedPortId,
    selectedRouteSegmentId,

    // Getters
    activePorts,
    activeRouteSegments,
    selectedPort,
    selectedRouteSegment,

    // Helper functions
    getPortById,
    getRouteSegmentWithPorts,
    getSegmentsFromPort,
    getSegmentsToPort,
    getAllowedNextSegments,

    // Actions
    init,
    selectPort,
    createPort,
    updatePort,
    deletePort,
    selectRouteSegment,
    createRouteSegment,
    updateRouteSegment,
    deleteRouteSegment
  }
})
