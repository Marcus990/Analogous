'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

export default function Modal({
  children,
  onClose
}: {
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-transparent text-white p-0 rounded-lg max-w-3xl w-[90%] relative"
      >
        {/* Optional close button */}
        <button
          onClick={onClose}
          className="z-50 absolute top-3 right-4 text-gray-400 hover:text-white text-2xl"
        >
          &times;
        </button>
        {children}
      </motion.div>
    </div>
  )
}
