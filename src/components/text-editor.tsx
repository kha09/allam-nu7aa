'use client'


import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Copy, Wand2 } from 'lucide-react'
import { Button } from "./ui/button"
import { watsonApi, WatsonResponse, ErrorItem } from '@/lib/watson-api'
import { ErrorDisplay } from './error-display'
=======
import React, { useState, useEffect, useRef } from 'react'
import { Copy, Wand2, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { watsonApi, WatsonResponse, ErrorItem } from "@/lib/watson-api"


interface ErrorInfo {
  word: string;
  type: string;
  correction: string;
  position: {
    top: number;
    left: number;
  };
}

interface TextEditorProps {
  onErrorsFound: (errors: WatsonResponse) => void;
  onSynonymsGenerated: (synonyms: string) => void;
  onSelectedTextChange: (text: string) => void;
}

export interface TextEditorRef {
  handleCorrection: (errorWord: string, correction: string) => void;
  handleCorrectAll: (corrections: Array<{ errorWord: string, correction: string }>) => void;
  handleSynonymReplace: (synonym: string) => void;
}

export const TextEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ onErrorsFound, onSynonymsGenerated, onSelectedTextChange }, ref) => {
  const [userInput, setUserInput] = useState("")
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentErrors, setCurrentErrors] = useState<ErrorItem[]>([])
  const [selectedText, setSelectedText] = useState("")
  const [isSynonymLoading, setIsSynonymLoading] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)


  const getErrorWord = (error: ErrorItem) => error["خطأ"] || error["الكلمة_الخاطئة"] || error["الكلمة الخاطئة"] || "";
  const getErrorType = (error: ErrorItem) => error["نوع_الخطأ"] || error["نوع الخطأ"] || "";
  const getErrorCorrection = (error: ErrorItem) => error["تصحيح_الكلمة"] || error["تصحيح الكلمة"] || "";
=======
  const getErrorWord = (error: ErrorItem) => error["الكلمة_الخاطئة"] || "";
  const getErrorType = (error: ErrorItem) => error["نوع_الخطأ"] || "";
  const getErrorCorrection = (error: ErrorItem) => error["تصحيح_الكلمة"] || "";


  const handleCorrection = (errorWord: string, correction: string) => {
    if (editorRef.current) {
      // Find the error span element
      const errorSpan = editorRef.current.querySelector(`[data-word="${errorWord}"]`);
      if (errorSpan) {
        // Create a new text node with the correction
        const textNode = document.createTextNode(correction);
        // Replace the span with the text node
        errorSpan.parentNode?.replaceChild(textNode, errorSpan);
        // Update the userInput state with the new content
        setUserInput(editorRef.current.textContent || '');
      }
    }
  };

  const handleCorrectAll = (corrections: Array<{ errorWord: string, correction: string }>) => {
    if (editorRef.current) {
      let content = editorRef.current.innerHTML;
      corrections.forEach(({ errorWord, correction }) => {
        const errorSpan = editorRef.current?.querySelector(`[data-word="${errorWord}"]`);
        if (errorSpan) {
          // Create a new text node with the correction
          const textNode = document.createTextNode(correction);
          // Replace the span with the text node
          errorSpan.parentNode?.replaceChild(textNode, errorSpan);
        }
      });
      // Update the userInput state with the new content
      setUserInput(editorRef.current.textContent || '');
    }
  };

  const handleSynonymReplace = (synonym: string) => {
    if (editorRef.current && selectedText) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(synonym);
        range.deleteContents();
        range.insertNode(textNode);
        // Update the userInput state with the new content
        setUserInput(editorRef.current.textContent || '');
        // Clear selection
        setSelectedText('');
        onSelectedTextChange('');
      }
    }
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    handleCorrection,
    handleCorrectAll,
    handleSynonymReplace
  }));

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection) {
      const text = selection.toString().trim();
      setSelectedText(text);
      onSelectedTextChange(text);
      console.log('Selected text:', text);
    }
  };

  const handleGenerateSynonyms = async () => {
    if (!selectedText) {
      console.log('No text selected');
      return;
    }
    
    console.log('Generating synonyms for:', selectedText);
    
    try {
      setIsSynonymLoading(true);
      const response = await watsonApi.generateSynonyms(selectedText);
      const synonyms = response.results[0].generated_text;
      console.log('Generated synonyms:', synonyms);
      onSynonymsGenerated(synonyms);
      
    } catch (err) {
      console.error('Error generating synonyms:', err);
      setError(err instanceof Error ? err.message : 'An error occurred generating synonyms');
    } finally {
      setIsSynonymLoading(false);
    }
  };

  const handleCorrectWord = (errorWord: string, correction: string) => {
    const editorDiv = document.querySelector('[contenteditable]');
    if (editorDiv) {
      const newHtml = editorDiv.innerHTML.replace(
        new RegExp(`<span[^>]*data-word="${errorWord}"[^>]*>${errorWord}</span>`),
        correction
      );
      editorDiv.innerHTML = newHtml;
      setUserInput(editorDiv.textContent || '');
      
      // Update current errors by removing the corrected error
      const updatedErrors = currentErrors.filter(err => getErrorWord(err) !== errorWord);
      setCurrentErrors(updatedErrors);
      onErrorsFound(updatedErrors);
    }
  };

  const markErrorsInText = (text: string, errors: ErrorItem[]) => {
    console.log('Marking errors in text:', { text, errors });

    const tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    let processedText = tempDiv.innerHTML;

    const sortedErrors = [...errors].sort((a, b) => {
      const wordA = getErrorWord(a);
      const wordB = getErrorWord(b);
      return wordB.length - wordA.length;
    });

    sortedErrors.forEach(errorItem => {
      const errorWord = getErrorWord(errorItem);
      const errorType = getErrorType(errorItem);
      const correction = getErrorCorrection(errorItem);

      const regex = new RegExp(`(^|\\s|[.،؛:-])(${errorWord})($|\\s|[.،؛:-])`, 'g');
      processedText = processedText.replace(regex, (match, before, word, after) => {
        return `${before}<span 
          class="error-word relative" 
          style="text-decoration: underline; text-decoration-color: red; text-decoration-thickness: 2px; display: inline-block;"
          data-error-type="${errorType}"
          data-word="${errorWord}"
          data-correction="${correction}"
        >
          <button 
            class="correct-btn absolute -left-6 top-1/2 -translate-y-1/2 bg-green-500 hover:bg-green-600 rounded-full p-1 opacity-0 transition-opacity"
            onclick="event.preventDefault(); event.stopPropagation();"
            data-word="${errorWord}"
            data-correction="${correction}"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          ${word}
        </span>${after}`;
      });
    });

    return processedText;
  }

  const showTooltip = (target: HTMLElement) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    const word = target.getAttribute('data-word');
    const errorType = target.getAttribute('data-error-type');
    const correction = target.getAttribute('data-correction');
    
    if (word && errorType && correction) {
      const rect = target.getBoundingClientRect();
      const editorRect = editorRef.current?.getBoundingClientRect();
      
      if (editorRect) {
        setErrorInfo({
          word,
          type: errorType,
          correction,
          position: {
            top: rect.top - editorRect.top,
            left: rect.left - editorRect.left + (rect.width / 2),
          }
        });
      }
    }
  };

  const hideTooltip = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setErrorInfo(null);
    }, 200);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('error-word')) {
        showTooltip(target);
        // Show the correction button
        const btn = target.querySelector('.correct-btn');
        if (btn) {
          (btn as HTMLElement).style.opacity = '1';
        }
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      if (relatedTarget?.closest('#error-tooltip')) {
        return;
      }

      if (target.id === 'error-tooltip' && relatedTarget?.classList.contains('error-word')) {
        return;
      }

      // Hide the correction button
      if (target.classList.contains('error-word')) {
        const btn = target.querySelector('.correct-btn');
        if (btn) {
          (btn as HTMLElement).style.opacity = '0';
        }
      }

      hideTooltip();
    };

    const handleTooltipMouseEnter = () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };

    const handleTooltipMouseLeave = (e: MouseEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!relatedTarget?.classList.contains('error-word')) {
        hideTooltip();
      }
    };

    editor.addEventListener('mouseover', handleMouseEnter);
    editor.addEventListener('mouseout', handleMouseLeave);
=======
    const handleCorrectButtonClick = (e: MouseEvent) => {
      const button = e.target as HTMLElement;
      const correctBtn = button.closest('.correct-btn');
      if (correctBtn) {
        const word = correctBtn.getAttribute('data-word');
        const correction = correctBtn.getAttribute('data-correction');
        if (word && correction) {
          handleCorrectWord(word, correction);
        }
      }
    };

    document.addEventListener('mouseover', handleMouseEnter);
    document.addEventListener('mouseout', handleMouseLeave);
    document.addEventListener('click', handleCorrectButtonClick);


    const tooltip = document.getElementById('error-tooltip');
    if (tooltip) {
      tooltip.addEventListener('mouseenter', handleTooltipMouseEnter);
      tooltip.addEventListener('mouseleave', handleTooltipMouseLeave);
    }

    return () => {

      editor.removeEventListener('mouseover', handleMouseEnter);
      editor.removeEventListener('mouseout', handleMouseLeave);
=======
      document.removeEventListener('mouseover', handleMouseEnter);
      document.removeEventListener('mouseout', handleMouseLeave);
      document.removeEventListener('click', handleCorrectButtonClick);

      if (tooltip) {
        tooltip.removeEventListener('mouseenter', handleTooltipMouseEnter);
        tooltip.removeEventListener('mouseleave', handleTooltipMouseLeave);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleGenerateText = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const errors = await watsonApi.generateText(userInput)
      console.log('API Response:', errors);
      
      setCurrentErrors(errors);
      onErrorsFound(errors);
      
      const displayText = markErrorsInText(userInput, errors);
      
      if (editorRef.current) {
        editorRef.current.innerHTML = displayText;
      }
    } catch (err) {
      console.error('Error in handleGenerateText:', err);
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 bg-white rounded-lg shadow-md" dir="rtl">
      <div className="flex justify-between items-center mb-4">
      </div>
      <div className="relative mb-4 editor-container">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck="false"
          dir="rtl"
          lang="ar"
          className="w-full min-h-[150px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          style={{ 
            direction: 'rtl',
            fontFamily: 'inherit'
          }}
          onInput={(e) => {
            const newText = e.currentTarget.textContent || '';
            console.log('New user input:', newText);
            setUserInput(newText);
            setCurrentErrors([]);
            onErrorsFound([]);
          }}
          onMouseUp={handleTextSelection}
        />
        {errorInfo && (
          <div
            id="error-tooltip"
            className="absolute z-50"
            style={{
              top: `${errorInfo.position.top - 100}px`,
              left: `${errorInfo.position.left}px`,
              transform: 'translate(-50%, 0)',
              opacity: 1,
              pointerEvents: 'auto',
            }}
          >
            <div 
              className="bg-white border border-gray-200 rounded-md shadow-lg p-2 text-sm"
              style={{
                direction: 'rtl',
                minWidth: '150px',
                maxWidth: '300px',
                position: 'relative',
              }}
            >
              <div 
                className="absolute w-3 h-3 bg-white border-b border-r border-gray-200 transform rotate-45"
                style={{
                  bottom: '-7px',
                  left: '50%',
                  marginLeft: '-6px',
                }}
              />
              <div className="font-bold mb-1">الخطأ: {errorInfo.word}</div>
              <div className="text-red-600">نوع الخطأ: {errorInfo.type}</div>
              <div className="text-green-600 mt-1">التصحيح: {errorInfo.correction}</div>
            </div>
          </div>
        )}
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute top-2 left-2"
          onClick={() => navigator.clipboard.writeText(userInput)}
        >
          <Copy className="h-4 w-4" />
          <span className="sr-only">Copy</span>
        </Button>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleGenerateText}
            disabled={isLoading}
          >
            <Wand2 className="ml-2 h-4 w-4" />
            {isLoading ? 'جاري التدقيق...' : 'تدقيق'}
          </Button>
          <Button
            variant="outline"
            className="w-[140px]"
            onClick={handleGenerateSynonyms}
            disabled={isSynonymLoading || !selectedText}
          >
            {isSynonymLoading ? 'جاري التوليد...' : 'توليد مرادفات'}
          </Button>
        </div>
      </div>
      {error && (
        <div className="mt-2 text-red-500 text-sm text-right">
          {error}
        </div>
      )}
      <style jsx global>{`
        .error-word {
          transition: background-color 0.2s ease;
        }
        .error-word:hover {
          background-color: rgba(255, 0, 0, 0.1);
        }
        #error-tooltip {
          transition: opacity 0.2s ease;
        }
        .correct-btn {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .error-word:hover .correct-btn {
          opacity: 1;
        }
      `}</style>
    </div>
  )
})

TextEditor.displayName = 'TextEditor'
