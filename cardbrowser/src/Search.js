import React, { useState, useEffect } from 'react';
import EditCardModal from './components/EditCardModal'; // Adjust path as needed

const Search = () => {
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState([]);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError(null);
    setCards([]);
    setIsModalOpen(false); // Close modal on new search
    setSelectedCard(null);

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

  const handleEdit = (card) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleSave = async (fields) => {
    try {
      const response = await fetch(`https://code-server.fthome.org/proxy/5000/update/${selectedCard._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const updatedCard = await response.json();
      setCards(cards.map(c => c._id === updatedCard._id ? updatedCard : c));
      setSelectedCard(updatedCard); // Update selected card for modal
    } catch (err) {
      throw err;
    }
  };

  const handleRemove = async () => {
    try {
      const response = await fetch(`https://code-server.fthome.org/proxy/5000/delete/${selectedCard._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      setCards(cards.filter(c => c._id !== selectedCard._id));
      setIsModalOpen(false);
      setSelectedCard(null);
    } catch (err) {
      throw err;
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mb-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Search Cards</h2>
      <div className="mb-8 flex items-center gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, title, or company (use * or % for wildcards)"
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <button
          type="submit"
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm"
        >
          Search
        </button>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {cards.length > 0 ? (
        <div className="space-y-4">
          {cards.map((card, index) => (
            <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="min-h-0 flex-shrink-0 cursor-pointer" onClick={() => handleEdit(card)}>
                {card.imagePath ? (
                  <img
                    src={`https://code-server.fthome.org/proxy/5000/uploads/${encodeURIComponent(card.imagePath)}`}
                    alt={`${card.name || 'Card'} thumbnail`}
                    className="w-36 h-auto object-cover rounded-md md:w-48 md:h-auto lg:w-60 lg:h-auto"
                    onError={(e) => {
                      console.error(`Failed to load image: ${e.target.src}`);
                      e.target.style.display = 'none'; // Hide the image on error, preventing loops
                    }}
                  />
                ) : (
                  <div className="w-36 h-20 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 md:w-48 md:h-27 lg:w-60 lg:h-34">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                <p className="font-medium text-gray-800"><strong>Name:</strong> {card.name || 'N/A'}</p>
                <p className="font-medium text-gray-800"><strong>Company:</strong> {card.company || 'N/A'}</p>
                <p className="text-gray-600"><strong>Title:</strong> {card.title || 'N/A'}</p>
                <p className="text-gray-600"><strong>Phone:</strong> {card.phone || 'N/A'}</p>
                <p className="text-gray-500"><strong>Email:</strong> {card.email || 'N/A'}</p>
                <p className="text-gray-500"><strong>Website:</strong> {card.website || 'N/A'}</p>
                <p className="text-gray-500 col-span-2"><strong>Address:</strong> {card.address || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      ) : !error && query ? (
        <p className="text-gray-500">No results found.</p>
      ) : null}
      {isModalOpen && selectedCard && (
        <EditCardModal
          card={selectedCard}
          onSave={handleSave}
          onRemove={handleRemove}
          onReScan={() => {}} // Implemented in EditCardModal
          onClose={handleClose}
          isOpen={isModalOpen}
        />
      )}
    </div>
  );
};

export default Search;