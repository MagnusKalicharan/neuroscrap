"use client";

import React, { useState, useEffect, useCallback } from "react";
import { diagnosticSound } from "./sound";

interface StationCalculatorProps {
  onApplyValue: (val: number) => void;
  targetNodeId?: string;
}

export function StationCalculator({
  onApplyValue,
  targetNodeId = "R4",
}: StationCalculatorProps) {
  const [expression, setExpression] = useState<string>("");
  const [displayValue, setDisplayValue] = useState<string>("0");
  const [lastCalculated, setLastCalculated] = useState<number | null>(null);

  // Evaluate arithmetic expression safely without eval
  const evaluateMath = useCallback((expr: string): number | null => {
    try {
      // Allow only digits, basic operators, parens, decimal, spaces
      const cleaned = expr.replace(/[^0-9+\-*/().]/g, "");
      if (!cleaned) return null;

      // Tokenize
      const tokens: string[] = [];
      let numBuffer = "";

      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (/[0-9.]/.test(char)) {
          numBuffer += char;
        } else if (/[+\-*/()]/.test(char)) {
          if (numBuffer) {
            tokens.push(numBuffer);
            numBuffer = "";
          }
          tokens.push(char);
        }
      }
      if (numBuffer) tokens.push(numBuffer);

      // Shunting-yard algorithm to RPN
      const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
      const outputQueue: string[] = [];
      const opStack: string[] = [];

      for (const tok of tokens) {
        if (!isNaN(Number(tok))) {
          outputQueue.push(tok);
        } else if (tok === "(") {
          opStack.push(tok);
        } else if (tok === ")") {
          while (opStack.length > 0 && opStack[opStack.length - 1] !== "(") {
            outputQueue.push(opStack.pop()!);
          }
          if (opStack.length > 0 && opStack[opStack.length - 1] === "(") {
            opStack.pop();
          }
        } else if (tok in prec) {
          while (
            opStack.length > 0 &&
            opStack[opStack.length - 1] in prec &&
            prec[opStack[opStack.length - 1]] >= prec[tok]
          ) {
            outputQueue.push(opStack.pop()!);
          }
          opStack.push(tok);
        }
      }

      while (opStack.length > 0) {
        outputQueue.push(opStack.pop()!);
      }

      // Evaluate RPN
      const evalStack: number[] = [];
      for (const tok of outputQueue) {
        if (!isNaN(Number(tok))) {
          evalStack.push(parseFloat(tok));
        } else {
          const b = evalStack.pop() ?? 0;
          const a = evalStack.pop() ?? 0;
          if (tok === "+") evalStack.push(a + b);
          else if (tok === "-") evalStack.push(a - b);
          else if (tok === "*") evalStack.push(a * b);
          else if (tok === "/") evalStack.push(b === 0 ? 0 : a / b);
        }
      }

      if (evalStack.length === 1 && !isNaN(evalStack[0])) {
        return evalStack[0];
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const handleInput = useCallback(
    (char: string) => {
      diagnosticSound.playSwitchClack();
      setExpression((prev) => {
        const next = prev + char;
        const res = evaluateMath(next);
        if (res !== null) {
          setDisplayValue(String(Math.round(res * 100) / 100));
        } else {
          setDisplayValue(next);
        }
        return next;
      });
    },
    [evaluateMath]
  );

  const handleClear = useCallback(() => {
    diagnosticSound.playSwitchClack();
    setExpression("");
    setDisplayValue("0");
    setLastCalculated(null);
  }, []);

  const handleDelete = useCallback(() => {
    diagnosticSound.playSwitchClack();
    setExpression((prev) => {
      const next = prev.slice(0, -1);
      if (!next) {
        setDisplayValue("0");
        return "";
      }
      const res = evaluateMath(next);
      if (res !== null) {
        setDisplayValue(String(Math.round(res * 100) / 100));
      } else {
        setDisplayValue(next);
      }
      return next;
    });
  }, [evaluateMath]);

  const handleEquals = useCallback(() => {
    diagnosticSound.playSwitchClack();
    const res = evaluateMath(expression);
    if (res !== null) {
      const rounded = Math.round(res * 100) / 100;
      setDisplayValue(String(rounded));
      setLastCalculated(res);
      setExpression(String(rounded));
    }
  }, [expression, evaluateMath]);

  const handleApply = useCallback(() => {
    diagnosticSound.playSwitchClack();
    let numToApply: number | null = lastCalculated;
    if (numToApply === null) {
      const parsed = parseFloat(displayValue);
      if (!isNaN(parsed)) {
        numToApply = parsed;
      }
    }
    if (numToApply !== null) {
      const roundedInt = Math.round(numToApply);
      onApplyValue(roundedInt);
    }
  }, [lastCalculated, displayValue, onApplyValue]);

  // Physical keyboard support
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (/[0-9+\-*/().]/.test(e.key)) {
        e.preventDefault();
        handleInput(e.key);
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEquals();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
        handleClear();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleInput, handleEquals, handleDelete, handleClear]);

  const currentComputedNum = lastCalculated !== null ? lastCalculated : parseFloat(displayValue);
  const roundedInt = !isNaN(currentComputedNum) ? Math.round(currentComputedNum) : 120;
  const isOutlier = currentComputedNum > 150 || displayValue.includes("99999") || expression.includes("99999");

  return (
    <div className="w-full h-full flex flex-col justify-between p-1 font-mono select-none">
      {/* ── LCD Screen: Compact & Phosphor Glowing ── */}
      <div className="bg-[#020703] border border-[#16602d] rounded px-2.5 py-1 flex flex-col justify-between shadow-inner h-[46px] shrink-0">
        <div className="text-[10px] text-[#528a60] flex items-center justify-between font-mono leading-none">
          <span className="text-[#84b890] font-bold">118 + 121 + 120 + 122</span>
          {isOutlier ? (
            <span className="text-amber-400 font-bold tracking-tight">⚠ OUTLIER DETECTED</span>
          ) : (
            <span className="truncate max-w-[130px] text-right">{expression || "READY"}</span>
          )}
        </div>
        <div className="text-[18px] text-[var(--term-green-text-bright,#22d952)] font-black text-right tracking-widest font-mono leading-none">
          {displayValue} <span className="animate-pulse">_</span>
        </div>
      </div>

      {/* ── Keypad Grid: 4 columns x 5 rows, compact & crisp ── */}
      <div className="grid grid-cols-4 gap-1 text-xs font-bold my-1">
        <button
          type="button"
          onClick={handleClear}
          className="h-[25px] bg-[#1a0e0e] hover:bg-[#2b1414] text-red-400 border border-red-900 rounded cursor-pointer active:scale-95 flex items-center justify-center font-bold"
          title="Clear"
        >
          C
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="h-[25px] bg-[#141d15] hover:bg-[#1a281c] text-[#78a883] border border-[#174822] rounded cursor-pointer active:scale-95 flex items-center justify-center font-bold"
          title="Backspace"
        >
          DEL
        </button>
        <button
          type="button"
          onClick={() => handleInput("(")}
          className="h-[25px] bg-[#09180c] hover:bg-[#122816] text-[#5dfa87] border border-[#16602d] rounded cursor-pointer active:scale-95 flex items-center justify-center font-bold"
        >
          (
        </button>
        <button
          type="button"
          onClick={() => handleInput(")")}
          className="h-[25px] bg-[#09180c] hover:bg-[#122816] text-[#5dfa87] border border-[#16602d] rounded cursor-pointer active:scale-95 flex items-center justify-center font-bold"
        >
          )
        </button>

        {["7", "8", "9", "/"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleInput(k)}
            className={`h-[25px] rounded border cursor-pointer active:scale-95 flex items-center justify-center font-bold ${
              k === "/"
                ? "bg-[#142918] hover:bg-[#1c3822] text-[#8bffab] border-[#228b3f]"
                : "bg-[#09180c] hover:bg-[#122816] text-[#d1fae5] border-[#16602d]"
            }`}
          >
            {k}
          </button>
        ))}

        {["4", "5", "6", "*"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleInput(k)}
            className={`h-[25px] rounded border cursor-pointer active:scale-95 flex items-center justify-center font-bold ${
              k === "*"
                ? "bg-[#142918] hover:bg-[#1c3822] text-[#8bffab] border-[#228b3f]"
                : "bg-[#09180c] hover:bg-[#122816] text-[#d1fae5] border-[#16602d]"
            }`}
          >
            {k}
          </button>
        ))}

        {["1", "2", "3", "-"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleInput(k)}
            className={`h-[25px] rounded border cursor-pointer active:scale-95 flex items-center justify-center font-bold ${
              k === "-"
                ? "bg-[#142918] hover:bg-[#1c3822] text-[#8bffab] border-[#228b3f]"
                : "bg-[#09180c] hover:bg-[#122816] text-[#d1fae5] border-[#16602d]"
            }`}
          >
            {k}
          </button>
        ))}

        <button
          type="button"
          onClick={() => handleInput("0")}
          className="h-[25px] bg-[#09180c] hover:bg-[#122816] text-[#d1fae5] border border-[#16602d] rounded cursor-pointer active:scale-95 flex items-center justify-center font-bold"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleInput(".")}
          className="h-[25px] bg-[#09180c] hover:bg-[#122816] text-[#d1fae5] border border-[#16602d] rounded cursor-pointer active:scale-95 flex items-center justify-center font-bold"
        >
          .
        </button>
        <button
          type="button"
          onClick={handleEquals}
          className="h-[25px] bg-[#174822] hover:bg-[#20602f] text-[#5dfa87] font-black border border-[#22d952] rounded cursor-pointer active:scale-95 shadow-[0_0_8px_rgba(34,217,82,0.3)] flex items-center justify-center font-bold"
        >
          =
        </button>
        <button
          type="button"
          onClick={() => handleInput("+")}
          className="h-[25px] bg-[#142918] hover:bg-[#1c3822] text-[#8bffab] border border-[#228b3f] rounded cursor-pointer active:scale-95 flex items-center justify-center font-bold"
        >
          +
        </button>
      </div>

      {/* ── Action: Apply Calculated Result directly to R4 Patch ── */}
      <button
        type="button"
        onClick={handleApply}
        className={`w-full h-[28px] rounded text-xs font-bold tracking-wider uppercase cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(34,217,82,0.25)] flex items-center justify-center gap-1.5 shrink-0 ${
          isOutlier
            ? "bg-amber-950/80 hover:bg-amber-900 border border-amber-500 text-amber-300"
            : "bg-[#1b3b22] hover:bg-[#255230] text-[#5dfa87] border border-[#22d952]"
        }`}
      >
        <span>⚡ APPLY {roundedInt}V TO {targetNodeId} {isOutlier ? "(⚠ SKEWED)" : ""}</span>
      </button>
    </div>
  );
}

export default StationCalculator;
