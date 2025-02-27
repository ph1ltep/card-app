import React from 'react';
import Upload from './Upload';
import Search from './Search';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">CardBrowser</h1>
      <Upload />
      <Search />
    </div>
  );
}

export default App;