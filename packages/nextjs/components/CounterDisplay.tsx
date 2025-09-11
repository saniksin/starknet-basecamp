"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";

export const CounterDisplay = () => {
  const { data, isLoading, error } = useScaffoldReadContract({
    contractName: "CounterContract", 
    functionName: "get_counter",
  });

  if (error) return <span className="text-error">failed</span>;
  if (isLoading || data === undefined) return <span>...</span>;

  // get_counter returns u32; scaffold decode may return bigint/number/string depending on ABI
  // const value = Array.isArray(data) ? (data as any)[0] : (data as any);
  return <span className="font-mono">{String(data)}</span>;
};
