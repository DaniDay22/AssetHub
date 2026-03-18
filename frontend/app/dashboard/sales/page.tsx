'use client';
import React, { useState, useEffect } from 'react';
import { Search, Plus, CreditCard, Banknote, Clock, User, X, Loader2, Trash2 } from 'lucide-react';

export default function SalesFeedPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // NEW: State to control our Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // NEW: State to hold the new sale data
  const [newSale, setNewSale] = useState({
    inventoryId: '',
    quantity: 1,
    paymentMethod: 'Cash'
  });

  // ... existing states ...
  const [inventory, setInventory] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/sales/History', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setSales(json.data);
        } else {
          setError(json.error || 'Failed to load sales.');
        }
      } catch (err) {
        setError('Could not connect to server.');
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  // Fetch inventory ONLY when the modal is opened
  useEffect(() => {
    if (isModalOpen && inventory.length === 0) {
      const fetchInventory = async () => {
        setLoadingInventory(true);
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('http://localhost:5000/api/sales/Inventory', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const json = await res.json();
          if (json.success) setInventory(json.data);
        } catch (err) {
          console.error("Failed to load inventory", err);
        } finally {
          setLoadingInventory(false);
        }
      };
      fetchInventory();
    }
  }, [isModalOpen]);

const handleDeleteSale = async (saleId: number) => {
    if (!window.confirm("Biztosan törlöd ezt az eladást? A termékek visszakerülnek a raktárba.")) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/Sales/${saleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        window.location.reload();
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("Failed to delete.");
    }
  };

// 1. THE BULLETPROOF SEARCH FILTER
  const filteredSales = sales.filter(sale => {
    // Safely grab the text, or use an empty string if it's NULL in the database
    const name = sale?.ProductName || '';
    const brand = sale?.ProductBrand || '';
    const seller = sale?.SellerName || '';
    const search = searchTerm.toLowerCase();

    return name.toLowerCase().includes(search) ||
           brand.toLowerCase().includes(search) ||
           seller.toLowerCase().includes(search);
  });

const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // 1. Send the POST request to your new backend route
      const res = await fetch('http://localhost:5000/api/sales/Add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(newSale)
      });
      
      const json = await res.json();
      
      // 2. If it succeeds, close the modal and refresh the page to show the new data!
      if (json.success) {
        setIsModalOpen(false); 
        window.location.reload(); 
      } else {
        // 3. If there is a backend error (like not enough stock), show it to the user
        alert(json.error); 
      }
    } catch (err) {
      alert("Failed to connect to the server.");
    }
  };

  return (
    <div className="flex-1 p-8 w-full max-w-7xl mx-auto relative min-h-full">
      
      {/* Header & Search Bar Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        
        <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="flex items-center bg-slate-900/50 border border-slate-800 rounded-xl px-4 w-full md:w-80 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                    <Search className="text-slate-500 w-5 h-5 shrink-0 mr-3" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-transparent py-2.5 text-white placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-medium transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>
        

      {/* Main Content Area (Unchanged) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
          <p>Loading sales feed...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24 ">
          {filteredSales.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-slate-900/20">
              <p className="text-slate-500 text-lg">No sales found for this store.</p>
              <p className="text-slate-600 mt-2">Click "New Sale" to add your first transaction!</p>
            </div>
          ) : (
            filteredSales.map((sale, index) => (
              <div key={index} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors group p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1 block">
                      {sale.CategoryName}
                    </span>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {sale.ProductBrand} {sale.ProductName}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-400 block">{sale.PriceAtSale} Ft</span>
                    <span className="text-xs text-slate-500">Qty: {sale.Quantity}</span>
                  </div>
                  <button 
                        onClick={() => handleDeleteSale(sale.Id)} 
                        className="text-slate-500 hover:text-red-400 transition-colors"
                        title="Void Sale"
                      >

                        <Trash2 className="w-5 h-5" />
                      </button>
                </div>
                <div className="space-y-2 pt-4 border-t border-slate-800/50">
                  <div className="flex items-center text-sm text-slate-400">
                    <User className="w-4 h-4 mr-2" /> Sold by {sale.SellerName}
                  </div>
                  <div className="flex items-center text-sm text-slate-400">
                    {sale.PaymentMethod.toLowerCase() === 'cash' ? (
                      <Banknote className="w-4 h-4 mr-2 text-green-500/70" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2 text-blue-500/70" />
                    )}
                    {sale.PaymentMethod}
                  </div>
                  <div className="flex items-center text-sm text-slate-500">
                    <Clock className="w-4 h-4 mr-2" /> {new Date(sale.TimeSold).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* NEW: The Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">Record New Sale</h2>

            <form onSubmit={handleCreateSale} className="space-y-4">
              {/* Product / Inventory Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Select Product</label>
                {loadingInventory ? (
                  <div className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-400 animate-pulse">
                    Loading products...
                  </div>
                ) : (
                  <select 
                    required
                    value={newSale.inventoryId}
                    onChange={(e) => setNewSale({...newSale, inventoryId: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="" disabled>-- Choose a product --</option>
                    {inventory.map((item, idx) => (
                      <option key={idx} value={item.InventoryId}>
                        {item.Brand} {item.Name} | {item.Stock} in stock (${item.Price})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={newSale.quantity}
                  onChange={(e) => setNewSale({...newSale, quantity: parseInt(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Payment Method</label>
                <select 
                  value={newSale.paymentMethod}
                  onChange={(e) => setNewSale({...newSale, paymentMethod: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg mt-4 transition-colors"
              >
                Confirm Sale
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}