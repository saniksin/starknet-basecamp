"use client";

import { useScaffoldEventHistory } from "~~/hooks/scaffold-stark/useScaffoldEventHistory";
import { useDeployedContractInfo } from "~~/hooks/scaffold-stark/useDeployedContractInfo";

/**
 * CounterEventHistory component that displays all CounterChanged events
 * from the CounterContract with details about each change.
 */
export const CounterEventHistory = () => {
  const { data: contractInfo } = useDeployedContractInfo("CounterContract");

  // Try to get CounterChanged events
  const {
    data: events,
    isLoading,
    error,
  } = useScaffoldEventHistory({
    contractName: "CounterContract",
    eventName: "CounterChanged",
    fromBlock: 0n,
    watch: true,
    enabled: true,
  });

  // Also try to get OwnershipTransferred events as a test
  const {
    data: ownableEvents,
    isLoading: ownableLoading,
    error: ownableError,
  } = useScaffoldEventHistory({
    contractName: "CounterContract",
    eventName: "OwnershipTransferred",
    fromBlock: 0n,
    watch: true,
    enabled: true,
  });

  // Debug logging - only when there are actual changes
  if (events?.length !== undefined && events.length > 0) {
    // Events loaded successfully
  }
  if (ownableEvents?.length !== undefined && ownableEvents.length > 0) {
    // Ownable events loaded successfully
  }
  if (error) {
    console.error("CounterChanged event loading error:", error);
  }
  if (ownableError) {
    console.error("OwnershipTransferred event loading error:", ownableError);
  }

  // Helper function to format the change reason
  const formatReason = (reason: any): string => {
    if (typeof reason === "object" && reason !== null) {
      // Handle CstroCustomEnum with variant field
      if (reason.variant && typeof reason.variant === "object") {
        // Find the variant that is not undefined
        const variantKeys = Object.keys(reason.variant);
        for (const key of variantKeys) {
          if (reason.variant[key] !== undefined) {
            return key.toUpperCase();
          }
        }
        
        // Fallback - return first key if all are undefined
        if (variantKeys.length > 0) {
          return variantKeys[0].toUpperCase();
        }
      }
      
      // Handle direct enum-like objects
      const keys = Object.keys(reason);
      if (keys.length > 0) {
        const key = keys[0];
        
        // Handle Cairo enum variants
        if (key === "Increased") return "INCREASED";
        if (key === "Decreased") return "DECREASED"; 
        if (key === "Reset") return "RESET";
        if (key === "Set") return "SET";
        
        // Try case-insensitive matches
        const lowerKey = key.toLowerCase();
        if (lowerKey === "increased") return "INCREASED";
        if (lowerKey === "decreased") return "DECREASED";
        if (lowerKey === "reset") return "RESET";
        if (lowerKey === "set") return "SET";
        
        // Fallback to the key itself
        return String(key).toUpperCase();
      }
      
      // If no keys, try toString
      if (reason.toString && typeof reason.toString === "function") {
        const str = reason.toString();
        if (str !== "[object Object]") {
          return str.toUpperCase();
        }
      }
    }
    
    // Handle string reasons
    if (typeof reason === "string") {
      return reason.toUpperCase();
    }
    
    return "UNKNOWN";
  };

  // Helper function to format address
  const formatAddress = (address: any): string => {
    if (!address) return "Unknown";
    
    // Handle BigInt addresses (convert to hex)
    if (typeof address === "bigint") {
      return "0x" + address.toString(16);
    }
    
    let addr = String(address);
    
    // If it's already a hex string, return as is
    if (addr.startsWith("0x")) {
      return addr;
    }
    
    // If it's a decimal string, convert to hex
    try {
      const num = BigInt(addr);
      return "0x" + num.toString(16);
    } catch {
      // If conversion fails, return the original
      return addr;
    }
  };

  // Helper function to safely display raw value for debugging
  const safeStringify = (value: any): string => {
    try {
      if (typeof value === "bigint") {
        return `BigInt(${value.toString()})`;
      }
      if (typeof value === "object" && value !== null) {
        const obj: any = {};
        for (const [key, val] of Object.entries(value)) {
          if (typeof val === "bigint") {
            obj[key] = `BigInt(${val.toString()})`;
          } else {
            obj[key] = val;
          }
        }
        return JSON.stringify(obj);
      }
      return JSON.stringify(value);
    } catch (e) {
      return `Error: ${e}`;
    }
  };

  // Helper function to format value - handle both numbers and objects
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "N/A";
    
    // Handle BigInt first - this is the main case for Starknet values
    if (typeof value === "bigint") {
      return value.toString();
    }
    
    // Handle primitive types
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    
    // If it's an object, try to extract the actual value
    if (typeof value === "object") {
      // Check for common Starknet/Cairo value properties
      if (value.value !== undefined) {
        return typeof value.value === "bigint" ? value.value.toString() : String(value.value);
      }
      if (value.low !== undefined) {
        return typeof value.low === "bigint" ? value.low.toString() : String(value.low);
      }
      if (value.high !== undefined && value.low !== undefined) {
        // Handle u256 type with high/low parts
        const low = typeof value.low === "bigint" ? value.low.toString() : String(value.low);
        return low; // For now, just show low part
      }
      if (value.words !== undefined && Array.isArray(value.words)) {
        return String(value.words[0] || 0);
      }
      
      // Try to handle felt252 or other Cairo types
      if (value.inner !== undefined) {
        return typeof value.inner === "bigint" ? value.inner.toString() : String(value.inner);
      }
      if (value.val !== undefined) {
        return typeof value.val === "bigint" ? value.val.toString() : String(value.val);
      }
      if (value._value !== undefined) {
        return typeof value._value === "bigint" ? value._value.toString() : String(value._value);
      }
      
      // Check if it's a BigNumber-like object
      if (value._isBigNumber) {
        return value.toString();
      }
      
      // If it's a BigInt-like object, try to convert
      if (value.toString && typeof value.toString === "function") {
        const str = value.toString();
        if (str !== "[object Object]") return str;
      }
      
      // Try valueOf method
      if (value.valueOf && typeof value.valueOf === "function") {
        const val = value.valueOf();
        if (val !== value && (typeof val === "string" || typeof val === "number" || typeof val === "bigint")) {
          return typeof val === "bigint" ? val.toString() : String(val);
        }
      }
      
      // Last resort - show object structure for debugging
      const keys = Object.keys(value);
      if (keys.length > 0) {
        return `{${keys.join(", ")}}`;
      }
      return "Empty Object";
    }
    
    return String(value);
  };

  // Helper function to get reason color
  const getReasonColor = (reason: string): string => {
    const reasonStr = String(reason).toLowerCase();
    switch (reasonStr) {
      case "increased": return "text-green-500";
      case "decreased": return "text-red-500";
      case "reset": return "text-yellow-500";
      case "set": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  // Helper function to get reason icon
  const getReasonIcon = (reason: string): string => {
    const reasonStr = String(reason).toLowerCase();
    switch (reasonStr) {
      case "increased": return "📈";
      case "decreased": return "📉";
      case "reset": return "🔄";
      case "set": return "🎯";
      default: return "📊";
    }
  };

  if (error) {
    return (
      <div className="card bg-base-100 shadow-xl border border-error/20">
        <div className="card-body items-center text-center p-6">
          <h3 className="text-error font-semibold">Error Loading Events</h3>
          <p className="text-sm text-base-content/70">
            Failed to load counter change events
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-xl border border-primary/20">
        <div className="card-body items-center text-center p-6">
          <div className="loading loading-spinner loading-md"></div>
          <p className="text-sm text-base-content/70 mt-2">
            Loading event history...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl border border-info/20 w-full max-w-4xl mx-auto">
      <div className="card-body p-6">
        <h2 className="card-title text-white bg-info px-6 py-3 rounded-lg text-xl mb-4 justify-center w-full">
          📜 Counter Event History
        </h2>
        
        {/* Test button to generate events */}
        <div className="text-center mb-4">
          <p className="text-sm text-base-content/70 mb-2">
            Debug: {events?.length || 0} CounterChanged events, {ownableEvents?.length || 0} Ownable events
          </p>
          <p className="text-xs text-base-content/50">
            Try increment/decrement operations to generate events
          </p>
        </div>
        
        {(!events || events.length === 0) && (!ownableEvents || ownableEvents.length === 0) ? (
          <div className="text-center py-8">
            <p className="text-base-content/70">No events found</p>
            <p className="text-sm text-base-content/50">
              Start interacting with the counter to see events here
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Show CounterChanged events */}
            {events && events.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-white bg-blue-600 px-4 py-2 rounded mb-3">
                  🎯 Counter Change Events ({events.length})
                </h3>
                {events.slice(0, 25).map((event, index) => {
                  const args = event.args;
                  const reason = formatReason(args?.reason);
                  
                  return (
                    <div key={`counter-${index}`} className="border border-base-300 rounded-lg p-4 bg-base-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getReasonIcon(reason)}</span>
                          <span className={`font-semibold text-white`}>
                            Counter {String(reason).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-base-content/50">
                          Block: {event.blockNumber}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-base-200 p-4 rounded">
                          <div className="text-base-content/70 text-xs mb-1">Previous Value:</div>
                          <div className="font-mono font-bold text-xl">
                            {(() => {
                              const val = args?.old_value;
                              if (typeof val === "bigint") return val.toString();
                              if (val && typeof val === "object" && val.toString) return val.toString();
                              if (val !== undefined && val !== null) return String(val);
                              return "N/A";
                            })()}
                          </div>
                        </div>
                        <div className="bg-green-100 p-4 rounded border-2 border-green-300">
                          <div className="text-green-800 text-xs mb-1 font-semibold">New Value:</div>
                          <div className="font-mono font-bold text-2xl text-green-700">
                            {(() => {
                              const val = args?.new_value;
                              if (typeof val === "bigint") return val.toString();
                              if (val && typeof val === "object" && val.toString) return val.toString();
                              if (val !== undefined && val !== null) return String(val);
                              return "N/A";
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 bg-base-200 p-3 rounded">
                        <div className="text-base-content/70 text-xs mb-1">Changed By:</div>
                        <div className="font-mono text-xs break-all">{formatAddress(args?.caller)}</div>
                      </div>
                      
                      {event.transactionHash && (
                        <div className="mt-3 p-2 bg-base-100 rounded text-xs">
                          <span className="text-base-content/70">Transaction: </span>
                          <span className="font-mono">{formatAddress(event.transactionHash)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
            
            {/* Show Ownable events for debugging */}
            {ownableEvents && ownableEvents.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-secondary mb-3">
                  👤 Ownership Transfer Events ({ownableEvents.length})
                </h3>
                {ownableEvents.slice(0, 10).map((event, index) => (
                  <div key={`ownable-${index}`} className="border border-secondary/30 rounded-lg p-4 bg-secondary/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👑</span>
                        <span className="font-semibold text-secondary">OWNERSHIP TRANSFERRED</span>
                      </div>
                      <div className="text-xs text-base-content/50">
                        Block: {event.blockNumber}
                      </div>
                    </div>
                    
                    <div className="text-sm space-y-2">
                      {event.args?.previous_owner && (
                        <div>
                          <span className="text-base-content/70">Previous Owner: </span>
                          <span className="font-mono">{formatAddress(event.args.previous_owner)}</span>
                        </div>
                      )}
                      {event.args?.new_owner && (
                        <div>
                          <span className="text-base-content/70">New Owner: </span>
                          <span className="font-mono">{formatAddress(event.args.new_owner)}</span>
                        </div>
                      )}
                      {event.transactionHash && (
                        <div className="text-xs text-base-content/50">
                          <span>Transaction: </span>
                          <span className="font-mono">{formatAddress(event.transactionHash)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
