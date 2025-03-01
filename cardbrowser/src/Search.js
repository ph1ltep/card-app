import React, { useState, useEffect } from 'react';

const Search = () => {
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError(null);
    setCards([]);

    try {
      const response = await fetch(`https://code-server.fthome.org/proxy/5000/search?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      setCards(data);
    } catch (err) {
      console.error('Search error:', err);
      setError(`Search error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Search Cards</h2>
      <div className="mb-8 flex items-center gap-4"> {/* Increased margin-bottom and aligned with New Card box */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, title, or company (use * or % for wildcards)"
          className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /* Matches UploadStep3 input size */
        />
        <button
          type="submit"
          onClick={handleSearch}
          className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors" /* Matches UploadStep3 button */
        >
          Search
        </button>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {cards.length > 0 ? (
        <div className="space-y-6">
          {cards.map((card, index) => (
            <div key={index} className="flex items-start gap-6 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              {card.imagePath ? (
                <img
                  src={`https://code-server.fthome.org/proxy/5000/uploads/${encodeURIComponent(card.imagePath)}`}
                  alt={`${card.name || 'Card'} thumbnail`}
                  className="w-40 h-60 object-cover rounded-md"
                  onError={(e) => {
                    console.error(`Failed to load image: ${e.target.src}`);
                    e.target.style.display = 'none'; // Hide the image on error, preventing loops
                  }}
                />
              ) : (
                <div className="w-40 h-60 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-medium text-gray-800">
                    <strong>Name:</strong> {card.name || 'N/A'}
                  </p>
                  <p className="text-md text-gray-600">
                    <strong>Company:</strong> {card.company || 'N/A'}
                  </p>
                </div>
                <p className="text-md text-gray-600">
                  <strong>Title:</strong> {card.title || 'N/A'}
                </p>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    <strong>Email:</strong> {card.email || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Phone:</strong> {card.phone || 'N/A'}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    <strong>Address:</strong> {card.address || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Website:</strong> {card.website || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !error && query ? (
        <p className="text-gray-500">No results found.</p>
      ) : null}
    </div>
  );
};

export default Search;