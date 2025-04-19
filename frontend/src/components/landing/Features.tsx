import React from 'react';

const features = [
  {
    title: 'Simple Explanations',
    description: 'Complex topics broken down into easy-to-understand analogies.',
    icon: '🎯'
  },
  {
    title: 'Wide Range of Topics',
    description: 'From programming concepts to mathematical theories.',
    icon: '📚'
  },
  {
    title: 'Community Driven',
    description: 'Learn from and contribute to a growing knowledge base.',
    icon: '🤝'
  },
  {
    title: 'Visual Learning',
    description: 'Accompanied by relevant examples and illustrations.',
    icon: '🎨'
  }
];

export function Features() {
  return (
    <div className="py-12 bg-gray-50" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            A Better Way to Learn
          </p>
        </div>

        <div className="mt-10">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="relative">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-medium text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-base text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 