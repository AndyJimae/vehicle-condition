export function errorNotDeployed(chainId: number | undefined) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-2xl border-l-4 border-red-500">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-5 flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Contract Not Deployed</h2>
            <p className="text-gray-700 mb-4">
              The vehicle condition assessment contract has not been deployed on the current blockchain network.
            </p>
            <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-800">Current Chain ID:</span>{" "}
                <span className="font-mono text-red-600">{String(chainId)}</span>
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-800 mb-2">To resolve this issue:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                <li>Deploy the smart contract to the blockchain network</li>
                <li>Run the command: <code className="bg-white px-2 py-1 rounded border border-gray-300 font-mono text-xs">npm run genabi</code></li>
                <li>Refresh this page to reconnect</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


