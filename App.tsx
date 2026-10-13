/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PhotoUploader } from './components/PhotoUploader';
import { ProblemEditor } from './components/ProblemEditor';
import { SolutionView, SolutionData } from './components/SolutionView';
import {
  Camera,
  Sliders,
  Sparkles,
  BookOpen,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { SampleProblem } from './data/sampleProblems';

type Level = 'High School' | 'Undergraduate' | 'Advanced';
type AppStep = 'upload' | 'extracted' | 'solution';

export default function App() {
  // App flow steps
  const [currentStep, setCurrentStep] = useState<AppStep>('upload');

  // Settings
  const [level, setLevel] = useState<Level>('High School');
  const [hintOnly, setHintOnly] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  // Data states
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extractedProblem, setExtractedProblem] = useState<string>('');
  const [topicHint, setTopicHint] = useState<string>('');
  const [solutionData, setSolutionData] = useState<SolutionData | null>(null);

  // Loading & error states
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [unreadableError, setUnreadableError] = useState<string | null>(null);

  // 1. Process selected photo via /api/extract-problem
  const handleImageSelected = async (base64Image: string, sample?: SampleProblem) => {
    setImagePreviewUrl(base64Image);
    setUnreadableError(null);
    setIsExtracting(true);

    if (sample) {
      setLevel(sample.level);
    }

    try {
      const response = await fetch('/api/extract-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.readable) {
        setUnreadableError(
          data.errorMessage ||
            "We couldn't clearly read a math problem in this photo. Please ensure clear lighting and legible handwriting or print, then try again."
        );
        setCurrentStep('upload');
      } else {
        setExtractedProblem(data.extractedProblem || '');
        setTopicHint(data.topicHint || '');
        setCurrentStep('extracted');
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      setUnreadableError(
        'Connection error while analyzing the image. Please check your network and try again.'
      );
      setCurrentStep('upload');
    } finally {
      setIsExtracting(false);
    }
  };

  // 2. Solve problem via /api/solve-problem
  const handleSolveProblem = async (customHintMode?: boolean) => {
    if (!extractedProblem.trim()) return;

    const requestHintOnly = customHintMode !== undefined ? customHintMode : hintOnly;
    setIsSolving(true);

    try {
      const response = await fetch('/api/solve-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: extractedProblem,
          level,
          hintOnly: requestHintOnly,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to solve problem.');
      }

      const data: SolutionData = await response.json();
      setSolutionData(data);
      setCurrentStep('solution');
    } catch (err: any) {
      console.error('Solve Error:', err);
      alert(err.message || 'An error occurred while generating the solution. Please try again.');
    } finally {
      setIsSolving(false);
    }
  };

  // If user was in Hint mode and clicks "Reveal Full Solution"
  const handleRevealFullSolution = async () => {
    setHintOnly(false);
    await handleSolveProblem(false);
  };

  const handleReset = () => {
    setImagePreviewUrl(null);
    setExtractedProblem('');
    setTopicHint('');
    setSolutionData(null);
    setUnreadableError(null);
    setCurrentStep('upload');
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            onClick={handleReset}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-neutral-900">
                  SnapSolve
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  KaTeX Tutor
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 hidden sm:block">
                Photo to step-by-step math solutions
              </p>
            </div>
          </div>

          {/* Settings Trigger & Quick Controls */}
          <div className="flex items-center gap-2">
            {/* Quick Level Selector (Desktop) */}
            <div className="hidden md:flex items-center bg-neutral-100 p-1 rounded-xl text-xs">
              {(['High School', 'Undergraduate', 'Advanced'] as Level[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    level === lvl
                      ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Hint Only Switch (Desktop) */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50/80 text-xs">
              <Lightbulb
                className={`w-3.5 h-3.5 ${
                  hintOnly ? 'text-indigo-600' : 'text-neutral-400'
                }`}
              />
              <span className="text-neutral-600 font-medium">Hint only:</span>
              <button
                type="button"
                onClick={() => setHintOnly(!hintOnly)}
                role="switch"
                aria-checked={hintOnly}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hintOnly ? 'bg-indigo-600' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    hintOnly ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Mobile Settings Toggle */}
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="sm:hidden p-2 rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              title="Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Settings Drawer */}
        {showSettingsDrawer && (
          <div className="sm:hidden bg-white border-b border-neutral-200 px-4 py-3 space-y-3">
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                Target Level
              </label>
              <div className="grid grid-cols-3 gap-1 bg-neutral-100 p-1 rounded-xl text-xs">
                {(['High School', 'Undergraduate', 'Advanced'] as Level[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`py-1.5 rounded-lg font-medium transition-all text-center ${
                      level === lvl
                        ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                        : 'text-neutral-600'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Lightbulb
                  className={`w-4 h-4 ${
                    hintOnly ? 'text-indigo-600' : 'text-neutral-400'
                  }`}
                />
                <div>
                  <span className="text-xs font-semibold text-neutral-900 block">
                    Hint Only Mode
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    Shows only the first step
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHintOnly(!hintOnly)}
                role="switch"
                aria-checked={hintOnly}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hintOnly ? 'bg-indigo-600' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    hintOnly ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Step Progress Pill Indicator */}
        <div className="mb-6 flex items-center justify-center gap-2 text-xs">
          <span
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              currentStep === 'upload'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            1. Snap Photo
          </span>
          <span className="text-neutral-300">→</span>
          <span
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              currentStep === 'extracted'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            2. Review & Edit
          </span>
          <span className="text-neutral-300">→</span>
          <span
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              currentStep === 'solution'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            3. KaTeX Solution
          </span>
        </div>

        {/* Global Loading Overlay for Extraction or Solving */}
        {isExtracting && (
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-10 text-center space-y-4 animate-pulse">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">
                Reading your math problem...
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                Gemini is transcribing symbols, exponents, fractions, and formulas into LaTeX.
              </p>
            </div>
          </div>
        )}

        {isSolving && (
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">
                Crafting step-by-step KaTeX solution...
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                Applying pedagogical explanations, key mathematical principles, and creating 3 practice problems.
              </p>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-indigo-600 font-medium pt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
              Solving for {level} level
            </div>
          </div>
        )}

        {/* Screen 1: Photo Uploader */}
        {!isExtracting && !isSolving && currentStep === 'upload' && (
          <PhotoUploader
            onImageSelected={handleImageSelected}
            isExtracting={isExtracting}
            unreadableError={unreadableError}
            onClearError={() => setUnreadableError(null)}
          />
        )}

        {/* Screen 2: Problem Review & Text Correction */}
        {!isExtracting && !isSolving && currentStep === 'extracted' && (
          <ProblemEditor
            problemText={extractedProblem}
            onChange={setExtractedProblem}
            onSolve={() => handleSolveProblem()}
            onRetake={() => setCurrentStep('upload')}
            imagePreviewUrl={imagePreviewUrl}
            topicHint={topicHint}
            isSolving={isSolving}
            level={level}
            hintOnly={hintOnly}
          />
        )}

        {/* Screen 3: Full Solution & Practice */}
        {!isExtracting && !isSolving && currentStep === 'solution' && solutionData && (
          <SolutionView
            originalProblem={extractedProblem}
            solution={solutionData}
            isHintOnly={hintOnly}
            onRevealFullSolution={handleRevealFullSolution}
            onNewProblem={handleReset}
            onEditProblem={() => setCurrentStep('extracted')}
            level={level}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-200/80 bg-white/60 py-4 text-center text-xs text-neutral-400">
        <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SnapSolve • AI Math Tutor with LaTeX KaTeX</span>
          <div className="flex items-center gap-3">
            <span>Powered by Gemini 3.8 Flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
