import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../contexts/AppContext';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker colors
const createColoredIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 24],
  });
};

// Map click handler component
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
};

const AdminTestCenters = () => {
  const { language } = useApp();
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]); // Dhaka default
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDivision, setFilterDivision] = useState('all');
  const [userLocation, setUserLocation] = useState(null); // For Near Me feature
  
  // Form state
  const [formData, setFormData] = useState({
    center_name_en: '',
    center_name_bn: '',
    office_name_en: '',
    office_name_bn: '',
    address_en: '',
    address_bn: '',
    division: '',
    district: '',
    upazila: '',
    latitude: null,
    longitude: null,
    phone: '',
    email: '',
    daily_capacity: 50,
  });
  
  const [clickedPosition, setClickedPosition] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('test_centers_with_rush')
        .select('*')
        .order('division', { ascending: true });

      if (error) throw error;
      setCenters(data || []);
    } catch (err) {
      console.error('Error loading centers:', err);
      setError('Failed to load test centers');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (latlng) => {
    setClickedPosition(latlng);
    setFormData({ ...formData, latitude: latlng.lat, longitude: latlng.lng });
  };

  const handleAddCenter = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.latitude || !formData.longitude) {
      setError('Please click on the map to set the location');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('test_centers')
        .insert([{
          ...formData,
          created_by: userData.user.id,
        }]);

      if (error) throw error;

      setShowAddModal(false);
      resetForm();
      loadCenters();
      
      // Show success notification
      await supabase.rpc('create_dual_notification', {
        p_user_id: userData.user.id,
        p_title: 'Test Center Added',
        p_message: `New test center "${formData.center_name_en}" has been created successfully.`,
        p_admin_title: 'New Test Center',
        p_admin_message: `Test center "${formData.center_name_en}" added by admin.`,
      });
    } catch (err) {
      console.error('Error adding center:', err);
      setError('Failed to add test center');
    }
  };

  const handleEditCenter = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { error } = await supabase
        .from('test_centers')
        .update(formData)
        .eq('id', selectedCenter.id);

      if (error) throw error;

      setShowEditModal(false);
      resetForm();
      loadCenters();
    } catch (err) {
      console.error('Error updating center:', err);
      setError('Failed to update test center');
    }
  };

  const handleDeleteCenter = async (centerId) => {
    if (!confirm('Are you sure you want to deactivate this test center?')) return;

    try {
      const { error } = await supabase
        .from('test_centers')
        .update({ is_active: false })
        .eq('id', centerId);

      if (error) throw error;
      loadCenters();
    } catch (err) {
      console.error('Error deleting center:', err);
      setError('Failed to deactivate test center');
    }
  };

  const resetForm = () => {
    setFormData({
      center_name_en: '',
      center_name_bn: '',
      office_name_en: '',
      office_name_bn: '',
      address_en: '',
      address_bn: '',
      division: '',
      district: '',
      upazila: '',
      latitude: null,
      longitude: null,
      phone: '',
      email: '',
      daily_capacity: 50,
    });
    setClickedPosition(null);
    setSelectedCenter(null);
    setUserLocation(null); // Reset user location when closing modal
  };

  const openEditModal = (center) => {
    setSelectedCenter(center);
    setFormData({
      center_name_en: center.center_name_en,
      center_name_bn: center.center_name_bn,
      office_name_en: center.office_name_en,
      office_name_bn: center.office_name_bn,
      address_en: center.address_en,
      address_bn: center.address_bn,
      division: center.division,
      district: center.district,
      upazila: center.upazila || '',
      latitude: center.latitude,
      longitude: center.longitude,
      phone: center.phone || '',
      email: center.email || '',
      daily_capacity: center.daily_capacity,
    });
    setClickedPosition({ lat: center.latitude, lng: center.longitude });
    setShowEditModal(true);
  };

  const getRushBadge = (rushLevel) => {
    const badges = {
      low: { bg: 'bg-green-100', text: 'text-green-800', label: 'Low Rush' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium Rush' },
      high: { bg: 'bg-red-100', text: 'text-red-800', label: 'High Rush' },
    };
    const badge = badges[rushLevel] || badges.low;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const filteredCenters = centers.filter(center => {
    const matchesSearch = center.center_name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         center.district.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDivision = filterDivision === 'all' || center.division === filterDivision;
    return matchesSearch && matchesDivision;
  });

  const divisions = [...new Set(centers.map(c => c.division))];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              🗺️ Test Center Management
            </h1>
            <p className="text-gray-600 mt-1">Manage physical exam test centers</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
          >
            ➕ Add Test Center
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="🔍 Search centers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Divisions</option>
              {divisions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '600px' }}>
            <MapContainer
              key="main-map"
              center={mapCenter}
              zoom={7}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredCenters.map((center) => (
                <Marker
                  key={center.id}
                  position={[center.latitude, center.longitude]}
                  icon={createColoredIcon(
                    center.rush_level === 'high' ? '#ef4444' :
                    center.rush_level === 'medium' ? '#f59e0b' : '#10b981'
                  )}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg">{center.center_name_en}</h3>
                      <p className="text-sm text-gray-600">{center.address_en}</p>
                      <p className="text-sm mt-2">📞 {center.phone}</p>
                      <p className="text-sm">📊 Capacity: {center.daily_capacity}/day</p>
                      <div className="mt-2">{getRushBadge(center.rush_level)}</div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => openEditModal(center)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCenter(center.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          Deactivate
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Centers List */}
          <div className="bg-white rounded-lg shadow-lg p-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
            <h2 className="text-xl font-bold mb-4">Test Centers ({filteredCenters.length})</h2>
            <div className="space-y-4">
              {filteredCenters.map((center) => (
                <motion.div
                  key={center.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setMapCenter([center.latitude, center.longitude])}
                >
                  <h3 className="font-semibold text-gray-800">{center.center_name_en}</h3>
                  <p className="text-sm text-gray-600 mt-1">{center.district}, {center.division}</p>
                  <div className="mt-2 flex justify-between items-center">
                    {getRushBadge(center.rush_level)}
                    <span className="text-xs text-gray-500">
                      {center.upcoming_bookings} bookings
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(center); }}
                      className="flex-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCenter(center.id); }}
                      className="flex-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Add Center Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-[10000]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">➕ Add New Test Center</h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                            setUserLocation(pos);
                            setMapCenter([pos.lat, pos.lng]);
                            setFormData({ ...formData, latitude: pos.lat, longitude: pos.lng });
                            setClickedPosition(pos);
                          },
                          () => alert('Unable to get your location')
                        );
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-semibold hover:shadow-lg"
                  >
                    📍 Near Me
                  </button>
                </div>
                
                <form onSubmit={handleAddCenter} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Map for location picking */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📍 Click on map to set location {clickedPosition && '✓'}
                    </label>
                    <div style={{ height: '250px', position: 'relative', zIndex: 1 }} className="border-2 border-gray-300 rounded-lg overflow-hidden">
                      <MapContainer key="add-map" center={mapCenter} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <MapClickHandler onMapClick={handleMapClick} />
                        {userLocation && (
                          <Marker 
                            position={[userLocation.lat, userLocation.lng]}
                            icon={createColoredIcon('#ef4444')}
                          >
                            <Popup>📍 Your Location</Popup>
                          </Marker>
                        )}
                        {clickedPosition && (
                          <Marker position={[clickedPosition.lat, clickedPosition.lng]} />
                        )}
                      </MapContainer>
                    </div>
                    {clickedPosition && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Location: {clickedPosition.lat.toFixed(6)}, {clickedPosition.lng.toFixed(6)}
                      </p>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Center Name (English) *"
                    value={formData.center_name_en}
                    onChange={(e) => setFormData({ ...formData, center_name_en: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Center Name (Bangla) *"
                    value={formData.center_name_bn}
                    onChange={(e) => setFormData({ ...formData, center_name_bn: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Office Name (English) *"
                    value={formData.office_name_en}
                    onChange={(e) => setFormData({ ...formData, office_name_en: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Office Name (Bangla) *"
                    value={formData.office_name_bn}
                    onChange={(e) => setFormData({ ...formData, office_name_bn: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Address (English) *"
                    value={formData.address_en}
                    onChange={(e) => setFormData({ ...formData, address_en: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Address (Bangla) *"
                    value={formData.address_bn}
                    onChange={(e) => setFormData({ ...formData, address_bn: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Division *"
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="District *"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Upazila (Optional)"
                    value={formData.upazila}
                    onChange={(e) => setFormData({ ...formData, upazila: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Daily Capacity *"
                    value={formData.daily_capacity}
                    onChange={(e) => setFormData({ ...formData, daily_capacity: parseInt(e.target.value) })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    min="1"
                  />

                  <div className="md:col-span-2 flex gap-4">
                    <button
                      type="button"
                      onClick={() => { setShowAddModal(false); resetForm(); }}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-semibold hover:shadow-lg"
                    >
                      Add Test Center
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Center Modal - Similar structure */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 overflow-y-auto"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-[10000]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">✏️ Edit Test Center</h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                            setUserLocation(pos);
                            setMapCenter([pos.lat, pos.lng]);
                            setFormData({ ...formData, latitude: pos.lat, longitude: pos.lng });
                            setClickedPosition(pos);
                          },
                          () => alert('Unable to get your location')
                        );
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-semibold hover:shadow-lg"
                  >
                    📍 Near Me
                  </button>
                </div>
                
                <form onSubmit={handleEditCenter} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📍 Click on map to update location
                    </label>
                    <div style={{ height: '250px', position: 'relative', zIndex: 1 }} className="border-2 border-gray-300 rounded-lg overflow-hidden">
                      <MapContainer 
                        key={`edit-${selectedCenter?.id}`}
                        center={[clickedPosition.lat, clickedPosition.lng]} 
                        zoom={13} 
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <MapClickHandler onMapClick={handleMapClick} />
                        {userLocation && (
                          <Marker 
                            position={[userLocation.lat, userLocation.lng]}
                            icon={createColoredIcon('#ef4444')}
                          >
                            <Popup>📍 Your Location</Popup>
                          </Marker>
                        )}
                        {clickedPosition && (
                          <Marker position={[clickedPosition.lat, clickedPosition.lng]} />
                        )}
                      </MapContainer>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      Current: {clickedPosition.lat.toFixed(6)}, {clickedPosition.lng.toFixed(6)}
                    </p>
                  </div>

                  <input type="text" placeholder="Center Name (English) *" value={formData.center_name_en} onChange={(e) => setFormData({ ...formData, center_name_en: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  <input type="text" placeholder="Center Name (Bangla) *" value={formData.center_name_bn} onChange={(e) => setFormData({ ...formData, center_name_bn: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  <input type="text" placeholder="Office Name (English) *" value={formData.office_name_en} onChange={(e) => setFormData({ ...formData, office_name_en: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  <input type="text" placeholder="Office Name (Bangla) *" value={formData.office_name_bn} onChange={(e) => setFormData({ ...formData, office_name_bn: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  <input type="text" placeholder="Address (English) *" value={formData.address_en} onChange={(e) => setFormData({ ...formData, address_en: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  <input type="text" placeholder="Address (Bangla) *" value={formData.address_bn} onChange={(e) => setFormData({ ...formData, address_bn: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  <input type="text" placeholder="Division *" value={formData.division} onChange={(e) => setFormData({ ...formData, division: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  <input type="text" placeholder="District *" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  <input type="text" placeholder="Upazila (Optional)" value={formData.upazila} onChange={(e) => setFormData({ ...formData, upazila: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="tel" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="email" placeholder="Email (Optional)" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="Daily Capacity *" value={formData.daily_capacity} onChange={(e) => setFormData({ ...formData, daily_capacity: parseInt(e.target.value) })} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required min="1" />

                  <div className="md:col-span-2 flex gap-4">
                    <button type="button" onClick={() => { setShowEditModal(false); resetForm(); }} className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-semibold hover:shadow-lg">
                      Update Test Center
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminTestCenters;
