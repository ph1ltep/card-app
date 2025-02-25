import React, { useState } from 'react';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    try {
      const response = await fetch(`http://localhost:5000/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold">Search Cards</h2>
      <div className="flex mt-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or company"
          className="border p-2 mr-2 w-full"
        />
        <button onClick={handleSearch} className="bg-blue-500 text-white p-2 rounded">Search</button>
      </div>
      <ul className="mt-2">
        {results.map((card) => (
          <li key={card._id} className="border p-2 mt-2">
            <strong>{card.name}</strong> - {card.email} - {card.company}
            <br />
            <img src={`http://localhost:5000/${card.imagePath}`} alt="Card" className="max-w-[100px] mt-1" />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Search;