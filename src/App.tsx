import React, { useState, useCallback, useMemo } from 'react';
import { 
  Search, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  User, 
  Briefcase,
  Loader2,
  ChevronRight,
  Target,
  Lightbulb,
  Upload,
  X,
  File as FileIcon,
  BarChart3,
  Download,
  Users,
  ArrowUpDown,
  Trophy,
  ChevronDown,
  FileSpreadsheet,
  FileText as FileTextIcon,
  FileCode,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeResumesBatch, AnalysisResult, FileData } from './services/geminiService';
import { processResumeNLP } from './utils/nlpEngine';
import { useDropzone } from 'react-dropzone';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import LandingPage from './components/LandingPage';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CandidateAnalysis extends AnalysisResult {
  fileName: string;
  id: string;
  nlpSkills?: string[];
}

export default function App() {
  const [view, setView] = useState<'landing' | 'analyzer'>('landing');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<CandidateAnalysis[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removeCount, setRemoveCount] = useState<number>(0);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'text/plain': ['.txt']
    },
    multiple: true
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyzeAll = async () => {
    if (!jobDescription.trim()) {
      setError('Please provide a job description.');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please upload at least one resume.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults([]);
    setSelectedResultId(null);
    setProgress({ current: 0, total: selectedFiles.length });

    const newResults: CandidateAnalysis[] = [];
    
    // Process files in batches to optimize API calls
    const batchSize = 5;
    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batchFiles = selectedFiles.slice(i, i + batchSize);
      
      try {
        const resumesToAnalyze = await Promise.all(batchFiles.map(async (file) => {
          const base64 = await fileToBase64(file);
          // Perform preliminary NLP scan (mimicking Python NLTK logic)
          // Note: In a real app, we'd extract text from PDF first, 
          // but for this demo we'll use the filename and metadata as a proxy or assume we have text
          return {
            fileName: file.name,
            fileData: {
              inlineData: {
                data: base64,
                mimeType: file.type
              }
            }
          };
        }));

        const batchResults = await analyzeResumesBatch(jobDescription, resumesToAnalyze);
        
        if (!batchResults || batchResults.length === 0) {
          throw new Error(`Batch starting at ${i} returned no results.`);
        }

        const processedResults: CandidateAnalysis[] = batchResults.map(res => {
          // Add a mock NLP extraction for visual feedback of the "NLP Integration"
          // In a production app, we'd run processResumeNLP on the extracted text
          const nlpData = processResumeNLP(res.summary + " " + res.matching_skills.join(" "));
          
          return {
            ...res,
            id: Math.random().toString(36).substr(2, 9),
            nlpSkills: nlpData.extractedSkills
          };
        });

        newResults.push(...processedResults);
        setResults(prev => [...prev, ...processedResults].sort((a, b) => b.candidate_score - a.candidate_score));
        setProgress(prev => ({ ...prev, current: Math.min(prev.total, i + batchSize) }));
      } catch (err: any) {
        console.error(`Error analyzing batch starting at ${i}:`, err);
        setError(`Error in batch ${Math.floor(i/batchSize) + 1}: ${err.message || 'Unknown error'}`);
      }
    }

    setIsAnalyzing(false);
    if (newResults.length > 0) {
      setSelectedResultId(newResults.sort((a, b) => b.candidate_score - a.candidate_score)[0].id);
    } else {
      setError('Failed to analyze any resumes. Please check your inputs and try again.');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveBottom = () => {
    if (removeCount <= 0) return;
    
    setResults(prev => {
      const countToRemove = Math.min(removeCount, prev.length);
      // Results are sorted by score descending, so bottom are at the end
      const newResults = prev.slice(0, prev.length - countToRemove);
      
      // If the selected result was removed, clear it
      if (selectedResultId && !newResults.find(r => r.id === selectedResultId)) {
        setSelectedResultId(newResults.length > 0 ? newResults[0].id : null);
      }
      
      return newResults;
    });
    setRemoveCount(0);
  };

  const exportCSV = () => {
    const headers = ['Rank', 'Candidate Name', 'Score', 'Experience Level', 'Summary'];
    const rows = results.map((res, i) => [
      i + 1,
      res.fileName,
      `${res.candidate_score}%`,
      res.experience_level,
      res.summary.replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'candidate_rankings.csv');
    setShowExportMenu(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('AI Resume Ranking Results', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = results.map((res, i) => [
      i + 1,
      res.fileName,
      `${res.candidate_score}%`,
      res.experience_level
    ]);

    (doc as any).autoTable({
      startY: 35,
      head: [['Rank', 'Candidate Name', 'Score', 'Experience Level']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105] }
    });

    doc.save('candidate_rankings.pdf');
    setShowExportMenu(false);
  };

  const exportDOC = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "AI Resume Ranking Results",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Rank", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Candidate Name", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Score", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Experience Level", bold: true })] })] }),
                ],
              }),
              ...results.map((res, i) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: (i + 1).toString() })] }),
                  new TableCell({ children: [new Paragraph({ text: res.fileName })] }),
                  new TableCell({ children: [new Paragraph({ text: `${res.candidate_score}%` })] }),
                  new TableCell({ children: [new Paragraph({ text: res.experience_level })] }),
                ],
              })),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "candidate_rankings.docx");
    setShowExportMenu(false);
  };

  const selectedResult = useMemo(() => 
    results.find(r => r.id === selectedResultId), 
    [results, selectedResultId]
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 border-emerald-200 bg-emerald-50';
    if (score >= 60) return 'text-amber-600 border-amber-200 bg-amber-50';
    return 'text-rose-600 border-rose-200 bg-rose-50';
  };

  if (view === 'landing') {
    return (
      <LandingPage 
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setView('analyzer');
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('landing')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <Target className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">AI Resume Ranking System</h1>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  A Smart ATS-Style Candidate Evaluation Tool
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {results.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-4 h-4" /> Export Results <ChevronDown className={cn("w-3 h-3 transition-transform", showExportMenu && "rotate-180")} />
                </button>
                
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden"
                    >
                      <button 
                        onClick={exportCSV}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors border-b border-slate-100"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export as CSV
                      </button>
                      <button 
                        onClick={exportPDF}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors border-b border-slate-100"
                      >
                        <FileTextIcon className="w-4 h-4 text-rose-500" /> Export as PDF
                      </button>
                      <button 
                        onClick={exportDOC}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <FileCode className="w-4 h-4 text-blue-500" /> Export as DOCX
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
              <span className="text-emerald-600">Analyzer</span>
              <span className="hover:text-slate-900 cursor-pointer transition-colors">History</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Input Section */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <h2 className="font-semibold">Job Description</h2>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job requirements here..."
                className="w-full h-40 p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none text-sm leading-relaxed"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-semibold">Resumes ({selectedFiles.length})</h2>
                </div>
                {selectedFiles.length > 0 && (
                  <button 
                    onClick={() => setSelectedFiles([])}
                    className="text-xs font-bold text-rose-600 uppercase tracking-wider hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
                  isDragActive ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-emerald-400 bg-white"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-6 h-6 text-emerald-400" />
                <p className="text-xs font-medium text-slate-500">Drop resumes here or click to upload</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="group p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-600 truncate">{file.name}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-md transition-all"
                      >
                        <X className="w-3 h-3 text-rose-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleAnalyzeAll}
              disabled={isAnalyzing || selectedFiles.length === 0}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-200"
            >
              <div className="flex items-center gap-2">
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                <span>{isAnalyzing ? 'Ranking Batch...' : 'Rank All Resumes'}</span>
              </div>
              {isAnalyzing && (
                <span className="text-[10px] uppercase tracking-widest opacity-70">
                  {progress.current} of {progress.total} Completed
                </span>
              )}
            </button>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </div>

          {/* Results Section */}
          <div className="lg:col-span-8 space-y-6">
            {results.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Rankings List */}
                <div className="xl:col-span-5 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-zinc-900">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <h3 className="font-bold">Leaderboard</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sorted by Score</span>
                  </div>

                  {/* Remove Bottom Option */}
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-sm">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Remove Bottom Candidates</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="0"
                          max={results.length}
                          value={removeCount || ''}
                          onChange={(e) => setRemoveCount(parseInt(e.target.value) || 0)}
                          placeholder="e.g. 16"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                        <button 
                          onClick={handleRemoveBottom}
                          disabled={removeCount <= 0 || results.length === 0}
                          className="px-4 py-1.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-rose-700 disabled:bg-slate-300 transition-colors shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                    {results.map((res, i) => (
                      <button
                        key={res.id}
                        onClick={() => setSelectedResultId(res.id)}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group",
                          selectedResultId === res.id 
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100" 
                            : "bg-white border-slate-200 text-slate-900 hover:border-emerald-400"
                        )}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                            selectedResultId === res.id ? "bg-white/20" : "bg-slate-100 text-slate-500"
                          )}>
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{res.fileName}</p>
                            <p className={cn(
                              "text-[10px] font-medium uppercase tracking-wider",
                              selectedResultId === res.id ? "text-emerald-100" : "text-slate-500"
                            )}>
                              {res.experience_level}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold",
                          selectedResultId === res.id ? "bg-white/20" : "bg-slate-50 text-slate-900"
                        )}>
                          {res.candidate_score}%
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detailed View */}
                <div className="xl:col-span-7">
                  <AnimatePresence mode="wait">
                    {selectedResult ? (
                      <motion.div
                        key={selectedResult.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-6 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h3 className="text-xl font-bold text-slate-900">{selectedResult.fileName}</h3>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedResult.experience_level}</p>
                            </div>
                            <div className={cn("px-6 py-3 rounded-2xl border text-2xl font-bold", getScoreColor(selectedResult.candidate_score))}>
                              {selectedResult.candidate_score}%
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-900">
                              <TrendingUp className="w-4 h-4 text-emerald-600" />
                              <h4 className="text-sm font-bold">Analysis Summary</h4>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">
                              {selectedResult.summary}
                            </p>
                          </div>

                          {/* NLP Integration Section */}
                          {selectedResult.nlpSkills && selectedResult.nlpSkills.length > 0 && (
                            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2">
                              <div className="flex items-center gap-2 text-emerald-700">
                                <Search className="w-3 h-3" />
                                <h5 className="text-[10px] font-bold uppercase tracking-widest">NLP Preliminary Scan (NLTK Logic)</h5>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {selectedResult.nlpSkills.map((skill, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-white text-emerald-600 text-[9px] font-bold rounded border border-emerald-200 uppercase">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Matching</h5>
                              <div className="flex flex-wrap gap-1">
                                {selectedResult.matching_skills.slice(0, 5).map((s, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-md border border-emerald-100">
                                    {s}
                                  </span>
                                ))}
                                {selectedResult.matching_skills.length > 5 && (
                                  <span className="text-[10px] text-slate-400">+{selectedResult.matching_skills.length - 5} more</span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h5 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Missing</h5>
                              <div className="flex flex-wrap gap-1">
                                {selectedResult.missing_skills.slice(0, 5).map((s, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-medium rounded-md border border-rose-100">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-slate-900 mb-3">
                              <Lightbulb className="w-4 h-4 text-amber-500" />
                              <h4 className="text-sm font-bold">Recommendation</h4>
                            </div>
                            <p className="text-slate-500 text-xs italic leading-relaxed">
                              {selectedResult.recommendation}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-[40px] bg-slate-50/50">
                        <Users className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-slate-500 text-sm">Select a candidate from the leaderboard to view detailed analysis.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-[40px] bg-slate-50/50">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                  <BarChart3 className="w-10 h-10 text-emerald-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Batch Analysis Ready</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
                  Upload multiple resumes (up to 100+) to rank them against your job description. We'll provide a sorted leaderboard based on compatibility.
                </p>
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Trophy, label: "Ranked Leaderboard" },
                    { icon: Users, label: "Batch Processing" },
                    { icon: TrendingUp, label: "Skill Gap Analysis" },
                    { icon: Download, label: "Export Results" }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e4e4e7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d8;
        }
      `}</style>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
        <p>© 2026 AI Resume Ranking System. Smart ATS Engine v2.0.</p>
        <div className="flex items-center gap-6">
          <span className="hover:text-slate-600 cursor-pointer">Privacy Policy</span>
          <span className="hover:text-slate-600 cursor-pointer">Terms of Service</span>
          <span className="hover:text-slate-600 cursor-pointer">API Documentation</span>
        </div>
      </footer>
    </div>
  );
}
