import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Settings, X, Plus, Trash2, Store, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './PickupSchedulePage.css';

export default function PickupSchedulePage({ onNavigate, storeName: initialStoreName }) {
    const { user } = useAuth();

    // Dynamically derive current store name from AuthContext
    const currentStoreName = user?.shopName || user?.storeName || initialStoreName || user?.name || 'PickFresh Super • Main Counter';

    const [slots, setSlots] = useState([
        { id: 'slot1', time: '4:00 PM', duration: '4:00 PM - 4:30 PM', booked: 0, capacity: 10, status: '10 LEFT', isFull: false },
        { id: 'slot2', time: '4:30 PM', duration: '4:30 PM - 5:00 PM', booked: 0, capacity: 10, status: '10 LEFT', isFull: false },
        { id: 'slot3', time: '5:00 PM', duration: '5:00 PM - 5:30 PM', booked: 0, capacity: 10, status: '10 LEFT', isFull: false },
        { id: 'slot4', time: '5:30 PM', duration: '5:30 PM - 6:00 PM', booked: 0, capacity: 10, status: '10 LEFT', isFull: false }
    ]);

    const [activeModalSlot, setActiveModalSlot] = useState(null); // Slot being edited
    const [editTime, setEditTime] = useState('');
    const [editCap, setEditCap] = useState(10);
    const [editBlocked, setEditBlocked] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newTime, setNewTime] = useState('6:00 PM');
    const [newCap, setNewCap] = useState(10);

    // Custom In-App Delete Confirmation Modal State
    const [slotToDelete, setSlotToDelete] = useState(null);

    // Helper to safely extract slot ID
    const getSlotId = (slot) => slot?.id || slot?._id || null;

    const fetchSchedule = async (store) => {
        const storeToFetch = store || currentStoreName;

        try {
            const res = await fetch(`http://localhost:5000/api/order-pickup/schedule?storeName=${encodeURIComponent(storeToFetch)}`);
            const data = await res.json();
            if (res.ok && data.success && data.slots && data.slots.length > 0) {
                setSlots(data.slots);
                localStorage.setItem(`pickfresh_slots_${storeToFetch}`, JSON.stringify(data.slots));
                return;
            }
        } catch (err) {
            console.warn('Schedule fetch error:', err.message);
        }

        // Fallback to cache if offline
        const cached = localStorage.getItem(`pickfresh_slots_${storeToFetch}`);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSlots(parsed);
                }
            } catch (e) { }
        }
    };

    useEffect(() => {
        fetchSchedule(currentStoreName);
    }, [currentStoreName, user]);

    const handleOpenEditModal = (slot) => {
        setActiveModalSlot(slot);
        setEditTime(slot.time || '4:00 PM');
        setEditCap(slot.capacity || 10);
        setEditBlocked(Boolean(slot.isBlocked));
    };

    const handleSaveSlotEdit = async (e) => {
        if (e) e.preventDefault();
        if (!activeModalSlot) return;

        const targetSlotId = getSlotId(activeModalSlot);
        if (!targetSlotId) {
            console.error('Cannot edit slot: missing slotId');
            setActiveModalSlot(null);
            return;
        }

        // Strict optimistic update targeting ONLY the selected slot ID
        const updatedList = slots.map(s => {
            const currentSlotId = getSlotId(s);
            if (currentSlotId === targetSlotId) {
                return {
                    ...s,
                    time: editTime || s.time,
                    capacity: Number(editCap),
                    isBlocked: editBlocked
                };
            }
            return s;
        });

        setSlots(updatedList);
        localStorage.setItem(`pickfresh_slots_${currentStoreName}`, JSON.stringify(updatedList));
        setActiveModalSlot(null); // Close edit modal immediately

        try {
            const res = await fetch('http://localhost:5000/api/order-pickup/slots/capacity', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeName: currentStoreName,
                    slotId: targetSlotId,
                    time: editTime,
                    duration: `${editTime} - Next Slot`,
                    capacity: Number(editCap),
                    isBlocked: editBlocked
                })
            });
            const data = await res.json();
            if (res.ok && data.success && (data.updatedSlots || data.slots)) {
                setSlots(data.updatedSlots || data.slots);
                localStorage.setItem(`pickfresh_slots_${currentStoreName}`, JSON.stringify(data.updatedSlots || data.slots));
            }
        } catch (err) {
            console.warn('Failed to update slot backend:', err);
        }
    };

    // Trigger Custom In-App Deletion Modal
    const handleRequestDelete = (slot) => {
        setSlotToDelete(slot);
    };

    // Confirm Deletion Execution for specific slot ID
    const handleConfirmDeleteSlot = async () => {
        if (!slotToDelete) return;
        const targetSlotId = getSlotId(slotToDelete);
        if (!targetSlotId) {
            setSlotToDelete(null);
            return;
        }

        // Reset modals
        setSlotToDelete(null);
        setActiveModalSlot(null);

        // Strict optimistic filter targeting ONLY the selected slot ID
        const updatedList = slots.filter(s => getSlotId(s) !== targetSlotId);
        setSlots(updatedList);
        localStorage.setItem(`pickfresh_slots_${currentStoreName}`, JSON.stringify(updatedList));

        try {
            const res = await fetch('http://localhost:5000/api/order-pickup/slots/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeName: currentStoreName, slotId: targetSlotId })
            });
            const data = await res.json();
            if (res.ok && data.success && (data.updatedSlots || data.slots)) {
                setSlots(data.updatedSlots || data.slots);
                localStorage.setItem(`pickfresh_slots_${currentStoreName}`, JSON.stringify(data.updatedSlots || data.slots));
            }
        } catch (err) {
            console.warn('Failed to delete slot backend:', err);
        }
    };

    const handleAddNewSlot = async (e) => {
        if (e) e.preventDefault();
        if (!newTime) return;

        const generatedId = `slot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newSlotObj = {
            id: generatedId,
            time: newTime,
            duration: `${newTime} - Next Slot`,
            booked: 0,
            capacity: Number(newCap) || 10,
            status: `${newCap} LEFT`,
            isFull: false,
            isBlocked: false
        };

        // Instant Optimistic Local State Update
        const updatedList = [...slots, newSlotObj];
        setSlots(updatedList);
        localStorage.setItem(`pickfresh_slots_${currentStoreName}`, JSON.stringify(updatedList));
        setShowAddModal(false); // Close modal immediately

        try {
            const res = await fetch('http://localhost:5000/api/order-pickup/slots/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeName: currentStoreName,
                    time: newTime,
                    duration: `${newTime} - Next Slot`,
                    capacity: Number(newCap)
                })
            });
            const data = await res.json();
            if (res.ok && data.success && (data.updatedSlots || data.slots)) {
                setSlots(data.updatedSlots || data.slots);
                localStorage.setItem(`pickfresh_slots_${currentStoreName}`, JSON.stringify(data.updatedSlots || data.slots));
            }
        } catch (err) {
            console.warn('Failed to add slot backend:', err);
        } finally {
            setNewTime('6:00 PM');
            setNewCap(10);
        }
    };

    const getTrafficBadge = (slot) => {
        if (slot.isBlocked) return { text: 'Closed', class: 'traffic-closed' };
        if (slot.isFull || slot.booked >= slot.capacity) return { text: 'Peak (Full)', class: 'traffic-peak' };
        const fillRatio = slot.booked / (slot.capacity || 1);
        if (fillRatio >= 0.7) return { text: 'Moderate', class: 'traffic-moderate' };
        return { text: 'Low Traffic', class: 'traffic-low' };
    };

    const handleBackToOrders = () => {
        if (onNavigate) {
            onNavigate('dashboard');
        }
    };

    return (
        <div className="pickup-schedule-container">
            {/* Header Section */}
            <div className="pickup-schedule-title-row">
                <div>
                    <h1 className="pickup-schedule-page-title">Pickup schedule</h1>
                    <span className="pickup-schedule-subtitle-text">Manage capacity & busy times</span>
                </div>
                <button
                    className="pickup-schedule-back-btn"
                    onClick={handleBackToOrders}
                    aria-label="Back to orders"
                >
                    <ArrowLeft size={22} />
                </button>
            </div>

            {/* Store Context Badge Card - Locked to Shop Owner's Registered Store */}
            <div className="sched-store-selector-card">
                <div className="store-sel-left">
                    <Store size={18} color="#27672D" />
                    <span className="store-sel-label">Managing Store:</span>
                </div>
                <div className="store-sel-badge">
                    <span className="store-sel-badge-name">{currentStoreName}</span>
                </div>
            </div>

            {/* Add Slot Action Header Bar */}
            <div className="sched-action-header-bar">
                <span className="sched-slots-heading">Active Pickup Slots ({slots.length})</span>
                <button
                    className="sched-add-btn"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={16} /> Add Slot
                </button>
            </div>

            {/* Time Slots Cards List */}
            <div className="pickup-schedule-slots-list">
                {slots.map((slot) => {
                    const traffic = getTrafficBadge(slot);
                    const slotTimeLabel = slot.time || '4:00 PM';
                    const bookedCount = slot.booked || 0;
                    const capCount = slot.capacity || 10;
                    const fillPercent = Math.min(100, Math.round((bookedCount / capCount) * 100));
                    const currentId = getSlotId(slot) || `slot_fallback_${Math.random()}`;

                    return (
                        <div key={currentId} className={`pickup-slot-card-item ${traffic.class}`}>
                            <div className="slot-card-left">
                                <div className="slot-clock-icon-wrapper">
                                    <Clock size={20} color="#27672D" />
                                </div>
                                <div className="slot-details-column">
                                    <h3 className="pickup-slot-time-title">{slotTimeLabel}</h3>
                                    <span className="pickup-slot-bookings-sub">
                                        <strong>{bookedCount}</strong> / {capCount} bookings
                                    </span>
                                    {/* Progress Fill Line */}
                                    <div className="slot-progress-bar-bg">
                                        <div
                                            className="slot-progress-bar-fill"
                                            style={{
                                                width: `${fillPercent}%`,
                                                backgroundColor: fillPercent >= 100 ? '#EF4444' : (fillPercent >= 70 ? '#F59E0B' : '#10B981')
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="slot-card-right">
                                <span className={`traffic-badge ${traffic.class}`}>
                                    {traffic.text}
                                </span>
                                <button
                                    className="slot-edit-settings-btn"
                                    onClick={() => handleOpenEditModal(slot)}
                                >
                                    <Settings size={15} /> Edit
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* EDIT SLOT MODAL DIALOG */}
            {activeModalSlot && !slotToDelete && (
                <div className="sched-modal-overlay" onClick={() => setActiveModalSlot(null)}>
                    <div className="sched-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="sched-modal-header">
                            <h3>Edit Pickup Time Slot</h3>
                            <button className="sched-modal-close" onClick={() => setActiveModalSlot(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="sched-modal-body">
                            <div className="sched-field-group">
                                <label>Time Slot Label (e.g. 4:00 PM):</label>
                                <input
                                    type="text"
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    placeholder="e.g. 4:30 PM"
                                />
                            </div>

                            <div className="sched-field-group">
                                <label>Maximum Capacity Limit (Orders):</label>
                                <input
                                    type="number"
                                    value={editCap}
                                    onChange={(e) => setEditCap(e.target.value)}
                                    placeholder="e.g. 10"
                                />
                            </div>

                            <div className="sched-field-checkbox">
                                <input
                                    type="checkbox"
                                    id="blockSlotCheck"
                                    checked={editBlocked}
                                    onChange={(e) => setEditBlocked(e.target.checked)}
                                />
                                <label htmlFor="blockSlotCheck">
                                    Temporarily Close/Block this slot
                                </label>
                            </div>
                        </div>

                        <div className="sched-modal-footer">
                            <button
                                className="sched-delete-btn"
                                onClick={() => handleRequestDelete(activeModalSlot)}
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                            <div className="sched-right-btns">
                                <button
                                    className="sched-cancel-btn"
                                    onClick={() => setActiveModalSlot(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="sched-save-btn"
                                    onClick={handleSaveSlotEdit}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM IN-APP DELETE CONFIRMATION MODAL */}
            {slotToDelete && (
                <div className="sched-modal-overlay" onClick={() => setSlotToDelete(null)}>
                    <div className="sched-modal-card delete-confirm-card" onClick={(e) => e.stopPropagation()}>
                        <div className="sched-delete-icon-wrapper">
                            <AlertTriangle size={32} color="#DC2626" />
                        </div>
                        <h3 className="sched-delete-confirm-title">Delete Time Slot?</h3>
                        <p className="sched-delete-confirm-msg">
                            Are you sure you want to delete the <strong>{slotToDelete.time || 'selected'}</strong> pickup slot? This action cannot be undone.
                        </p>
                        <div className="sched-delete-confirm-actions">
                            <button
                                className="sched-delete-confirm-cancel-btn"
                                onClick={() => setSlotToDelete(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="sched-delete-confirm-yes-btn"
                                onClick={handleConfirmDeleteSlot}
                            >
                                Delete Slot
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD SLOT MODAL DIALOG */}
            {showAddModal && (
                <div className="sched-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="sched-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="sched-modal-header">
                            <h3>Add New Pickup Slot</h3>
                            <button className="sched-modal-close" onClick={() => setShowAddModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="sched-modal-body">
                            <div className="sched-field-group">
                                <label>Slot Pickup Time (e.g. 6:00 PM):</label>
                                <input
                                    type="text"
                                    value={newTime}
                                    onChange={(e) => setNewTime(e.target.value)}
                                    placeholder="e.g. 6:30 PM"
                                />
                            </div>

                            <div className="sched-field-group">
                                <label>Max Order Capacity:</label>
                                <input
                                    type="number"
                                    value={newCap}
                                    onChange={(e) => setNewCap(e.target.value)}
                                    placeholder="10"
                                />
                            </div>
                        </div>

                        <div className="sched-modal-footer">
                            <button
                                className="sched-cancel-btn"
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="sched-save-btn"
                                onClick={handleAddNewSlot}
                            >
                                Add Slot
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Back Button */}
            <div className="pickup-schedule-actions-group">
                <button
                    className="pickup-schedule-orders-btn"
                    onClick={handleBackToOrders}
                >
                    Back to Orders
                </button>
            </div>
        </div>
    );
}
