import React, { useState, useEffect } from 'react'

import { X, Save } from 'lucide-react'

import { Button } from '~/components/ui'
import type { Goal } from '~/types/storage'
import { getMessage } from '~/lib/i18n'

export interface GoalEditorProps {
  goal?: Goal | null
  onSave: (goal: Omit<Goal, 'id' | 'createdAt' | 'order'>) => void
  onCancel: () => void
  isOpen: boolean
}

const COLOR_OPTIONS = [
  '#ffffff', // White
  '#fef3c7', // Amber 100
  '#dcfce7', // Green 100
  '#dbeafe', // Blue 100
  '#fce7f3', // Pink 100
  '#f3e8ff', // Purple 100
  '#ecfeff', // Cyan 100
  '#ffedd5', // Orange 100
]

export function GoalEditor({ goal, onSave, onCancel, isOpen }: GoalEditorProps) {
  const [text, setText] = useState('')
  const [subText, setSubText] = useState('')
  const [color, setColor] = useState('#ffffff')

  useEffect(() => {
    if (goal) {
      setText(goal.text)
      setSubText(goal.subText)
      setColor(goal.color)
    } else {
      setText('')
      setSubText('')
      setColor('#ffffff')
    }
  }, [goal, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    onSave({
      text: text.trim(),
      subText: subText.trim(),
      color,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {goal ? getMessage('editGoal') : getMessage('addGoal')}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Goal Text */}
          <div>
            <label
              htmlFor="goal-text"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {getMessage('goalText')}
            </label>
            <input
              id="goal-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={getMessage('goalTextPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Sub Text */}
          <div>
            <label
              htmlFor="goal-subtext"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {getMessage('goalSubText')}
            </label>
            <textarea
              id="goal-subtext"
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
              placeholder={getMessage('goalSubTextPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getMessage('textColor')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`
                    w-8 h-8 rounded-full border-2 transition-transform
                    ${color === c ? 'border-primary-500 scale-110' : 'border-gray-200'}
                  `}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-900 rounded-lg">
            <p
              className="text-2xl font-bold text-center"
              style={{ color }}
            >
              {text || getMessage('previewText')}
            </p>
            {subText && (
              <p
                className="text-sm text-center mt-1 opacity-80"
                style={{ color }}
              >
                {subText}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
            >
              {getMessage('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!text.trim()}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {getMessage('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
