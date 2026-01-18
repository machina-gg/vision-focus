import React, { useState } from 'react'

import { Plus, Edit2, Trash2, GripVertical, Target } from 'lucide-react'

import { Button, Card } from '~/components/ui'
import { GoalEditor } from '../GoalEditor'
import type { Goal } from '~/types/storage'
import { getMessage } from '~/lib/i18n'

export interface GoalListProps {
  goals: Goal[]
  onAdd: (goal: Omit<Goal, 'id' | 'createdAt' | 'order'>) => void
  onUpdate: (id: string, goal: Omit<Goal, 'id' | 'createdAt' | 'order'>) => void
  onDelete: (id: string) => void
  onReorder: (goals: Goal[]) => void
  maxGoals?: number
  disabled?: boolean
}

export function GoalList({
  goals,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  maxGoals = Infinity,
  disabled = false,
}: GoalListProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const canAddMore = goals.length < maxGoals

  const handleAddClick = () => {
    setEditingGoal(null)
    setIsEditorOpen(true)
  }

  const handleEditClick = (goal: Goal) => {
    setEditingGoal(goal)
    setIsEditorOpen(true)
  }

  const handleSave = (goalData: Omit<Goal, 'id' | 'createdAt' | 'order'>) => {
    if (editingGoal) {
      onUpdate(editingGoal.id, goalData)
    } else {
      onAdd(goalData)
    }
    setIsEditorOpen(false)
    setEditingGoal(null)
  }

  const handleCancel = () => {
    setIsEditorOpen(false)
    setEditingGoal(null)
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newGoals = [...goals]
    const draggedGoal = newGoals[draggedIndex]
    newGoals.splice(draggedIndex, 1)
    newGoals.splice(index, 0, draggedGoal)

    // Update order property
    const reorderedGoals = newGoals.map((g, i) => ({ ...g, order: i }))
    onReorder(reorderedGoals)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Goal Items */}
      <div className="space-y-2">
        {goals.length === 0 ? (
          <Card variant="default" padding="md">
            <div className="text-center py-4">
              <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{getMessage('noGoals')}</p>
            </div>
          </Card>
        ) : (
          goals
            .sort((a, b) => a.order - b.order)
            .map((goal, index) => (
              <div
                key={goal.id}
                draggable={!disabled && goals.length > 1}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  group flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg
                  transition-all
                  ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                  ${!disabled && goals.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}
                `}
              >
                {/* Drag Handle */}
                {goals.length > 1 && (
                  <div className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}

                {/* Color Indicator */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-300"
                  style={{ backgroundColor: goal.color }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{goal.text}</p>
                  {goal.subText && (
                    <p className="text-sm text-gray-500 truncate">{goal.subText}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditClick(goal)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                    title={getMessage('edit')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(goal.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                    title={getMessage('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Add Button */}
      {canAddMore ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAddClick}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          {getMessage('addGoal')}
        </Button>
      ) : (
        <p className="text-sm text-gray-500 text-center">
          {getMessage('maxGoalsReached', { count: maxGoals.toString() })}
        </p>
      )}

      {/* Editor Modal */}
      <GoalEditor
        goal={editingGoal}
        onSave={handleSave}
        onCancel={handleCancel}
        isOpen={isEditorOpen}
      />
    </div>
  )
}
