import React from 'react';
import { motion } from 'motion/react';
import { 
  Laptop, 
  Megaphone, 
  Handshake, 
  Coins, 
  Sparkles,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

interface Category {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const categories: Category[] = [
  {
    id: 'tech',
    title: 'Technology',
    subtitle: 'Software, Data, IT, Product',
    icon: <Laptop className="w-6 h-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
  },
  {
    id: 'marketing',
    title: 'Marketing',
    subtitle: 'Growth, Content, Brand',
    icon: <Megaphone className="w-6 h-6" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
  },
  {
    id: 'sales',
    title: 'Sales',
    subtitle: 'Account Mgmt, BD, Success',
    icon: <Handshake className="w-6 h-6" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-100',
  },
  {
    id: 'finance',
    title: 'Finance',
    subtitle: 'Banking, Accounting, Fintech',
    icon: <Coins className="w-6 h-6" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
  },
  {
    id: 'other',
    title: 'Other',
    subtitle: 'General roles and specialized fields',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
  },
];

interface LandingPageProps {
  onSelectCategory: (category: string) => void;
}

export default function LandingPage({ onSelectCategory }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#FDFDFF] relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-50/50 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full space-y-12 relative z-10"
      >
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
          >
            Step 1: Select Your Field
          </motion.div>
          <h1 className="text-5xl font-bold text-slate-900 tracking-tight">
            Which area are you <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              hiring for?
            </span>
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Select a category to start ranking resumes with our specialized AI models tailored for your industry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => onSelectCategory(category.id)}
              className={`group relative flex items-start gap-6 p-8 bg-white border-2 ${category.borderColor} rounded-[32px] text-left transition-all hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-1 active:scale-[0.98]`}
            >
              <div className={`shrink-0 w-14 h-14 ${category.bgColor} ${category.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                {category.icon}
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {category.title}
                </h3>
                <p className="text-slate-500 text-sm font-medium">
                  {category.subtitle}
                </p>
              </div>
              <div className="self-center p-2 rounded-full bg-slate-50 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <ChevronRight className="w-5 h-5" />
              </div>
            </motion.button>
          ))}
          
          {/* Special "Get Started" card if needed, or just keep the grid */}
        </div>

        <div className="pt-8 flex items-center justify-center gap-8 text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-widest">AI Powered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest">Batch Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs font-bold uppercase tracking-widest">Smart ATS</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
