import React from 'react';
import Upload from './Upload';
import Search from './Search';

function App() {
  return (
    <div className="p-5">
      <h1 className="text-3xl font-bold text-center">CardBrowser</h1>
      <Upload />
      <Search />
    </div>
  );
}

export default App;