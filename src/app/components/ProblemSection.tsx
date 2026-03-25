import { XCircle } from 'lucide-react';

export function ProblemSection() {
  const problems = [
    {
      icon: '🦠',
      title: 'Dirt dey hide for tile gaps',
      description: 'Normal brush no fit reach the small-small corners, so dirt just dey pile up.'
    },
    {
      icon: '🧫',
      title: 'Mold dey for bathroom corners',
      description: 'Wet corners dey get mold and e no dey go, e dey smell bad.'
    },
    {
      icon: '🍳',
      title: 'Grease dey kitchen edges',
      description: 'Kitchen grease dey stick for edges and normal cleaning no fit take am comot.'
    }
  ];

  return (
    <section className="bg-gray-50 py-12 md:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Still dey Struggle to Clean Tight Corners?
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            You dey clean, you dey clean, but some places still dirty. E dey frustrate you, abi?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {problems.map((problem, index) => (
            <div 
              key={index}
              className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="text-5xl">{problem.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{problem.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{problem.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 bg-red-50 text-red-700 px-6 py-4 rounded-xl">
            <XCircle className="w-6 h-6" />
            <p className="font-semibold text-lg">No need to suffer again! Solution dey here!</p>
          </div>
        </div>
      </div>
    </section>
  );
}
