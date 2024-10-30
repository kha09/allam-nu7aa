'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, Copy, Edit, Wand2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { watsonApi, WatsonResponse } from '@/lib/watson-api'

interface ErrorInfo {
  word: string;
  type: string;
  correction: string;
  position: {
    top: number;
    left: number;
  };
}

export function TextEditor() {
  const [userInput, setUserInput] = useState("")
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentResponse, setCurrentResponse] = useState<WatsonResponse | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const markErrorInText = (text: string, errorWord: string, errorType: string) => {
    console.log('Marking error in text:', { text, errorWord, errorType });

    const words = text.split(/\s+/);
    
    const result = words.map(word => {
      if (word === errorWord) {
        return `<span 
          class="error-word" 
          style="text-decoration: underline; text-decoration-color: red; text-decoration-thickness: 2px; position: relative; display: inline-block;"
          data-error-type="${errorType}"
          data-word="${word}"
        >${word}</span>`;
      }
      return word;
    }).join(' ');

    return result;
  }

  const showTooltip = (target: HTMLElement) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    const word = target.getAttribute('data-word');
    const errorType = target.getAttribute('data-error-type');
    
    if (word && errorType && currentResponse) {
      const rect = target.getBoundingClientRect();
      const editorRect = document.querySelector('.editor-container')?.getBoundingClientRect();
      
      if (editorRect) {
        setErrorInfo({
          word,
          type: errorType,
          correction: currentResponse["تصحيح الكلمة"],
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
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('error-word')) {
        showTooltip(target);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      // Don't hide if moving to tooltip
      if (relatedTarget?.closest('#error-tooltip')) {
        return;
      }

      // Don't hide if moving from tooltip back to error word
      if (target.id === 'error-tooltip' && relatedTarget?.classList.contains('error-word')) {
        return;
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

    document.addEventListener('mouseover', handleMouseEnter);
    document.addEventListener('mouseout', handleMouseLeave);

    const tooltip = document.getElementById('error-tooltip');
    if (tooltip) {
      tooltip.addEventListener('mouseenter', handleTooltipMouseEnter);
      tooltip.addEventListener('mouseleave', handleTooltipMouseLeave);
    }

    return () => {
      document.removeEventListener('mouseover', handleMouseEnter);
      document.removeEventListener('mouseout', handleMouseLeave);
      if (tooltip) {
        tooltip.removeEventListener('mouseenter', handleTooltipMouseEnter);
        tooltip.removeEventListener('mouseleave', handleTooltipMouseLeave);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [currentResponse]);

  const handleGenerateText = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await watsonApi.generateText(userInput)
      console.log('API Response:', response);

      let parsedResponse: WatsonResponse;
      if (typeof response === 'string') {
        try {
          parsedResponse = JSON.parse(response);
        } catch (e) {
          console.error('Failed to parse response as JSON:', e);
          throw new Error('Invalid response format');
        }
      } else {
        parsedResponse = response;
      }

      console.log('Parsed Response:', parsedResponse);
      setCurrentResponse(parsedResponse);
      
      const displayText = markErrorInText(
        userInput,
        parsedResponse["خطأ"],
        parsedResponse["نوع الخطأ"]
      );
      
      const editorDiv = document.querySelector('[contenteditable]');
      if (editorDiv) {
        editorDiv.innerHTML = displayText;
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
            setCurrentResponse(null);
          }}
        />
        {errorInfo && (
          <div
            id="error-tooltip"
            className="absolute z-50"
            style={{
              top: `${errorInfo.position.top - 60}px`,
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
              <div className="font-bold mb-1">{errorInfo.word}</div>
              <div className="text-red-600">{errorInfo.type}</div>
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
          <Select defaultValue="translate">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="اختر الإجراء" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="translate">تدقيق لغوي</SelectItem>
            </SelectContent>
          </Select>
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
      `}</style>
    </div>
  )
}
