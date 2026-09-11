"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, Printer, CheckCircle, Package, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface InventoryItem {
  id: string;
  name: string;
  generic_name?: string;
  barcode?: string;
  price: number;
  quantity: number;
  reserved_quantity: number;
  batch_number?: string;
  expiry_date?: string;
  medicine?: any;
}

interface CartItem extends InventoryItem {
  cartQuantity: number;
}

export default function PharmacyPOSPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchInventory = useCallback(async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      setErrorMsg('');
      const response = await api.pharmacy.getInventory({ search: query, limit: 10 });
      if (response.success) {
        setSearchResults(response.data as InventoryItem[]);
      }
    } catch (err: any) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        fetchInventory(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchInventory]);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const addToCart = (item: InventoryItem) => {
    setErrorMsg('');
    const available = (item.quantity || 0) - (item.reserved_quantity || 0);
    
    setCart(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        if (existing.cartQuantity >= available) {
          setErrorMsg(`Cannot add more. Only ${available} available.`);
          return prev;
        }
        return prev.map(p => p.id === item.id ? { ...p, cartQuantity: p.cartQuantity + 1 } : p);
      }
      if (available <= 0) {
        setErrorMsg(`Out of stock.`);
        return prev;
      }
      return [...prev, { ...item, cartQuantity: 1 }];
    });
    
    // Optional: clear search if scanner is used, but keeping it for manual might be better.
    // If it looks like a barcode (just numbers), we can auto-clear:
    if (/^\d+$/.test(searchTerm) && searchTerm.length > 5) {
      setSearchTerm('');
    }
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setErrorMsg('');
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const available = (item.quantity || 0) - (item.reserved_quantity || 0);
          const newQ = item.cartQuantity + delta;
          if (newQ > available) {
            setErrorMsg(`Cannot add more. Only ${available} available.`);
            return item;
          }
          if (newQ < 1) return item;
          return { ...item, cartQuantity: newQ };
        }
        return item;
      });
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    setErrorMsg('');
    
    try {
      // Generate simple idempotency key
      const idempotencyKey = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
      
      const payload = {
        items: cart.map(i => ({
          inventoryItemId: i.id,
          quantity: i.cartQuantity
        })),
        paymentMethod
      };
      
      const response = await api.pharmacy.createPOSOrder(payload, idempotencyKey);
      
      if (response.success) {
        setReceiptOrder(response.data);
        setCart([]);
        setSearchTerm('');
      } else {
        setErrorMsg(response.message || 'Unable to complete sale. Please retry.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      // Try to parse the specific error message
      const errorMsg = err.response?.data?.message || err.message || 'Unable to complete sale. Please retry.';
      setErrorMsg(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const startNewSale = () => {
    setReceiptOrder(null);
    setCart([]);
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (receiptOrder) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-gray-900 p-4 sm:p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800" id="receipt-area">
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Sale Completed</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Order #{receiptOrder.order_number}</p>
          </div>
          
          <div className="border-t border-b border-gray-100 dark:border-gray-800 py-4 sm:py-6 my-6">
            <div className="flex justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">
              <div>
                <p>Date: {new Date(receiptOrder.created_at).toLocaleString()}</p>
                <p>Source: POS Walk-in</p>
              </div>
              <div className="text-right">
                <p>Payment: <span className="uppercase">{receiptOrder.payment_method}</span></p>
                <p>Status: <span className="text-green-600 dark:text-green-400 font-medium">PAID</span></p>
              </div>
            </div>
            
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-left mt-4 min-w-[320px]">
                <thead>
                  <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3">Item</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-right">Price</th>
                    <th className="pb-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {receiptOrder.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                      </td>
                      <td className="py-3 text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-700 dark:text-gray-300">₹{item.price.toFixed(2)}</td>
                      <td className="py-3 text-right font-medium text-gray-900 dark:text-gray-100">₹{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
            <span>Total Amount</span>
            <span>₹{receiptOrder.total_amount.toFixed(2)}</span>
          </div>
          
          <div className="mt-10 flex space-x-4 print:hidden">
            <button 
              onClick={startNewSale}
              className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              New Sale
            </button>
            <button 
              onClick={handlePrintReceipt}
              className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 flex items-center justify-center space-x-2 transition-colors"
            >
              <Printer className="w-5 h-5" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen lg:h-screen bg-gray-50 dark:bg-[#080e1a] flex-col overflow-y-auto lg:overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0 gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-500 shrink-0" />
            <span>Pharmacy POS</span>
          </h1>
        </div>
        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-visible lg:overflow-hidden">
        
        {/* Left Side: Search & Results */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 relative min-w-0">
          <div className="p-3 sm:p-4 shrink-0 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by medicine name, generic name, or scan barcode..."
                className="w-full pl-10 pr-4 py-3.5 sm:py-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/40 transition-all text-base sm:text-lg shadow-sm"
              />
            </div>
            {isSearching && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Searching...</p>}
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50/50 dark:bg-gray-950/30">
            {searchResults.length === 0 && !isSearching && searchTerm.length >= 2 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
                No matching medicine found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max">
                {searchResults.map((item) => {
                  const available = (item.quantity || 0) - (item.reserved_quantity || 0);
                  const isOutOfStock = available <= 0;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`bg-white dark:bg-gray-800/90 p-4 rounded-xl shadow-sm border ${
                        isOutOfStock 
                          ? 'border-red-100 dark:border-red-900/30 opacity-60' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-md cursor-pointer transition-all'
                      }`}
                      onClick={() => !isOutOfStock && addToCart(item)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex space-x-3">
                          {item.medicine?.image_url ? (
                            <img src={item.medicine.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-gray-100 dark:border-gray-700 shrink-0" />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-600">
                              <Package className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg leading-tight">{item.medicine?.name || item.name}</h3>
                            {(item.medicine?.generic_name || item.generic_name) && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.medicine?.generic_name || item.generic_name}</p>}
                            {(item.medicine?.dosage_form || item.medicine?.strength || item.medicine?.pack_size) && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {[item.medicine.dosage_form, item.medicine.strength, item.medicine.pack_size].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-orange-600 dark:text-orange-400 text-lg">₹{item.price.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-end mt-4 text-sm">
                        <div>
                          {item.batch_number && <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs mr-2">Batch: {item.batch_number}</span>}
                          {item.expiry_date && <span className="text-gray-500 dark:text-gray-400 text-xs">Exp: {new Date(item.expiry_date).toLocaleDateString()}</span>}
                        </div>
                        <div className={`font-medium ${isOutOfStock ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {isOutOfStock ? 'Out of Stock' : `${available} Available`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart */}
        <div className="w-full lg:w-[400px] flex flex-col bg-white dark:bg-gray-900 shrink-0">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <span>Current Sale</span>
              <span className="bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 text-xs px-2 py-1 rounded-full">{cart.length} items</span>
            </h2>
          </div>
          
          {errorMsg && (
            <div className="p-3 m-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 rounded-lg text-sm flex items-start space-x-2 shrink-0">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-gray-500 mt-20 flex flex-col items-center">
                <Package className="w-12 h-12 mb-2 opacity-50" />
                <p>Cart is empty</p>
                <p className="text-sm mt-1">Search or scan items to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex flex-col border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-800 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">₹{item.price.toFixed(2)}/unit</p>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-gray-100">₹{(item.price * item.cartQuantity).toFixed(2)}</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                      <button 
                        onClick={() => updateCartQuantity(item.id, -1)}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-semibold text-gray-900 dark:text-gray-100">{item.cartQuantity}</span>
                      <button 
                        onClick={() => updateCartQuantity(item.id, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-900/80 shrink-0">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-500 dark:text-gray-400 text-lg">Total</span>
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">₹{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 block">Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                {['cash', 'upi', 'card'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method as any)}
                    className={`py-3 rounded-lg font-medium text-sm border-2 transition-all capitalize ${
                      paymentMethod === method 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 shadow-sm' 
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-orange-200 dark:hover:border-orange-800'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all shadow-sm ${
                cart.length === 0 || isProcessing
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 hover:shadow-md'
              }`}
            >
              {isProcessing ? 'Processing Sale...' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Print Styles — static CSS only, passed as React text child (no dangerouslySetInnerHTML needed) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-area, #receipt-area * {
            visibility: visible;
          }
          #receipt-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
