/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Redirection immédiate vers l'application d'assistance senior Memoria
    window.location.replace('/memoria.html');
  }, []);

  return (
    <div className="min-h-screen bg-[#fbf9f5] flex items-center justify-center p-6 text-center">
      <div className="space-y-4">
        <div className="w-12 h-12 border-4 border-[#35607f] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="font-sans text-xl text-[#6a5d43] font-bold">Ouverture de Memoria...</p>
      </div>
    </div>
  );
}
