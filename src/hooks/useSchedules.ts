import { useCallback, useState } from 'react'

import { storage } from '~/lib/storage'
import type { AppSettings, Schedule } from '~/types/storage'

export interface ScheduleFormData {
  name: string
  startTime: string
  endTime: string
  days: number[]
  presetId: string
}

const DEFAULT_SCHEDULE_FORM: ScheduleFormData = {
  name: '',
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 2, 3, 4, 5],
  presetId: '',
}

interface UseSchedulesOptions {
  settings: AppSettings | undefined
  setSettings: (settings: AppSettings) => void
}

interface UseSchedulesReturn {
  showScheduleModal: boolean
  setShowScheduleModal: (show: boolean) => void
  editingSchedule: Schedule | null
  scheduleForm: ScheduleFormData
  setScheduleForm: (form: ScheduleFormData) => void
  handleSaveSchedule: () => Promise<void>
  handleDeleteSchedule: (id: string) => Promise<void>
  handleToggleSchedule: (id: string, enabled: boolean) => Promise<void>
  openEditSchedule: (schedule: Schedule) => void
  openAddSchedule: () => void
}

export function useSchedules({
  settings,
  setSettings,
}: UseSchedulesOptions): UseSchedulesReturn {
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>(DEFAULT_SCHEDULE_FORM)

  const handleSaveSchedule = useCallback(async () => {
    if (!settings || !scheduleForm.name.trim()) return

    const newSchedule: Schedule = {
      id: editingSchedule?.id || crypto.randomUUID(),
      name: scheduleForm.name,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      days: scheduleForm.days,
      enabled: true,
      presetId: scheduleForm.presetId || undefined,
    }

    const updatedSchedules = editingSchedule
      ? settings.schedules.map((s) => (s.id === editingSchedule.id ? newSchedule : s))
      : [...settings.schedules, newSchedule]

    const updated = { ...settings, schedules: updatedSchedules }
    await storage.set('settings', updated)
    setSettings(updated)
    setShowScheduleModal(false)
    setEditingSchedule(null)
    setScheduleForm(DEFAULT_SCHEDULE_FORM)
  }, [settings, setSettings, scheduleForm, editingSchedule])

  const handleDeleteSchedule = useCallback(async (id: string) => {
    if (!settings) return
    const updated = { ...settings, schedules: settings.schedules.filter((s) => s.id !== id) }
    await storage.set('settings', updated)
    setSettings(updated)
  }, [settings, setSettings])

  const handleToggleSchedule = useCallback(async (id: string, enabled: boolean) => {
    if (!settings) return
    const updated = {
      ...settings,
      schedules: settings.schedules.map((s) => (s.id === id ? { ...s, enabled } : s)),
    }
    await storage.set('settings', updated)
    setSettings(updated)
  }, [settings, setSettings])

  const openEditSchedule = useCallback((schedule: Schedule) => {
    setEditingSchedule(schedule)
    setScheduleForm({
      name: schedule.name,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      days: schedule.days,
      presetId: schedule.presetId || '',
    })
    setShowScheduleModal(true)
  }, [])

  const openAddSchedule = useCallback(() => {
    setEditingSchedule(null)
    setScheduleForm(DEFAULT_SCHEDULE_FORM)
    setShowScheduleModal(true)
  }, [])

  return {
    showScheduleModal,
    setShowScheduleModal,
    editingSchedule,
    scheduleForm,
    setScheduleForm,
    handleSaveSchedule,
    handleDeleteSchedule,
    handleToggleSchedule,
    openEditSchedule,
    openAddSchedule,
  }
}
