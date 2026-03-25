import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function ProductShowcaseSection() {
  const [selectedImage, setSelectedImage] = useState(0);

  const images = [
    {
      url: 'https://images.unsplash.com/photo-1654166604842-d414ea1884cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbmluZyUyMGJydXNoJTIwY3JldmljZSUyMG5hcnJvdyUyMGNvcm5lcnxlbnwxfHx8fDE3NzA5OTc4NDB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      alt: 'Crevice Cleaning Brush - Main View'
    },
    {
      url: 'https://images.unsplash.com/photo-1765556556784-7656ee0a1bd8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMG1vZGVybiUyMGtpdGNoZW4lMjB0aWxlc3xlbnwxfHx8fDE3NzA5OTc4NDF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      alt: 'Crevice Cleaning Brush - In Use'
    },
    {
      url: 'https://images.unsplash.com/photo-1654166604842-d414ea1884cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbmluZyUyMGJydXNoJTIwY3JldmljZSUyMG5hcnJvdyUyMGNvcm5lcnxlbnwxfHx8fDE3NzA5OTc4NDB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      alt: 'Crevice Cleaning Brush - Close Up'
    }
  ];

  return (
    <section className="bg-gray-50 py-12 md:py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            See the Brush for Yourself
          </h2>
          <p className="text-lg md:text-xl text-gray-600">
            Quality wey you fit see with your eyes!
          </p>
        </div>

        {/* Main Product Image */}
        <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-8 mb-6">
          <ImageWithFallback
            src={images[selectedImage].url}
            alt={images[selectedImage].alt}
            className="w-full h-auto rounded-2xl"
          />
        </div>

        {/* Thumbnail Images */}
        <div className="grid grid-cols-3 gap-4">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`bg-white rounded-xl p-2 shadow-md hover:shadow-lg transition-all duration-300 ${
                selectedImage === index ? 'ring-4 ring-[#0E7C7B] scale-105' : ''
              }`}
            >
              <ImageWithFallback
                src={image.url}
                alt={image.alt}
                className="w-full h-auto rounded-lg"
              />
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <div className="inline-block bg-gradient-to-r from-[#0E7C7B] to-[#2B7FFF] text-white px-8 py-4 rounded-xl">
            <p className="font-bold text-lg">📦 Premium Quality Brush – Built to Last!</p>
          </div>
        </div>
      </div>
    </section>
  );
}
