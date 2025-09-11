"use client";

import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { useScaffoldMultiWriteContract } from "~~/hooks/scaffold-stark/useScaffoldMultiWriteContract";
import { useDeployedContractInfo } from "~~/hooks/scaffold-stark/useDeployedContractInfo";

interface CounterControlsProps {
  counterValue: number;
  onUpdate: () => void;
  currentAddress?: string;
  ownerAddress?: any;
}

export const CounterControls = ({ counterValue, onUpdate, currentAddress, ownerAddress }: CounterControlsProps) => {
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: counterContract } = useDeployedContractInfo("CounterContract");

  // Нормализуем адреса для сравнения
  const normalizeAddress = (addr: any): string => {
    if (!addr) return "";
    
    // Если это BigInt, конвертируем в hex строку
    if (typeof addr === "bigint") {
      let hex = addr.toString(16).toLowerCase();
      // Дополняем до 64 символов (32 байта) нулями слева
      return hex.padStart(64, '0');
    }
    
    // Если это строка, убираем 0x префикс и приводим к нижнему регистру
    const addrStr = String(addr);
    let normalized = addrStr.toLowerCase().replace(/^0x/, "");
    // Дополняем до 64 символов нулями слева
    return normalized.padStart(64, '0');
  };
  
  const normalizedUserAddress = normalizeAddress(currentAddress);
  const normalizedOwnerAddress = normalizeAddress(ownerAddress);
  
  const isOwner = currentAddress && ownerAddress && normalizedUserAddress === normalizedOwnerAddress;
  
  const { sendAsync: increaseCounter } = useScaffoldWriteContract({
    contractName: "CounterContract",
    functionName: "increase_counter",
    args: [],
  });

  const { sendAsync: decreaseCounter } = useScaffoldWriteContract({
    contractName: "CounterContract",
    functionName: "decrease_counter",
    args: [],
  });

  const { sendAsync: setCounter } = useScaffoldWriteContract({
    contractName: "CounterContract",
    functionName: "set_counter",
    args: [inputValue ? parseInt(inputValue) : 0],
  });

  const { sendAsync: resetCounterMulticall } = useScaffoldMultiWriteContract({
    calls: counterContract ? [
      {
        contractName: "Strk" as const,
        functionName: "approve",
        args: [
          counterContract.address,
          1000000000000000000n, // 1 ETH in wei
        ],
      },
      {
        contractName: "CounterContract" as const,
        functionName: "reset_counter",
        args: [],
      },
    ] : [],
  });

  const handleIncrement = async () => {
    try {
      await increaseCounter();
      setTimeout(() => onUpdate(), 1000);
    } catch (error) {
      console.error("❌ Error incrementing counter:", error);
    }
  };

  const handleDecrement = async () => {
    try {
      await decreaseCounter();
      setTimeout(() => onUpdate(), 1000);
    } catch (error) {
      console.error("❌ Error decrementing counter:", error);
    }
  };

  const handleReset = async () => {
    try {
      await resetCounterMulticall();
      setTimeout(() => onUpdate(), 2000); // Longer delay for multicall
    } catch (error) {
      console.error("Error resetting counter:", error);
    }
  };

  const handleSetCounter = async () => {
    if (!inputValue || isNaN(parseInt(inputValue))) {
      alert("Please enter a valid number");
      return;
    }

    const newValue = parseInt(inputValue);
    if (newValue < 0) {
      alert("Please enter a non-negative number");
      return;
    }

    try {
      setIsLoading(true);
      await setCounter();
      setTimeout(() => {
        onUpdate();
        setInputValue(""); // Очищаем поле ввода
      }, 1000);
    } catch (error) {
      console.error("Error setting counter:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Разрешаем только цифры
    if (value === "" || /^\d+$/.test(value)) {
      setInputValue(value);
    }
  };

  const isDecrementDisabled = counterValue === 0;

  return (
    <div className="card bg-base-100 shadow-xl border border-primary/20 w-full max-w-2xl">
      <div className="card-body items-center text-center p-8">
        <h2 className="card-title text-white bg-primary px-4 py-2 rounded-lg text-lg mb-4">Counter Controls</h2>
        
        {/* Большое число в центре */}
        <div className="text-8xl font-bold text-orange-500 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-6">
          {String(counterValue)}
        </div>
        
        {/* Кнопки управления */}
        <div className="flex items-center gap-4">
          <button 
            className="btn btn-circle btn-success btn-lg shadow-lg hover:shadow-xl transition-all" 
            onClick={handleIncrement}
            title="Increase counter"
          >
            <span className="text-xl font-bold">+</span>
          </button>
          
          <button 
            className={`btn btn-circle btn-lg shadow-lg transition-all ${
              isDecrementDisabled 
                ? "btn-disabled opacity-50 cursor-not-allowed" 
                : "btn-error hover:shadow-xl"
            }`}
            onClick={handleDecrement}
            disabled={isDecrementDisabled}
            title={isDecrementDisabled ? "Cannot decrease below zero" : "Decrease counter"}
          >
            <span className="text-xl font-bold">-</span>
          </button>

          <button 
            className={`btn btn-circle btn-lg shadow-lg transition-all ${
              counterValue === 0 
                ? "btn-disabled opacity-50 cursor-not-allowed" 
                : "btn-warning hover:shadow-xl"
            }`}
            onClick={handleReset}
            disabled={counterValue === 0}
            title={counterValue === 0 ? "Counter is already zero" : "Reset counter to zero (costs 1 STRK)"}
          >
            <span className="text-lg">🔄</span>
          </button>
        </div>
        
        <p className="text-sm text-base-content/70 mt-4 text-center">
          {counterValue === 0 
            ? "Use + to start counting" 
            : "Use +/- to control the counter, 🔄 to reset (costs 1 STRK they). After tx STRK automatically transfer to owner"
          }
        </p>
        
        {/* Set Counter Value Section - красивое поле с индикаторами */}
        <div className="mt-6 w-full max-w-lg">
          <div className="card bg-base-200 shadow-lg border-2 border-base-300">
            <div className="card-body p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-base-content">Set Counter Value</h3>
                <div className={`badge ${isOwner ? 'badge-success' : 'badge-error'} gap-2 px-3 py-2`}>
                  <div className={`w-2 h-2 rounded-full ${isOwner ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-xs font-medium">
                    {isOwner ? 'Owner Access' : 'Access Denied'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={isOwner ? "Enter new value" : "Owner only"}
                      className={`input input-bordered w-full text-center text-xl font-mono h-14 ${
                        isOwner 
                          ? 'input-success focus:input-success' 
                          : 'input-error bg-error/10'
                      }`}
                      value={inputValue}
                      onChange={handleInputChange}
                      disabled={isLoading || !isOwner}
                    />
                  </div>
                  
                  <button 
                    className={`btn btn-xl px-8 h-14 min-w-20 ${
                      isOwner 
                        ? `btn-success ${isLoading ? "loading" : ""}` 
                        : "btn-error btn-disabled"
                    }`}
                    onClick={handleSetCounter}
                    disabled={!inputValue || isLoading || !isOwner}
                  >
                    {isLoading ? "" : "Set"}
                  </button>
                </div>
                
                <div className={`alert ${isOwner ? 'alert-success' : 'alert-error'} py-4`}>
                  <div className="flex items-center gap-3">
                    {isOwner ? (
                      <>
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                        <span className="text-base font-medium">
                          Set counter allowed - Enter any positive number
                        </span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-base font-medium">
                          Set counter not allowed - Only contract owner can use this feature
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
