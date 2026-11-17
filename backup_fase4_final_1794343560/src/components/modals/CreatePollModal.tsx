import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  conversationId
}) => {
  const { sendMessage, theme } = useApp();
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowsMultipleAnswers, setAllowsMultipleAnswers] = useState(false);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleCreate = async () => {
    if (!question.trim()) return;
    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (validOptions.length < 2) return;

    const pollData = {
      question: question.trim(),
      options: validOptions.map((opt, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text: opt,
        votes: []
      })),
      allowsMultipleAnswers
    };

    await sendMessage(conversationId, question.trim(), 'poll', {
      poll: pollData
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
          color: isDark ? '#FFFFFF' : '#0F172A'
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Crear Encuesta</h3>
              <p className="text-xs text-slate-400">Permite votar en el chat grupal o privado</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Question */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Pregunta
            </label>
            <input
              type="text"
              placeholder="Haz una pregunta..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border text-sm font-medium outline-none transition-all placeholder:text-slate-500"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1'
              }}
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Opciones
            </label>
            <div className="space-y-2">
              {options.map((opt, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Opción ${index + 1}`}
                    value={opt}
                    onChange={e => handleOptionChange(index, e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all placeholder:text-slate-500"
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                      borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1'
                    }}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2.5 flex items-center gap-2 text-xs font-bold text-cyan-400 hover:underline cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir opción</span>
              </button>
            )}
          </div>

          {/* Toggle Multiple Answers */}
          <div
            onClick={() => setAllowsMultipleAnswers(!allowsMultipleAnswers)}
            className="flex items-center justify-between p-3 rounded-2xl border cursor-pointer select-none transition-colors"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
            }}
          >
            <span className="text-xs font-semibold">Permitir varias respuestas</span>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                allowsMultipleAnswers ? 'bg-cyan-500 border-cyan-500 text-white' : 'border-slate-500'
              }`}
            >
              {allowsMultipleAnswers && <Check className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Enviar encuesta
          </button>
        </div>
      </div>
    </div>
  );
};
