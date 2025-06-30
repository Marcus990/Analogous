'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { BackgroundGradient } from '@/components/BackgroundGradient'

interface OnboardingFlowProps {
  onComplete: () => void
}

const questions = [
  {
    title: 'User Context',
    prompt: 'Which best describes your current context?',
    options: [
      '🎓 Education (Student or Educator)',
      '💼 Business / Professional',
      '🛠 Startup / Builder',
      '🎨 Creative / Personal Use',
      '🧪 Research / Science',
      '❓ Just Exploring',
    ],
  },
  {
    title: 'Occupation / Field',
    prompt: 'What best matches your field or role?',
    optionsByContext: {
      Education: [
        'High School Student',
        'University Student',
        'Grad Student / Researcher',
        'Educator / Professor',
      ],
      Business: [
        'Software Developer',
        'Product Manager',
        'Data Analyst / Scientist',
        'Sales / Customer Success',
        'Marketing / Growth',
        'Executive / Manager',
        'Consultant',
      ],
      Startup: [
        'Founder',
        'Technical Co-founder',
        'Indie Hacker',
        'Operator / PM',
        'Pitching / Fundraising',
      ],
      Creative: [
        'Writer',
        'Designer / Artist',
        'Content Creator',
        'Musician',
        'Hobbyist',
      ],
      Research: [
        'PhD Researcher',
        'Lab Scientist',
        'Engineer',
        'Student Researcher',
      ],
      Exploring: [],
    },
  },
  {
    title: 'Analogy Style',
    prompt: 'What kind of analogies do you vibe with?',
    multiple: true,
    options: [
      '🧠 Logical and concise',
      '😄 Funny and witty',
      '🧪 Nerdy or scientific',
      '🎨 Visual or artistic',
      '🎭 Deep and philosophical',
      '💼 Professional and polished',
      '🧩 Weird but clever',
    ],
  },
  {
    title: 'Topics',
    prompt: 'What topics do you want analogies for? (Up to 3)',
    multiple: true,
    limit: 3,
    options: [
      '🧠 Tech / Engineering',
      '📈 Business / Startups',
      '🧬 Science / Biology',
      '🧮 Math / Logic',
      '🧘 Psychology / Philosophy',
      '🎨 Art / Design',
      '💰 Finance / Investing',
      '⚽ Sports',
      '🎮 Gaming',
      '🎥 Pop Culture / TV',
      '🌎 Everyday Life',
    ],
  },
  {
    title: 'Hobbies',
    prompt: 'What are some things you enjoy doing?',
    multiple: true,
    options: [
      '🎮 Gaming',
      '🧘 Fitness / Wellness',
      '🏀 Sports',
      '🧑‍🍳 Cooking / Food',
      '🎵 Music',
      '✈️ Travel',
      '♟ Strategy / Puzzles',
      '🎥 TV / Movies',
      '✨ Tech / AI',
      '📚 Reading',
      '🎨 Art / Design',
      'Other',
    ],
  },
  {
    title: 'Likes',
    prompt: 'What are some things you like or find satisfying? (Up to 3)',
    multiple: true,
    limit: 3,
    options: [
      '🍕 Pizza',
      '🧠 Solving problems',
      '🧼 Clean design',
      '💡 Learning something new',
      '🎶 Good music',
      '✍️ Explaining concepts',
      '🔍 Discovering patterns',
      '🛌 Sleeping in',
      '🌅 Morning coffee',
      '📈 Progress / growth',
      'Other',
    ],
  },
  {
    title: 'Dislikes',
    prompt: 'What do you dislike or find annoying? (Up to 3)',
    multiple: true,
    limit: 3,
    options: [
      '⏳ Waiting',
      '🧍 Group projects',
      '🐞 Bugs in code',
      '🗒️ Long instructions',
      '😴 Early mornings',
      '📶 Slow WiFi',
      '🔄 Repetition',
      '📢 Unskippable ads',
      '💬 Small talk',
      'Other',
    ],
  },
]

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})

  const question = questions[step]

  const handleSelect = (option: string) => {
    const prev = answers[question.title] || []
    const isMulti = question.multiple
    const isLimit = question.limit && prev.includes(option)

    let updated = isMulti
      ? prev.includes(option)
        ? prev.filter((o: string) => o !== option)
        : question.limit && prev.length >= question.limit
        ? prev
        : [...prev, option]
      : option

    setAnswers({ ...answers, [question.title]: updated })
  }

  const goToNext = () => setStep((prev) => Math.min(prev + 1, questions.length - 1))

  const contextOption = answers['User Context'] as string | undefined
  const contextKey = contextOption
    ? contextOption.includes('Education') ? 'Education'
    : contextOption.includes('Business') ? 'Business'
    : contextOption.includes('Startup') ? 'Startup'
    : contextOption.includes('Creative') ? 'Creative'
    : contextOption.includes('Research') ? 'Research'
    : contextOption.includes('Exploring') ? 'Exploring'
    : ''
    : ''

  const dynamicOptions = question.options || question.optionsByContext?.[contextKey as keyof typeof question.optionsByContext]

  const handleSubmit = async () => {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (!user || userError) {
      console.error('No user found or error fetching user:', userError)
      return
    }

    const payload = {
      user_id: user.id,
      context: answers['User Context'],
      occupation: answers['Occupation / Field'],
      analogy_styles: answers['Analogy Style'] || [],
      interests: answers['Topics'] || [],
      hobbies: answers['Hobbies'] || [],
      likes: answers['Likes'] || [],
      dislikes: answers['Dislikes'] || []
    }

    const { error } = await supabase.from('personality_answers').insert([payload])

    if (error) {
      console.error('Error inserting onboarding data:', error.message)
    } else {
      sessionStorage.setItem('onboarding-dismissed', 'true')
      onComplete()
    }
  }

  return (
    <BackgroundGradient className="w-full rounded-lg px-8 py-10 text-white flex flex-col items-center justify-center">
        <div className="mb-6 text-sm text-gray-400">Step {step + 1} of {questions.length}</div>
        <h1 className="text-2xl font-bold mb-4 text-center">{question.prompt}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl w-full">
            {dynamicOptions?.map((opt: string, idx: number) => (
            <button
                key={idx}
                onClick={() => handleSelect(opt)}
                className={cn(
                'rounded-lg p-4 border backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all duration-200',
                question.multiple
                    ? (answers[question.title] || []).includes(opt)
                    ? 'border-white/80'
                    : 'border-white/20'
                    : answers[question.title] === opt
                    ? 'border-white/80'
                    : 'border-white/20'
                )}
            >
                {opt}
            </button>
            ))}
        </div>
        <div className="mt-10 flex flex-col items-center space-y-4">
        {step < questions.length - 1 && (
            <>
                <button
                onClick={goToNext}
                disabled={
                    question.multiple
                    ? !(answers[question.title] && answers[question.title].length > 0)
                    : !answers[question.title]
                }
                className={cn(
                    'text-sm underline transition',
                    question.multiple
                    ? !(answers[question.title] && answers[question.title].length > 0)
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'text-gray-300 hover:text-white'
                    : !answers[question.title]
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'text-gray-300 hover:text-white'
                )}
                >
                Next
                </button>

                {step > 0 && (
                <button
                    onClick={goToNext}
                    className="text-xs text-gray-500 hover:text-gray-300"
                >
                    Skip this question
                </button>
                )}
            </>
            )}

            {step === questions.length - 1 && (
            <button
                onClick={handleSubmit}
                className="mt-6 text-sm text-white border border-white/50 px-4 py-2 rounded-lg hover:border-white transition-all"
            >
                Finish & Close
            </button>
            )}
        </div>
    </BackgroundGradient>

  )
}
