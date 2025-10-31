import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Star, Trophy, Plus, X, Menu, Search, TrendingUp, Award } from 'lucide-react';

const PeepalApp = () => {
  const [toilets, setToilets] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedToilet, setSelectedToilet] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newToiletLocation, setNewToiletLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);

  // Initialize user
  useEffect(() => {
    const initUser = async () => {
      try {
        const result = await window.storage.get('current-user');
        if (result) {
          setCurrentUser(JSON.parse(result.value));
        } else {
          const username = prompt('Willkommen bei Peepal! 🚽 Gib deinen Benutzernamen ein:');
          if (username) {
            const newUser = { username, points: 0 };
            await window.storage.set('current-user', JSON.stringify(newUser));
            setCurrentUser(newUser);
          }
        }
      } catch (error) {
        const username = prompt('Willkommen bei Peepal! 🚽 Gib deinen Benutzernamen ein:');
        if (username) {
          const newUser = { username, points: 0 };
          await window.storage.set('current-user', JSON.stringify(newUser));
          setCurrentUser(newUser);
        }
      }
    };
    initUser();
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const toiletsResult = await window.storage.get('toilets', true);
        if (toiletsResult) {
          setToilets(JSON.parse(toiletsResult.value));
        }
      } catch (error) {
        console.log('Keine Toiletten gefunden, starte neu');
      }

      try {
        const leaderboardResult = await window.storage.get('leaderboard', true);
        if (leaderboardResult) {
          setLeaderboard(JSON.parse(leaderboardResult.value));
        }
      } catch (error) {
        console.log('Kein Leaderboard gefunden, starte neu');
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Initialize Leaflet with OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);

    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.async = true;
    document.head.appendChild(leafletScript);

    leafletScript.onload = () => {
      // h-da Darmstadt coordinates
      mapRef.current = L.map(mapContainerRef.current).setView([49.8728, 8.6521], 16);

      // OpenStreetMap tiles - completely free!
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      mapRef.current.on('click', (e) => {
        if (showAddModal) {
          setNewToiletLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });

      setMapReady(true);
    };

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when toilets change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    toilets.forEach(toilet => {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="cursor: pointer; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3)); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
          <svg width="40" height="40" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <!-- Peepal Body (toilet shape) -->
            <rect x="60" y="80" width="80" height="100" rx="15" fill="#E91E63"/>
            <rect x="70" y="90" width="60" height="80" rx="10" fill="#EC407A"/>
            
            <!-- Toilet Bowl -->
            <ellipse cx="100" cy="120" rx="25" ry="20" fill="#4DD0E1"/>
            <ellipse cx="100" cy="120" rx="15" ry="12" fill="#00BCD4"/>
            
            <!-- Eyes -->
            <circle cx="85" cy="105" r="6" fill="#263238"/>
            <circle cx="115" cy="105" r="6" fill="#263238"/>
            <circle cx="87" cy="103" r="2" fill="white"/>
            <circle cx="117" cy="103" r="2" fill="white"/>
            
            <!-- Smile -->
            <path d="M 85 115 Q 100 125 115 115" stroke="#263238" stroke-width="3" fill="none" stroke-linecap="round"/>
            
            <!-- Blush -->
            <circle cx="75" cy="115" r="5" fill="#FF4081" opacity="0.4"/>
            <circle cx="125" cy="115" r="5" fill="#FF4081" opacity="0.4"/>
          </svg>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      const marker = L.marker([toilet.lat, toilet.lng], { icon })
        .addTo(mapRef.current)
        .on('click', () => {
          setSelectedToilet(toilet);
          setShowRateModal(true);
        });

      // Add popup with toilet info
      const avgScore = toilet.avgRatings 
        ? Object.values(toilet.avgRatings).reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / 5 
        : 0;
      
      marker.bindPopup(`
        <div style="text-align: center;">
          <strong>${toilet.name}</strong><br>
          ${toilet.building} • ${toilet.floor || 'EG'}<br>
          ${avgScore > 0 ? `⭐ ${avgScore.toFixed(1)}/5` : '⭐ Noch nicht bewertet'}
        </div>
      `);

      markersRef.current.push(marker);
    });
  }, [toilets, mapReady]);

  const addToilet = async (toiletData) => {
    if (!newToiletLocation || !currentUser) return;

    const newToilet = {
      id: Date.now().toString(),
      ...toiletData,
      lat: newToiletLocation.lat,
      lng: newToiletLocation.lng,
      addedBy: currentUser.username,
      ratings: [],
      avgRatings: {}
    };

    const updatedToilets = [...toilets, newToilet];
    setToilets(updatedToilets);
    await window.storage.set('toilets', JSON.stringify(updatedToilets), true);

    await updateUserPoints(10, 'Toilette hinzugefügt');
    setShowAddModal(false);
    setNewToiletLocation(null);
  };

  const rateToilet = async (ratings) => {
    if (!selectedToilet || !currentUser) return;

    const rating = {
      username: currentUser.username,
      ratings,
      timestamp: Date.now()
    };

    const updatedToilets = toilets.map(t => {
      if (t.id === selectedToilet.id) {
        const newRatings = [...t.ratings, rating];
        const avgRatings = calculateAverageRatings(newRatings);
        return { ...t, ratings: newRatings, avgRatings };
      }
      return t;
    });

    setToilets(updatedToilets);
    await window.storage.set('toilets', JSON.stringify(updatedToilets), true);

    await updateUserPoints(5, 'Toilette bewertet');
    setShowRateModal(false);
    setSelectedToilet(null);
  };

  const calculateAverageRatings = (ratings) => {
    const categories = ['hygiene', 'smell', 'accessibility', 'availability', 'privacy'];
    const avg = {};
    
    categories.forEach(cat => {
      const sum = ratings.reduce((acc, r) => acc + (r.ratings[cat] || 0), 0);
      avg[cat] = (sum / ratings.length).toFixed(1);
    });
    
    return avg;
  };

  const updateUserPoints = async (points, reason) => {
    const updatedUser = { ...currentUser, points: currentUser.points + points };
    setCurrentUser(updatedUser);
    await window.storage.set('current-user', JSON.stringify(updatedUser));

    let updatedLeaderboard = [...leaderboard];
    const existingIndex = updatedLeaderboard.findIndex(u => u.username === updatedUser.username);
    
    if (existingIndex >= 0) {
      updatedLeaderboard[existingIndex] = updatedUser;
    } else {
      updatedLeaderboard.push(updatedUser);
    }
    
    updatedLeaderboard.sort((a, b) => b.points - a.points);
    setLeaderboard(updatedLeaderboard);
    await window.storage.set('leaderboard', JSON.stringify(updatedLeaderboard), true);
  };

  const AddToiletModal = () => {
    const [name, setName] = useState('');
    const [building, setBuilding] = useState('');
    const [floor, setFloor] = useState('');
    const [gender, setGender] = useState('unisex');

    const handleSubmit = () => {
      if (!name || !building) {
        alert('Bitte fülle mindestens Name und Gebäude aus!');
        return;
      }
      addToilet({ name, building, floor, gender });
      setName('');
      setBuilding('');
      setFloor('');
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-pink-600">Neue Toilette hinzufügen</h2>
            <button onClick={() => { setShowAddModal(false); setNewToiletLocation(null); }} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          
          {!newToiletLocation ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🗺️</div>
              <p className="text-gray-600 font-medium">Klicke auf die Karte, um den Standort zu setzen</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-pink-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-pink-800">✓ Standort gesetzt!</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-2 border-gray-300 focus:border-pink-500 rounded-lg px-3 py-2 outline-none"
                  placeholder="z.B. Hauptgebäude WC"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Gebäude *</label>
                <input
                  type="text"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="w-full border-2 border-gray-300 focus:border-pink-500 rounded-lg px-3 py-2 outline-none"
                  placeholder="z.B. C10"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Etage</label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full border-2 border-gray-300 focus:border-pink-500 rounded-lg px-3 py-2 outline-none"
                  placeholder="z.B. 2. OG"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Geschlecht</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full border-2 border-gray-300 focus:border-pink-500 rounded-lg px-3 py-2 outline-none"
                >
                  <option value="unisex">Unisex</option>
                  <option value="male">Männlich</option>
                  <option value="female">Weiblich</option>
                </select>
              </div>
              
              <button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg hover:from-pink-600 hover:to-purple-700 font-bold transition-all shadow-lg"
              >
                Toilette hinzufügen (+10 Punkte) 🎉
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const RateToiletModal = () => {
    const [ratings, setRatings] = useState({
      hygiene: 3,
      smell: 3,
      accessibility: 3,
      availability: 3,
      privacy: 3
    });

    const categories = [
      { key: 'hygiene', label: 'Hygiene', icon: '✨' },
      { key: 'smell', label: 'Geruch', icon: '👃' },
      { key: 'accessibility', label: 'Barrierefreiheit', icon: '♿' },
      { key: 'availability', label: 'Ausstattung', icon: '🧻' },
      { key: 'privacy', label: 'Privatsphäre', icon: '🔒' }
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-pink-600">Toilette bewerten</h2>
            <button onClick={() => { setShowRateModal(false); setSelectedToilet(null); }} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          
          {selectedToilet && (
            <div>
              <div className="mb-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                <h3 className="font-bold text-lg">{selectedToilet.name}</h3>
                <p className="text-sm text-gray-600">{selectedToilet.building} • {selectedToilet.floor || 'EG'}</p>
                {selectedToilet.ratings?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedToilet.ratings.length} {selectedToilet.ratings.length === 1 ? 'Bewertung' : 'Bewertungen'}
                  </p>
                )}
              </div>
              
              <div className="space-y-4">
                {categories.map(cat => (
                  <div key={cat.key}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">{cat.icon} {cat.label}</span>
                      <span className="text-sm font-bold text-pink-600">{ratings[cat.key]}/5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={ratings[cat.key]}
                      onChange={(e) => setRatings({...ratings, [cat.key]: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Schlecht</span>
                      <span>Ausgezeichnet</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => rateToilet(ratings)}
                className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg hover:from-pink-600 hover:to-purple-700 font-bold transition-all shadow-lg"
              >
                Bewertung abschicken (+5 Punkte) ⭐
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const LeaderboardModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-pink-600 flex items-center gap-2">
            <Trophy className="text-yellow-500" size={28} />
            Bestenliste
          </h2>
          <button onClick={() => setShowLeaderboard(false)} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚽</div>
            <p className="text-gray-500">Noch keine Nutzer. Sei der Erste!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((user, index) => (
              <div
                key={user.username}
                className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                  user.username === currentUser?.username 
                    ? 'bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-300 scale-105' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-3xl font-bold ${
                    index === 0 ? 'text-yellow-500' : 
                    index === 1 ? 'text-gray-400' : 
                    index === 2 ? 'text-orange-600' : 'text-gray-400'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{user.username}</span>
                      {user.username === currentUser?.username && (
                        <span className="text-xs bg-pink-500 text-white px-2 py-1 rounded-full">Du</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="font-bold text-xl text-pink-600">{user.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
        <div className="text-center">
          <div className="mb-6 animate-bounce">
            <svg width="120" height="120" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
              <rect x="60" y="80" width="80" height="100" rx="15" fill="#E91E63"/>
              <rect x="70" y="90" width="60" height="80" rx="10" fill="#EC407A"/>
              <ellipse cx="100" cy="120" rx="25" ry="20" fill="#4DD0E1"/>
              <ellipse cx="100" cy="120" rx="15" ry="12" fill="#00BCD4"/>
              <circle cx="85" cy="105" r="6" fill="#263238"/>
              <circle cx="115" cy="105" r="6" fill="#263238"/>
              <circle cx="87" cy="103" r="2" fill="white"/>
              <circle cx="117" cy="103" r="2" fill="white"/>
              <path d="M 85 115 Q 100 125 115 115" stroke="#263238" stroke-width="3" fill="none" stroke-linecap="round"/>
              <circle cx="75" cy="115" r="5" fill="#FF4081" opacity="0.4"/>
              <circle cx="125" cy="115" r="5" fill="#FF4081" opacity="0.4"/>
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
            Peepal
          </h1>
          <p className="text-gray-600">Lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12">
              <svg width="48" height="48" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <rect x="60" y="80" width="80" height="100" rx="15" fill="white" opacity="0.9"/>
                <rect x="70" y="90" width="60" height="80" rx="10" fill="#FCE4EC"/>
                <ellipse cx="100" cy="120" rx="25" ry="20" fill="#4DD0E1"/>
                <ellipse cx="100" cy="120" rx="15" ry="12" fill="#00BCD4"/>
                <circle cx="85" cy="105" r="6" fill="#263238"/>
                <circle cx="115" cy="105" r="6" fill="#263238"/>
                <circle cx="87" cy="103" r="2" fill="white"/>
                <circle cx="117" cy="103" r="2" fill="white"/>
                <path d="M 85 115 Q 100 125 115 115" stroke="#263238" stroke-width="3" fill="none" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Peepal</h1>
              <p className="text-xs text-pink-100">h-da Campus WC Finder</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 bg-white bg-opacity-20 backdrop-blur px-4 py-2 rounded-full">
                <Award size={18} />
                <span className="font-bold text-lg">{currentUser.points}</span>
                <span className="text-sm">Punkte</span>
              </div>
            )}
            <button
              onClick={() => setShowLeaderboard(true)}
              className="bg-white bg-opacity-20 backdrop-blur hover:bg-opacity-30 px-4 py-2 rounded-full flex items-center gap-2 transition-all"
            >
              <Trophy size={20} />
              <span className="hidden sm:inline font-medium">Bestenliste</span>
            </button>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0" />
        
        {/* Add Toilet Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="absolute bottom-6 right-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white p-4 rounded-full shadow-2xl z-[500] flex items-center gap-2 transition-all hover:scale-110"
        >
          <Plus size={28} />
          <span className="hidden sm:inline pr-2 font-bold">Toilette hinzufügen</span>
        </button>

        {/* Stats Card */}
        <div className="absolute top-4 left-4 bg-white p-4 rounded-xl shadow-lg z-[500] border-2 border-pink-200">
          <h3 className="font-bold mb-3 text-pink-600 flex items-center gap-2">
            <TrendingUp size={18} />
            Campus Stats
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚽</span>
              <span>Toiletten: <span className="font-bold text-pink-600">{toilets.length}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👥</span>
              <span>Nutzer: <span className="font-bold text-purple-600">{leaderboard.length}</span></span>
            </div>
            {currentUser && (
              <div className="sm:hidden pt-2 border-t border-pink-200 flex items-center gap-2">
                <Award size={16} className="text-pink-500" />
                <span>Deine Punkte: <span className="font-bold text-pink-600">{currentUser.points}</span></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && <AddToiletModal />}
      {showRateModal && <RateToiletModal />}
      {showLeaderboard && <LeaderboardModal />}
    </div>
  );
};

export default PeepalApp;