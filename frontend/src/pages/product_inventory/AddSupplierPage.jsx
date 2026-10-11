import React, { useState } from 'react';
import { ArrowLeft, Check, Trash2 } from 'lucide-react';
import './AddSupplierPage.css';

export default function AddSupplierPage({ onNavigate, initialData }) {
    const supplier = initialData?.supplier || {
        name: 'ABC Distributors',
        category: 'Beverages',
        phone: '077 555 1020',
        leadTime: '2 days',
        email: 'orders@abc.lk'
    };

    const [name, setName] = useState(supplier.name || '');
    const [category, setCategory] = useState(supplier.category || '');
    const [phone, setPhone] = useState(supplier.phone || '');
    const [leadTime, setLeadTime] = useState(supplier.leadTime || '2 days');
    const [email, setEmail] = useState(supplier.email || '');
    const [bannerStatus, setBannerStatus] = useState(null); // 'saved' | 'removed'

    const handleSave = (e) => {
        e.preventDefault();
        setBannerStatus('saved');
        setTimeout(() => {
            if (onNavigate) onNavigate('supplier_list');
        }, 1200);
    };

    const handleRemove = () => {
        if (window.confirm('Are you sure you want to remove this supplier?')) {
            setBannerStatus('removed');
            setTimeout(() => {
                if (onNavigate) onNavigate('supplier_list');
            }, 1200);
        }
    };

    return (
        <div className="add-supplier-container">
            {/* Header Title Row matching screenshot */}
            <div className="add-supplier-title-row">
                <h1 className="add-supplier-page-title">Add Supplier</h1>
                <button
                    className="add-supplier-back-btn"
                    onClick={() => onNavigate && onNavigate('supplier_list')}
                    aria-label="Back to suppliers"
                >
                    <ArrowLeft size={22} />
                </button>
            </div>

            {bannerStatus === 'saved' && (
                <div className="add-supplier-banner success">
                    <Check size={18} /> Supplier saved successfully! Redirecting...
                </div>
            )}

            {bannerStatus === 'removed' && (
                <div className="add-supplier-banner danger">
                    <Trash2 size={18} /> Supplier removed. Redirecting...
                </div>
            )}

            {/* Form Fields Stack matching screenshot */}
            <form onSubmit={handleSave} className="add-supplier-form">
                {/* Supplier name */}
                <div className="add-supplier-field-group">
                    <label className="add-supplier-label">Supplier name</label>
                    <input
                        type="text"
                        placeholder="Enter supplier name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="add-supplier-input"
                    />
                </div>

                {/* Category */}
                <div className="add-supplier-field-group">
                    <label className="add-supplier-label">Category</label>
                    <input
                        type="text"
                        placeholder="Enter category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="add-supplier-input"
                    />
                </div>

                {/* Phone */}
                <div className="add-supplier-field-group">
                    <label className="add-supplier-label">Phone</label>
                    <input
                        type="tel"
                        placeholder="Enter phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="add-supplier-input"
                    />
                </div>

                {/* Lead time */}
                <div className="add-supplier-field-group">
                    <label className="add-supplier-label">Lead time</label>
                    <input
                        type="text"
                        placeholder="e.g. 2 days"
                        value={leadTime}
                        onChange={(e) => setLeadTime(e.target.value)}
                        className="add-supplier-input"
                    />
                </div>

                {/* Email */}
                <div className="add-supplier-field-group">
                    <label className="add-supplier-label">Email</label>
                    <input
                        type="email"
                        placeholder="Enter email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="add-supplier-input"
                    />
                </div>

                {/* Bottom Action Buttons Stack matching screenshot */}
                <div className="add-supplier-actions-group">
                    <button type="submit" className="add-supplier-save-btn">
                        Save supplier
                    </button>

                    <button
                        type="button"
                        className="add-supplier-remove-btn"
                        onClick={handleRemove}
                    >
                        Remove supplier
                    </button>
                </div>
            </form>
        </div>
    );
}
