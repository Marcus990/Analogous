import React from 'react';
import type { Analogy } from '@/types/analogy';

interface AnalogyCardProps {
  analogy: Analogy;
}

export function AnalogyCard({ analogy }: AnalogyCardProps) {
  return (
    <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <h2 className="text-xl font-bold mb-2">{analogy.topic}</h2>
      <p className="text-gray-600 mb-4">{analogy.explanation}</p>
      <p className="text-sm text-gray-400">
        Created: {new Date(analogy.created_at).toLocaleDateString()}
      </p>
    </div>
  );
} 