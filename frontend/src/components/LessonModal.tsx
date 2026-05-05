import { LessonCard } from '../types';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Check, X } from 'lucide-react';

interface Props {
  lesson: LessonCard | null;
  onClose: () => void;
}

export default function LessonModal({ lesson, onClose }: Props) {
  if (!lesson) return null;

  return (
    <Dialog open={!!lesson} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl sm:max-w-2xl">
        <div className="bg-neutral-900 text-white p-6 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="absolute top-4 right-4 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📚</span>
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Lesson</span>
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">{lesson.title}</DialogTitle>
        </div>

        <div className="max-h-[75vh] space-y-8 overflow-y-auto p-6">
          {/* User Values */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Your Numbers</h4>
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 space-y-3">
              {lesson.userValues.map((val, idx) => (
                <div key={idx} className={`flex justify-between items-center ${idx === lesson.userValues.length - 1 ? 'pt-3 border-t border-neutral-200 font-bold' : 'text-neutral-600'}`}>
                  <span>{val.label}</span>
                  <span className={idx === lesson.userValues.length - 1 ? 'text-primary' : ''}>{val.formatted}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500">What This Means</h4>
            <p className="text-neutral-700 leading-relaxed text-lg">
              {lesson.explanation}
            </p>
          </div>

          {lesson.sections && lesson.sections.length > 0 && (
            <div className="space-y-6">
              {lesson.sections.map((section) => (
                <div key={section.title} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500">{section.title}</h4>
                  {section.rows && (
                    <div className="space-y-2 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                      {section.rows.map((row, idx) => (
                        <div
                          key={`${section.title}-${idx}`}
                          className={`flex items-start justify-between gap-4 ${row.emphasize ? 'border-t border-neutral-200 pt-3 font-bold text-vuna-dark' : 'text-neutral-700'}`}
                        >
                          <span>{row.label}</span>
                          {row.value && <span className="text-right">{row.value}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {section.paragraphs && section.paragraphs.length > 0 && (
                    <div className="space-y-2">
                      {section.paragraphs.map((paragraph, idx) => (
                        <p key={`${section.title}-paragraph-${idx}`} className="text-sm leading-6 text-neutral-600">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Visual Analogy */}
          {lesson.visualType === 'progress-bar' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Visual</h4>
              <div className="bg-neutral-100 rounded-full h-4 overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full w-3/5 bg-primary" />
              </div>
              <p className="text-sm text-neutral-500 text-center italic">Filling the {lesson.analogy}...</p>
            </div>
          )}

          {lesson.visualType === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Timeline</h4>
              <div className="flex items-center justify-between relative pt-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-300 -translate-y-1/2 rounded-full" />
                <div className="absolute top-1/2 left-0 h-1 w-full -translate-y-1/2 rounded-full bg-neutral-900" />
                <div className="w-4 h-4 rounded-full bg-neutral-900 relative z-10 shadow-sm" />
                <div className="w-4 h-4 rounded-full bg-neutral-900 relative z-10 shadow-sm" />
                <div className="w-4 h-4 rounded-full bg-neutral-900 relative z-10 shadow-sm" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                {(lesson.timelinePoints ?? [
                  { label: 'Start', value: '0', helper: 'Day one' },
                  { label: 'Break-Even', value: 'Target', helper: 'Costs covered' },
                  { label: 'Profit', value: 'Profit', helper: 'After recovery' },
                ]).map((point) => (
                  <div key={point.label} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{point.label}</p>
                    <p className="text-sm font-bold text-vuna-dark">{point.value}</p>
                    {point.helper && <p className="text-xs text-neutral-500">{point.helper}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          <div className="pt-4">
            <Button onClick={onClose} size="lg" className="w-full text-lg py-6 rounded-xl shadow-md hover:shadow-lg transition-all">
              <Check className="w-5 h-5 mr-2" />
              {lesson.actionText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
