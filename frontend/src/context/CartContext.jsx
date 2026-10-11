import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([
        { id: 'p1', name: 'Fresh Red Tomatoes', price: 320, quantity: 2, unit: 'kg' },
        { id: 'p4', name: 'Fresh White Bread', price: 190, quantity: 1, unit: 'loaf' }
    ]);
    const [pickupDate, setPickupDate] = useState('Today');
    const [pickupTimeSlot, setPickupTimeSlot] = useState('4:30 PM - 5:00 PM');
    const [smartReplacement, setSmartReplacement] = useState(true);

    const addToCart = (product) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCartItems(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean));
    };

    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            updateQuantity,
            totalAmount,
            pickupDate,
            setPickupDate,
            pickupTimeSlot,
            setPickupTimeSlot,
            smartReplacement,
            setSmartReplacement
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
