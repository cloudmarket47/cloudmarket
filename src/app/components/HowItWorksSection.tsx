import { ArrowRight } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      number: '1',
      title: 'Insert the brush into gap',
      description: 'Put the brush for the corner or crevice wey you wan clean.',
      emoji: '🔍'
    },
    {
      number: '2',
      title: 'Scrub gently',
      description: 'Move the brush back and forth. The strong bristles go remove all the dirt.',
      emoji: '💪'
    },
    {
      number: '3',
      title: 'Wipe clean',
      description: 'Use cloth or water to wipe. Your corner go dey shine like new!',
      emoji: '✨'
    }
  ];

  return (
    <section className="bg-white py-12 md:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            How to Use Am – E Simple Pass!
          </h2>
          <p className="text-lg md:text-xl text-gray-600">
            Just 3 easy steps and your place go dey clean sotey!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300">
                {/* Step Number */}
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] w-16 h-16 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl font-bold">{step.number}</span>
                  </div>
                </div>

                {/* Emoji */}
                <div className="text-6xl text-center mb-4">{step.emoji}</div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed text-center">
                  {step.description}
                </p>
              </div>

              {/* Arrow between steps (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-8 h-8 text-[#0E7C7B]" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-[#FF7A00]/10 text-[#FF7A00] px-8 py-4 rounded-xl">
            <p className="font-bold text-lg">⏱️ Takes only 30 seconds to clean any corner!</p>
          </div>
        </div>
      </div>
    </section>
  );
}
