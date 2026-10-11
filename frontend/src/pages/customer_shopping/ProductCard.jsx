import React from 'react';
import { Plus, Star, Leaf, Check } from 'lucide-react';
import './ProductCard.css';

export default function ProductCard({ product, onSelect, onAddToCart }) {
    return (
        <div className="product-card-item">
            {/* Top Farm & Ripeness Badge */}
            <div className="product-card-badge-row">
                <span className="product-card-badge">
                    <Leaf size={10} /> Organic
                </span>
                <div className="product-card-rating">
                    <Star size={10} fill="#EAB308" color="#EAB308" />
                    <span>{product.rating || '4.8'}</span>
                </div>
            </div>

            {/* Product Produce Icon / Image */}
            <div className="product-card-img-wrapper" onClick={onSelect}>
                <span className="product-card-emoji">{product.image || '🥗'}</span>
            </div>

            {/* Title & Farm Name */}
            <div className="product-card-info" onClick={onSelect}>
                <span className="product-card-farm">{product.farm || 'Local Organic Farm'}</span>
                <h4 className="product-card-title">{product.name}</h4>
                <p className="product-card-ripeness">{product.ripeness || 'Harvested Fresh'}</p>
            </div>

            {/* Price & Add Button */}
            <div className="product-card-bottom">
                <div className="product-card-price-group">
                    <span className="product-card-price">Rs. {product.price}</span>
                    <span className="product-card-unit">/ {product.unit || 'kg'}</span>
                </div>

                <button className="product-card-add-btn" onClick={onAddToCart}>
                    <Plus size={16} /> Add
                </button>
            </div>
        </div>
    );
}
