"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Play, Pause, RotateCcw, ChevronRight, Terminal, Code2, Layers } from "lucide-react"

// Type definitions
interface CodeLayer {
  id: string
  code: string
  language: string
  description?: string
  delay?: number
}

interface CodeToken {
  type:
    | "keyword"
    | "string"
    | "comment"
    | "function"
    | "number"
    | "operator"
    | "variable"
    | "tag"
    | "attribute"
    | "text"
  value: string
}

// Simple syntax highlighter
const highlightCode = (code: string, language: string): CodeToken[] => {
  const tokens: CodeToken[] = []

  if (language === "javascript" || language === "typescript") {
    const patterns = [
      { regex: /(\/\/.*$)/gm, type: "comment" as const },
      { regex: /(\/\*[\s\S]*?\*\/)/g, type: "comment" as const },
      {
        regex:
          /\b(const|let|var|function|return|if|else|for|while|import|export|default|from|class|extends|new|this|async|await|try|catch|throw)\b/g,
        type: "keyword" as const,
      },
      { regex: /\b(console|window|document|Math|Array|Object|String|Number|Boolean)\b/g, type: "variable" as const },
      { regex: /(['"`])(?:(?=(\\?))\2.)*?\1/g, type: "string" as const },
      { regex: /\b(\d+)\b/g, type: "number" as const },
      { regex: /([=+\-*/%<>!&|?:;,{}()[\]])/g, type: "operator" as const },
    ]

    const remaining = code
    let position = 0

    while (position < code.length) {
      let matched = false

      for (const { regex, type } of patterns) {
        regex.lastIndex = position
        const match = regex.exec(code)

        if (match && match.index === position) {
          if (position < match.index) {
            tokens.push({ type: "text", value: code.slice(position, match.index) })
          }
          tokens.push({ type, value: match[0] })
          position = match.index + match[0].length
          matched = true
          break
        }
      }

      if (!matched) {
        const nextChar = code[position]
        const lastToken = tokens[tokens.length - 1]
        if (lastToken && lastToken.type === "text") {
          lastToken.value += nextChar
        } else {
          tokens.push({ type: "text", value: nextChar })
        }
        position++
      }
    }
  } else if (language === "html" || language === "jsx") {
    const htmlCode = code
    let i = 0

    while (i < htmlCode.length) {
      if (htmlCode[i] === "<") {
        const closeIndex = htmlCode.indexOf(">", i)
        if (closeIndex !== -1) {
          const tag = htmlCode.slice(i, closeIndex + 1)
          tokens.push({ type: "tag", value: "<" })

          const tagContent = tag.slice(1, -1)
          const parts = tagContent.split(/\s+/)

          if (parts[0]) {
            tokens.push({ type: "function", value: parts[0] })
          }

          const attributesStr = tagContent.slice(parts[0].length)
          const attrRegex = /(\w+)=["']([^"']+)["']/g
          let lastIndex = parts[0].length
          let attrMatch

          while ((attrMatch = attrRegex.exec(tagContent)) !== null) {
            const beforeAttr = tagContent.slice(lastIndex, attrMatch.index)
            if (beforeAttr.trim()) {
              tokens.push({ type: "text", value: beforeAttr })
            }
            tokens.push({ type: "attribute", value: attrMatch[1] })
            tokens.push({ type: "operator", value: "=" })
            tokens.push({ type: "string", value: `"${attrMatch[2]}"` })
            lastIndex = attrMatch.index + attrMatch[0].length
          }

          tokens.push({ type: "tag", value: ">" })
          i = closeIndex + 1
        } else {
          tokens.push({ type: "text", value: htmlCode[i] })
          i++
        }
      } else {
        let textEnd = htmlCode.indexOf("<", i)
        if (textEnd === -1) textEnd = htmlCode.length
        const text = htmlCode.slice(i, textEnd)
        if (text) {
          tokens.push({ type: "text", value: text })
        }
        i = textEnd
      }
    }
  } else {
    tokens.push({ type: "text", value: code })
  }

  return tokens
}

// Token color mapping
const getTokenColor = (type: CodeToken["type"]): string => {
  const colors: Record<CodeToken["type"], string> = {
    keyword: "text-purple-400",
    string: "text-green-400",
    comment: "text-gray-500 italic",
    function: "text-blue-400",
    number: "text-orange-400",
    operator: "text-cyan-400",
    variable: "text-yellow-400",
    tag: "text-gray-400",
    attribute: "text-red-400",
    text: "text-gray-300",
  }
  return colors[type]
}

const CodeLayerDisplay: React.FC = () => {
  const [currentLayer, setCurrentLayer] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [displayedCode, setDisplayedCode] = useState<string>("")
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null)
  const [typingIndex, setTypingIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [typingSpeed, setTypingSpeed] = useState(50)
  const [shouldTriggerTyping, setShouldTriggerTyping] = useState(false)
  const [baseCode, setBaseCode] = useState<string>("")
  const [newLayerCode, setNewLayerCode] = useState<string>("")
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Example code layers - you can modify these
  const codeLayers: CodeLayer[] = [
    {
      id: "imports",
      code: `import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';`,
      language: "typescript",
      description: "Import necessary dependencies",
      delay: 1000,
    },
    {
      id: "component-definition",
      code: `

const AnimatedComponent = () => {`,
      language: "typescript",
      description: "Define the component",
      delay: 1000,
    },
    {
      id: "state",
      code: `
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);`,
      language: "typescript",
      description: "Initialize state variables",
      delay: 1000,
    },
    {
      id: "effect",
      code: `

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);`,
      language: "typescript",
      description: "Add lifecycle effects",
      delay: 1500,
    },
    {
      id: "handler",
      code: `

  const handleClick = () => {
    setCount(prev => prev + 1);
  };`,
      language: "typescript",
      description: "Create event handlers",
      delay: 1000,
    },
    {
      id: "render",
      code: `

  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-4">
        Count: {count}
      </h1>
      <button
        onClick={handleClick}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg"
      >
        Increment
      </button>
    </div>
  );
};

export default AnimatedComponent;`,
      language: "typescript",
      description: "Render the component",
      delay: 2000,
    },
  ]

  useEffect(() => {
    const fullCode = codeLayers
      .slice(0, currentLayer + 1)
      .map((layer) => layer.code)
      .join("")

    if (isPlaying || isTyping || shouldTriggerTyping) {
      const previousLayersCode = codeLayers
        .slice(0, currentLayer)
        .map((layer) => layer.code)
        .join("")

      const currentLayerCode = codeLayers[currentLayer]?.code || ""

      setBaseCode(previousLayersCode)
      setNewLayerCode(currentLayerCode)

      setIsTyping(true)
      setTypingIndex(0)
      setShouldTriggerTyping(false)

      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }

      typingIntervalRef.current = setInterval(() => {
        setTypingIndex((prevIndex) => {
          const nextIndex = prevIndex + 1

          if (nextIndex >= currentLayerCode.length) {
            setIsTyping(false)
            if (typingIntervalRef.current) {
              clearInterval(typingIntervalRef.current)
            }
            return currentLayerCode.length
          }

          return nextIndex
        })
      }, typingSpeed)
    } else {
      setDisplayedCode(fullCode)
      setBaseCode(fullCode)
      setNewLayerCode("")
      setTypingIndex(0)
    }

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }
    }
  }, [currentLayer, isPlaying, typingSpeed, shouldTriggerTyping])

  useEffect(() => {
    const typedNewLayerCode = newLayerCode.slice(0, typingIndex)
    setDisplayedCode(baseCode + typedNewLayerCode)
  }, [typingIndex, baseCode, newLayerCode])

  useEffect(() => {
    if (isPlaying && currentLayer < codeLayers.length - 1 && !isTyping) {
      const timer = setTimeout(() => {
        setCurrentLayer((prev) => prev + 1)
      }, codeLayers[currentLayer].delay || 1000)

      return () => clearTimeout(timer)
    } else if (isPlaying && currentLayer === codeLayers.length - 1 && !isTyping) {
      setIsPlaying(false)
    }
  }, [isPlaying, currentLayer, codeLayers, isTyping])

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldTriggerTyping(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const handlePlay = () => setIsPlaying(!isPlaying)
  const handleReset = () => {
    setCurrentLayer(0)
    setIsPlaying(false)
    setIsTyping(false)
    setTypingIndex(0)
    setBaseCode("")
    setNewLayerCode("")
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
    }
  }
  const handleNext = () => {
    if (currentLayer < codeLayers.length - 1) {
      setCurrentLayer((prev) => prev + 1)
    }
  }
  const handlePrevious = () => {
    if (currentLayer > 0) {
      setCurrentLayer((prev) => prev - 1)
    }
  }

  const handleLayerClick = (index: number) => {
    setCurrentLayer(index)
    setShouldTriggerTyping(true)
  }

  const renderTokensWithTyping = () => {
    const baseTokens = highlightCode(baseCode, "typescript")
    const newLayerTokens = highlightCode(newLayerCode, "typescript")

    const allTokens = [...baseTokens, ...newLayerTokens]

    return allTokens.map((token, index) => {
      const isInBaseCode = index < baseTokens.length
      const tokenStart = allTokens.slice(0, index).reduce((acc, t) => acc + t.value.length, 0)
      const tokenEnd = tokenStart + token.value.length

      if (isInBaseCode) {
        return (
          <span key={index} className={getTokenColor(token.type)}>
            {token.value}
          </span>
        )
      }

      const newLayerTokenIndex = index - baseTokens.length
      const newLayerTokenStart = newLayerTokens.slice(0, newLayerTokenIndex).reduce((acc, t) => acc + t.value.length, 0)
      const newLayerTokenEnd = newLayerTokenStart + token.value.length
      const isPartiallyTyped = typingIndex > newLayerTokenStart && typingIndex < newLayerTokenEnd

      let displayValue = token.value
      if (isPartiallyTyped) {
        displayValue = token.value.slice(0, typingIndex - newLayerTokenStart)
      } else if (typingIndex <= newLayerTokenStart) {
        displayValue = ""
      }

      return (
        <span key={index} className={`${getTokenColor(token.type)} ${isPartiallyTyped ? "animate-pulse" : ""}`}>
          {displayValue}
        </span>
      )
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Code2 className="w-8 h-8 text-cyan-400" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Code Layer Display
          </h1>
        </div>
        <p className="text-gray-400">Watch code build up layer by layer with dynamic typing animations</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Code Display Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlay}
                  className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg transition-colors"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={handlePrevious}
                  className="p-2 bg-gray-600/50 hover:bg-gray-600/70 rounded-lg transition-colors disabled:opacity-50"
                  disabled={currentLayer === 0}
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 bg-gray-600/50 hover:bg-gray-600/70 rounded-lg transition-colors disabled:opacity-50"
                  disabled={currentLayer === codeLayers.length - 1}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Speed:</span>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={typingSpeed}
                    onChange={(e) => setTypingSpeed(Number(e.target.value))}
                    className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-400">
                    Layer {currentLayer + 1} / {codeLayers.length}
                  </span>
                  {isTyping && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-cyan-400">Typing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-500"
                style={{ width: `${((currentLayer + 1) / codeLayers.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Code Editor */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            {/* Editor Header */}
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              </div>
              <span className="text-xs text-gray-500 font-mono">AnimatedComponent.tsx</span>
            </div>

            {/* Code Content */}
            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
              <pre className="whitespace-pre">
                <code>
                  {renderTokensWithTyping()}
                  <span
                    className={`${isTyping ? "animate-pulse bg-cyan-400" : "animate-pulse"} inline-block w-0.5 h-5 ml-0.5`}
                  >
                    {isTyping ? "" : "|"}
                  </span>
                </code>
              </pre>
            </div>
          </div>
        </div>

        {/* Layers Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold">Code Layers</h2>
            </div>

            <div className="space-y-2">
              {codeLayers.map((layer, index) => (
                <div
                  key={layer.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    index <= currentLayer
                      ? "bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/50"
                      : "bg-gray-700/30 border-gray-600"
                  } ${hoveredLayer === index ? "scale-105 shadow-lg" : ""}`}
                  onClick={() => handleLayerClick(index)}
                  onMouseEnter={() => setHoveredLayer(index)}
                  onMouseLeave={() => setHoveredLayer(null)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {index + 1}. {layer.id.replace("-", " ").replace(/_/g, " ")}
                    </span>
                    {index <= currentLayer && (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  {layer.description && <p className="text-xs text-gray-400">{layer.description}</p>}
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Lines of Code</p>
                  <p className="text-2xl font-bold text-cyan-400">{displayedCode.split("\n").length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Characters</p>
                  <p className="text-2xl font-bold text-purple-400">{displayedCode.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeLayerDisplay
