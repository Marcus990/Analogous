"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { BackgroundGradient } from "@/components/BackgroundGradient";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const questions = [
  {
    title: "User Context",
    prompt: "Let’s start simple. What best describes you?",
    options: [
      "🎓 Student / Educator",
      "💼 Business / Professional",
      "🛠 Startup / Builder",
      "🎨 Creative / Personal Use",
      "🧪 Research / Science",
      "❓ Just Exploring",
    ],
  },
  {
    title: "Occupation / Field",
    prompt:
      "Great! What best matches your field or role?",
    optionsByContext: {
      Education: [
        "🏫 High School Student",
        "🎓 University Student",
        "📚 Grad Student / Researcher",
        "👩‍🏫 Educator / Professor",
        "🧑‍🏫 Teaching Assistant",
        "💻 Bootcamp / Continuing Education",
      ],
      Business: [
        "🛠 Engineer",
        "💻 Software Developer",
        "🗄 Data Engineer",
        "🤖 Machine Learning Engineer",
        "📦 Product Manager",
        "📊 Data Analyst / Scientist",
        "📞 Sales / Customer Success",
        "📈 Marketing / Growth",
        "🎨 Designer",
        "👔 Executive / Manager",
        "🗂 Consultant",
        "⚙️ Operations",
        "🧑‍🤝‍🧑 HR / People",
        "💰 Finance / Accounting",
        "⚖️ Legal / Compliance",
      ],
      Startup: [
        "🚀 Founder",
        "👨‍💻 Technical Co-founder",
        "🛠 Indie Hacker",
        "📦 Operator / PM",
        "💻 Engineer",
        "🎨 Designer",
        "📈 Growth / Marketing",
        "💸 Pitching / Fundraising",
      ],
      Creative: [
        "✍️ Writer",
        "🎨 Designer / Artist",
        "🎥 Content Creator",
        "🎵 Musician",
        "📸 Photographer",
        "🎬 Filmmaker / Video",
        "🎯 Hobbyist",
      ],
      Research: [
        "📚 PhD Researcher",
        "🧪 Lab Scientist",
        "🛠 Engineer",
        "🔬 Student Researcher",
      ],
      Exploring: [
        "🧭 Curious Explorer",
        "🔄 Career Transition",
        "📖 Lifelong Learner",
      ],
    },
  },
  {
    title: "Analogy Style",
    prompt: "What kind of analogies do you vibe with? Pick all that fit.",
    multiple: true,
    options: [
      "🧠 Logical and concise",
      "😄 Funny and witty",
      "🧪 Nerdy or scientific",
      "🎨 Visual or artistic",
      "🎭 Deep and philosophical",
      "💼 Professional and polished",
      "🧩 Weird but clever",
    ],
  },
  {
    title: "Topics",
    prompt:
      "What topics do you want analogies for? Pick up to 3.",
    multiple: true,
    limit: 3,
    options: [
      "🧠 Tech / Engineering",
      "📈 Business / Startups",
      "🧬 Science / Biology",
      "🧮 Math / Logic",
      "🧘 Psychology / Philosophy",
      "🎨 Art / Design",
      "💰 Finance / Investing",
      "⚽ Sports",
      "🎮 Gaming",
      "🎥 Pop Culture / TV",
      "🌎 Everyday Life",
    ],
  },
  {
    title: "Hobbies",
    prompt: "What are some things you enjoy doing? Add as many as you like.",
    multiple: true,
    options: [
      "🎮 Gaming",
      "🏋️ Fitness / Wellness",
      "🏀 Sports",
      "🧑‍🍳 Cooking / Food",
      "🎵 Music",
      "✈️ Travel",
      "♟ Strategy / Puzzles",
      "🎥 TV / Movies",
      "🤖 Tech / AI",
      "📚 Reading",
      "🎨 Art / Design",
    ],
  },
  {
    title: "Likes",
    prompt:
      "What are some things you like? Pick up to 3.",
    multiple: true,
    limit: 3,
    options: [
      "🍕 Pizza",
      "🧠 Solving problems",
      "🧼 Clean design",
      "💡 Learning something new",
      "🎶 Good music",
      "✍️ Explaining concepts",
      "🔍 Discovering patterns",
      "🛌 Sleeping in",
      "☕ Morning coffee",
      "📈 Progress / growth",
    ],
  },
  {
    title: "Dislikes",
    prompt:
      "What do you dislike or find annoying? Pick up to 3.",
    multiple: true,
    limit: 3,
    options: [
      "⏳ Waiting",
      "🧍 Group projects",
      "🐞 Bugs in code",
      "🗒️ Long instructions",
      "😴 Early mornings",
      "📶 Slow WiFi",
      "🔄 Repetition",
      "📢 Unskippable ads",
      "💬 Small talk",
    ],
  },
];


export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  

  const question = questions[step];

  

  const handleSelect = (option: string) => {
    const prev = answers[question.title] || [];
    const isMulti = question.multiple;

    let updated = isMulti
      ? prev.includes(option)
        ? prev.filter((o: string) => o !== option)
        : question.limit && prev.length >= question.limit
        ? prev
        : [...prev, option]
      : option;

    setAnswers({ ...answers, [question.title]: updated });

    // Auto-advance for single-choice steps
    const isLastStep = step >= questions.length - 1;
    if (!isMulti && !isLastStep) {
      setTimeout(() => {
        setStep((prevStep) => Math.min(prevStep + 1, questions.length - 1));
      }, 300);
    }
  };
  

  const goToNext = () =>
    setStep((prev) => Math.min(prev + 1, questions.length - 1));

  const contextOption = answers["User Context"] as string | undefined;
  const contextKey = contextOption
    ? contextOption.includes("Student")
      ? "Education"
      : contextOption.includes("Business")
      ? "Business"
      : contextOption.includes("Startup")
      ? "Startup"
      : contextOption.includes("Creative")
      ? "Creative"
      : contextOption.includes("Research")
      ? "Research"
      : contextOption.includes("Exploring")
      ? "Exploring"
      : ""
    : "";

  const dynamicOptions = useMemo(() => {
    const opts =
      question.options ||
      question.optionsByContext?.[
        contextKey as keyof typeof question.optionsByContext
      ];
    return opts ?? [];
  }, [question, contextKey]);

  

  const handleSubmit = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      console.error("No user found or error fetching user:", userError);
      return;
    }

    const payload = {
      user_id: user.id,
      context: answers["User Context"],
      occupation: answers["Occupation / Field"],
      analogy_styles: answers["Analogy Style"] || [],
      interests: answers["Topics"] || [],
      hobbies: answers["Hobbies"] || [],
      likes: answers["Likes"] || [],
      dislikes: answers["Dislikes"] || [],
    };

    const { error } = await supabase
      .from("personality_answers")
      .insert([payload]);

    if (error) {
      console.error("Error inserting onboarding data:", error.message);
    } else {
      sessionStorage.setItem("onboarding-dismissed", "true");
      onComplete();
    }
  };

  return (
    <BackgroundGradient className="w-full rounded-lg sm:rounded-lg px-4 sm:px-8 py-6 sm:py-10 text-white flex flex-col items-center justify-start max-h-[90vh] overflow-y-auto">
      <div className="scrollbar-gray">
      <div className="text-center mb-3 sm:mb-4 text-xs sm:text-sm text-gray-400">Step {step + 1} of {questions.length}</div>
      <div className="w-full max-w-xl mb-4 sm:mb-6">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60"
            style={{ width: `${Math.round(((step + 1) / questions.length) * 100)}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="w-full flex flex-col items-center"
        >
          <h1 className="text-xl sm:text-2xl font-semibold sm:font-bold mb-4 sm:mb-6 text-center leading-snug">
            {question.prompt}
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl w-full">
            {dynamicOptions?.map((opt: string, idx: number) => {
              const isSelected = question.multiple
                ? (answers[question.title] || []).includes(opt)
                : answers[question.title] === opt;
              return (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  key={idx}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "group rounded-lg p-4 sm:p-5 border backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all duration-200 text-left shadow-sm",
                    isSelected ? "border-white/80 ring-1 ring-white/40" : "border-white/10"
                  )}
                  aria-pressed={isSelected}
                >
                  <span className="font-sans sm:text-lg leading-relaxed">{opt}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="mt-8 sm:mt-10 flex flex-col items-center space-y-3 sm:space-y-4">
            {step < questions.length - 1 && (
              <>
                <button
                  onClick={goToNext}
                  disabled={question.multiple ? !(answers[question.title] && answers[question.title].length > 0) : !answers[question.title]}
                  className={cn(
                    "text-sm underline transition",
                    question.multiple
                      ? !(answers[question.title] && answers[question.title].length > 0)
                        ? "text-gray-500 cursor-not-allowed"
                        : "text-gray-300 hover:text-white"
                      : !answers[question.title]
                      ? "text-gray-500 cursor-not-allowed"
                      : "text-gray-300 hover:text-white"
                  )}
                >
                  Next
                </button>

                {step > 0 && (
                  <button onClick={goToNext} className="text-xs text-gray-500 hover:text-gray-300">
                    Skip this question
                  </button>
                )}
              </>
            )}

            {step === questions.length - 1 && (
              <button
                onClick={handleSubmit}
                className={cn(
                  "mt-6 text-sm text-white border border-white/50 px-4 py-2 rounded-lg transition-all hover:border-white"
                )}
              >
                Finish & Close
              </button>
            )}
          </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </BackgroundGradient>
  );
}
