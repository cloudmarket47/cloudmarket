import { Zap, Target, Hand, Sparkles } from 'lucide-react';

export function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      title: 'Ultra-Strong Bristles',
      description: 'No bend, no spoil. E fit handle any type of dirt wey dey stubborn.'
    },
    {
      icon: Target,
      title: 'Slim Edge Design',
      description: 'Fit every small corner. E go reach where you never even think about.'
    },
    {
      icon: Hand,
      title: 'Comfortable Grip',
      description: 'No hand pain. You fit use am for long time without stress.'
    },
    {
      icon: Sparkles,
      title: 'Multi-Surface Cleaning',
      description: 'Kitchen, bathroom, tiles, everywhere. One brush for all your cleaning needs.'
    }
  ];

  return (
    <section className="bg-gray-50 py-12 md:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Why This Brush Dey Special
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            E no be just ordinary brush. Check out wetin make am different!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-gradient-to-r from-[#0E7C7B] to-[#2B7FFF] text-white px-8 py-4 rounded-xl">
            <p className="font-bold text-lg">✨ Premium Quality, Affordable Price!</p>
          </div>
        </div>
      </div>
    </section>
  );
}
