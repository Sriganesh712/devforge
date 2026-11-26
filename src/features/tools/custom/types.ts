import type { PublicTool } from '@/packages/tool-sdk/public';
import type { ToolOptionValues, ToolResult } from '@/packages/tool-sdk/types';

export interface ToolUiProps {
  tool: PublicTool;
  input: string;
  secondary: string;
  options: ToolOptionValues;
  result: ToolResult | null;
  error: string | null;
  running: boolean;
  setInput: (value: string) => void;
  setSecondary: (value: string) => void;
  setOption: (id: string, value: string | number | boolean) => void;
  run: () => void;
  reset: () => void;
}
