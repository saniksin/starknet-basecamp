"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";

export const CounterWithButton = () => {
  const { data, isLoading, error, refetch } = useScaffoldReadContract({
    contractName: "CounterContract", 
    functionName: "get_counter",
  });

  const { sendAsync: increaseCounter } = useScaffoldWriteContract({
    contractName: "CounterContract",
    functionName: "increase_counter",
    args: [],
  });

  const handleIncrement = async () => {
    try {
      await increaseCounter();
      // Обновляем значение счетчика после успешной транзакции
      setTimeout(() => refetch(), 1000);
    } catch (error) {
      console.error("Error incrementing counter:", error);
    }
  };

  if (error) return <span className="text-error">failed</span>;
  if (isLoading || data === undefined) return <span>...</span>;

  return (
    <div className="card bg-base-100 shadow-xl border border-primary/20">
      <div className="card-body items-center text-center p-8">
        <h2 className="card-title text-primary mb-4">Counter</h2>
        <div className="flex items-center gap-4">
          <div className="text-6xl font-bold text-primary bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {String(data)}
          </div>
          <button 
            className="btn btn-circle btn-primary btn-lg shadow-lg hover:shadow-xl transition-all" 
            onClick={handleIncrement}
          >
            <span className="text-xl font-bold">+</span>
          </button>
        </div>
        <p className="text-sm text-base-content/70 mt-2">Click + to increment</p>
      </div>
    </div>
  );
};
