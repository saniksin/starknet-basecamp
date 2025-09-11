"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";

export const CounterDecrease = () => {
  const { data, isLoading, error, refetch } = useScaffoldReadContract({
    contractName: "CounterContract", 
    functionName: "get_counter",
  });

  const { sendAsync: decreaseCounter } = useScaffoldWriteContract({
    contractName: "CounterContract",
    functionName: "decrease_counter",
    args: [],
  });

  const handleDecrement = async () => {
    try {
      await decreaseCounter();
      // Обновляем значение счетчика после успешной транзакции
      setTimeout(() => refetch(), 1000);
    } catch (error) {
      console.error("Error decrementing counter:", error);
    }
  };

  if (error) return <span className="text-error">failed</span>;
  if (isLoading || data === undefined) return <span>...</span>;

  const currentValue = Number(data);
  const isDisabled = currentValue === 0;

  return (
    <div className="card bg-base-100 shadow-xl border border-warning/20">
      <div className="card-body items-center text-center p-8">
        <h2 className="card-title text-warning mb-4">Decrease Counter</h2>
        <div className="flex items-center gap-4">
          <div className="text-6xl font-bold text-warning bg-gradient-to-r from-warning to-error bg-clip-text text-transparent">
            {String(data)}
          </div>
          <button 
            className={`btn btn-circle btn-lg shadow-lg transition-all ${
              isDisabled 
                ? "btn-disabled opacity-50 cursor-not-allowed" 
                : "btn-warning hover:shadow-xl"
            }`}
            onClick={handleDecrement}
            disabled={isDisabled}
          >
            <span className="text-xl font-bold">-</span>
          </button>
        </div>
        <p className="text-sm text-base-content/70 mt-2">
          {isDisabled ? "Cannot decrease below zero" : "Click - to decrement"}
        </p>
      </div>
    </div>
  );
};
