"use client"

import type React from "react"

import { X } from "lucide-react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-md" }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/95" onClick={onClose} />
      <div className={`relative bg-white border-2 border-black ${maxWidth} w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white border-b-2 border-black p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tighter text-black">{title}</h2>
          <button onClick={onClose} className="border border-black p-2 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-black" />
          </button>
        </div>
        <div className="p-6 text-black">{children}</div>
      </div>
    </div>
  )
}
