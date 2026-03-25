import { Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function SocialProofSection() {
  const reviews = [
    {
      name: 'Akosua Mensah',
      location: 'Accra',
      image: 'https://images.unsplash.com/photo-1723922969507-5285cff3d8a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwd29tYW4lMjBzbWlsaW5nJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzcwODg5MzM4fDA&ixlib=rb-4.1.0&q=80&w=1080',
      rating: 5,
      review: 'This brush dey super! My kitchen don dey clean for corner-corner. No stress at all. I go buy more for my sisters dem.'
    },
    {
      name: 'Kwame Boateng',
      location: 'Kumasi',
      image: 'https://images.unsplash.com/photo-1625181796571-7f0d4571ab12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwbWFuJTIwc21pbGluZyUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MDk5Nzg0MHww&ixlib=rb-4.1.0&q=80&w=1080',
      rating: 5,
      review: 'Herh! This thing powerful oo. E remove all the mold for my bathroom corner. I dey recommend am for everybody.'
    },
    {
      name: 'Ama Owusu',
      location: 'Takoradi',
      image: 'https://images.unsplash.com/photo-1723922969507-5285cff3d8a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwd29tYW4lMjBzbWlsaW5nJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzcwODg5MzM4fDA&ixlib=rb-4.1.0&q=80&w=1080',
      rating: 5,
      review: 'Best thing I buy this year! E dey work proper. My tiles dey shine like mirror. I buy 2 more for my friends.'
    },
    {
      name: 'Kofi Asante',
      location: 'Tema',
      image: 'https://images.unsplash.com/photo-1625181796571-7f0d4571ab12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwbWFuJTIwc21pbGluZyUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MDk5Nzg0MHww&ixlib=rb-4.1.0&q=80&w=1080',
      rating: 5,
      review: 'For real, this brush no be joke! E fit reach places wey I never even know dey dirty. Worth every cedi!'
    }
  ];

  return (
    <section className="bg-white py-12 md:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            See Wetin People Dey Talk!
          </h2>
          <p className="text-lg md:text-xl text-gray-600">
            Over 5,000+ satisfied customers across Ghana 🇬🇭
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {reviews.map((review, index) => (
            <div 
              key={index}
              className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-[#FF7A00] text-[#FF7A00]" />
                ))}
              </div>

              {/* Review Text */}
              <p className="text-gray-700 text-lg leading-relaxed mb-6 italic">
                "{review.review}"
              </p>

              {/* Reviewer Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  <ImageWithFallback
                    src={review.image}
                    alt={review.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{review.name}</p>
                  <p className="text-gray-600 text-sm">{review.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700 px-8 py-4 rounded-xl">
            <p className="font-bold text-lg">⭐ 4.9/5 Rating from 5,000+ Reviews!</p>
          </div>
        </div>
      </div>
    </section>
  );
}
