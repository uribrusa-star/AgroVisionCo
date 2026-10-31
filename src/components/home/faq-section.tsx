import React from 'react';
import { FAQ_ITEMS } from '@/lib/faq';
import { ChevronDown } from 'lucide-react';

export function FaqSection() {
  return (
    <section className="py-24 bg-white dark:bg-green-950 px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-green-50 sm:text-4xl">
          Preguntas Frecuentes
        </h2>
        <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-green-200/80">
          Resolvemos tus dudas principales para que puedas empezar a transformar tu campo hoy mismo.
        </p>
      </div>
      <div className="bg-gray-50 dark:bg-green-900/20 rounded-3xl p-6 md:p-10 border border-gray-100 dark:border-green-800/50 shadow-sm">
        <div className="divide-y divide-gray-200 dark:divide-green-800/60">
          {FAQ_ITEMS.map((item, index) => (
            <details
              key={index}
              className="group py-4 first:pt-0 last:pb-0"
            >
              <summary className="flex justify-between items-center cursor-pointer list-none text-lg font-semibold text-gray-800 dark:text-green-100 select-none hover:text-green-700 dark:hover:text-green-300 transition-colors">
                <span>{item.question}</span>
                <ChevronDown className="h-5 w-5 text-gray-500 dark:text-green-300/70 transition-transform duration-200 group-open:rotate-180 flex-shrink-0 ml-4" />
              </summary>
              <p className="mt-3 text-base text-gray-600 dark:text-green-200/80 leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
