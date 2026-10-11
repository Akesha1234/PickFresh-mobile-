const SupplierReplenishment = require('./SupplierReplenishmentModel');
const SupplierAlert = require('../models/SupplierAlert');
const SupplierNotification = require('../models/SupplierNotification');
const User = require('../models/User');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Helper function kept clean so real database alerts/replenishments persist
const cleanSeededMockData = async () => {
    // No-op to retain database records
};

// Helper to auto-extract brand from product name if brand field is missing
const autoExtractBrand = (productName) => {
    if (!productName || typeof productName !== 'string') return '';
    const knownBrands = [
        'Anchor', 'Highland', 'Maliban', 'Munchee', 'Keells', 'Ratthi', 'Elephant House',
        'Coca-Cola', 'Coke', 'Sunquick', 'Kist', 'Astra', 'Maggi', 'MD', 'Surf Excel',
        'Vim', 'Sunlight', 'Signal', 'Kotmale', 'Bairaha', 'Prima', 'Nestle', 'Milo',
        'Laksala', 'Pelwatte', 'Harischandra', 'McCurrie', 'Dilmah', 'Zesta', 'Watawala',
        'Sanstha', 'Cargills', 'Knorr', 'Heinz', 'Pringles', 'Lays', 'Lay\'s', 'Sprite',
        'Fanta', 'Pepsi', 'Red Bull', '7Up', 'Nescafé', 'Nescafe', 'Goldlee', 'Wijaya',
        'Ruhunu', 'Motha', 'Roar', 'Smak', 'Country Fair', 'Delmege', 'Orient'
    ];
    for (const b of knownBrands) {
        const regex = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(productName)) {
            return b;
        }
    }
    return '';
};

// Helper to build dynamic supplier filter with fast index lookup
const getSupplierFilter = (req) => {
    const supplierEmail = (req.query.supplierEmail || req.user?.email || '').trim().toLowerCase();
    const supplierName = (req.query.supplierName || req.user?.supplierName || req.user?.name || '').trim();

    const conditions = [];

    if (supplierEmail) {
        conditions.push({ supplierEmail: supplierEmail });
    }
    if (supplierName) {
        const escapedName = supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        conditions.push({ supplierName: { $regex: escapedName, $options: 'i' } });
    }

    if (conditions.length === 0) {
        return null;
    }

    return {
        supplierEmail,
        supplierName,
        filter: conditions.length === 1 ? conditions[0] : { $or: conditions }
    };
};

// GET /api/supplier-replenishment/catalog
exports.getSupplierCatalog = async (req, res) => {
    try {
        const supplierEmail = (req.query.supplierEmail || req.user?.email || '').trim().toLowerCase();
        const supplierName = (req.query.supplierName || req.user?.supplierName || req.user?.name || '').trim();

        const supplierContext = getSupplierFilter(req);

        let products = [];
        if (supplierContext && supplierContext.filter) {
            products = await SupplierProductCatalog.find(supplierContext.filter).sort({ createdAt: -1 }).lean().exec();
        } else if (!supplierEmail && !supplierName) {
            // Only if NO supplier is specified (e.g., global shop owner view), return all products
            products = await SupplierProductCatalog.find({}).sort({ createdAt: -1 }).lean().exec();
        }

        const formattedProducts = (products || []).map(p => {
            let b = (p.brand || '').trim();
            if (!b && p.name) {
                b = autoExtractBrand(p.name);
            }
            const numericPrice = Number(p.price || p.wholesalePrice || p.wholesaleRate || 0);
            return {
                ...p,
                brand: b,
                price: numericPrice,
                wholesalePrice: numericPrice,
                wholesaleRate: numericPrice
            };
        });

        return res.json({ success: true, count: formattedProducts.length, products: formattedProducts });
    } catch (error) {
        console.error('getSupplierCatalog Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// In-Memory Catalog Map Cache (120 second TTL for optimal performance)
let globalCatalogMapCache = { timestamp: 0, map: new Map() };

const getCachedCatalogMap = async () => {
    const now = Date.now();
    if (globalCatalogMapCache.map.size > 0 && (now - globalCatalogMapCache.timestamp < 120000)) {
        return globalCatalogMapCache.map;
    }
    const catalogMap = new Map();
    try {
        const SupplierProductCatalog = require('../models/SupplierProductCatalog');
        const Product = require('../models/Product');

        const [catalogItems, prods] = await Promise.all([
            SupplierProductCatalog.find({}).select('name productName price wholesalePrice wholesaleRate image imageUrl').lean(),
            Product.find({}).select('name image imageUrl price wholesalePrice wholesaleRate').lean()
        ]);

        catalogItems.forEach(c => {
            const title = (c.productName || c.name || '').trim().toLowerCase();
            const img = c.image || c.imageUrl;
            const priceVal = Number(c.wholesalePrice || c.price || c.wholesaleRate || 0);
            if (title) catalogMap.set(title, { img, price: priceVal, wholesalePrice: priceVal, wholesaleRate: priceVal });
        });
        prods.forEach(p => {
            const title = (p.name || '').trim().toLowerCase();
            const img = p.image || p.imageUrl;
            const priceVal = Number(p.wholesalePrice || p.wholesaleRate || p.price || 0);
            if (title && !catalogMap.has(title)) catalogMap.set(title, { img, price: priceVal, wholesalePrice: priceVal, wholesaleRate: priceVal });
        });
        globalCatalogMapCache = { timestamp: now, map: catalogMap };
    } catch (e) {
        console.warn('Catalog map cache warning:', e.message);
    }
    return catalogMap;
};

const findCatalogInfo = (catalogMap, title) => {
    if (!title) return null;
    const cleanTitle = String(title).trim().toLowerCase();
    if (catalogMap.has(cleanTitle)) return catalogMap.get(cleanTitle);

    for (const [key, val] of catalogMap.entries()) {
        if (key.includes(cleanTitle) || cleanTitle.includes(key)) {
            return val;
        }
    }
    return null;
};

// In-Memory Store List Cache per supplier (60s TTL)
const storeListCache = new Map(); // key: supplierKey, value: { timestamp, stores }

// Helper to retrieve consolidated unique stores for a specific supplier
const fetchStoreListForSupplier = async (supplierContext) => {
    if (!supplierContext) return [];

    const cacheKey = supplierContext.supplierEmail || supplierContext.supplierName || 'all';
    const cached = storeListCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 60000)) {
        return cached.stores;
    }

    const { filter: supplierFilter, supplierEmail, nameRegex, emailRegex } = supplierContext;
    const { Supplier: SupplierModel, RestockRequest } = require('../product_inventory/ProductInventoryModel');

    const linkedStoreIdentifiers = new Set();

    const supplierColQuery = {};
    if (nameRegex || emailRegex) {
        const orConds = [];
        if (nameRegex) orConds.push({ name: nameRegex });
        if (emailRegex) orConds.push({ email: emailRegex });
        supplierColQuery.$or = orConds;
    }

    // Execute ALL source queries in parallel for maximum speed
    const [supplierUser, supplierUsers, suppliersInCol, supplierProducts, replenishments, restockRequests, allShopOwners] = await Promise.all([
        supplierEmail ? User.findOne({ email: supplierEmail }).select('linkedStores').lean() : null,
        nameRegex ? User.find({ role: 'supplier', $or: [{ supplierName: nameRegex }, { name: nameRegex }] }).select('linkedStores').lean() : [],
        SupplierModel.find(Object.keys(supplierColQuery).length ? supplierColQuery : {}).select('linkedStores').lean(),
        nameRegex ? Product.find({ supplierName: nameRegex }).select('ownerEmail storeName').lean() : [],
        SupplierReplenishment.find(supplierFilter).select('storeEmail storeName ownerName address phone city').lean(),
        RestockRequest.find(supplierFilter).select('storeEmail storeName ownerName storeAddress phone city').lean(),
        User.find({ role: 'shop_owner' }).select('_id name shopName storeAddress address location phone email storeStatus picture profilePic avatar image').lean().catch(() => [])
    ]);

    // Build user profile map indexed by email, shopName, and name for instant 100% picture matching
    const userProfileMap = new Map();
    (allShopOwners || []).forEach(u => {
        const pic = u.picture || u.profilePic || u.avatar || u.image || '';
        const storeObj = {
            id: u._id.toString(),
            name: u.shopName || u.name || 'Store Client',
            owner: u.name || 'Shop Owner',
            address: u.storeAddress || u.address || u.location || 'High Level Road, Maharagama',
            phone: u.phone || '077 123 4567',
            email: u.email || '',
            status: u.storeStatus === 'closed' ? 'INACTIVE' : 'ACTIVE',
            city: u.location || 'Colombo',
            picture: pic,
            profilePic: pic
        };
        if (u.email) userProfileMap.set(u.email.toLowerCase().trim(), storeObj);
        if (u.shopName) userProfileMap.set(u.shopName.toLowerCase().trim(), storeObj);
        if (u.name) userProfileMap.set(u.name.toLowerCase().trim(), storeObj);
    });

    if (supplierUser && Array.isArray(supplierUser.linkedStores)) {
        supplierUser.linkedStores.forEach(entry => {
            const val = typeof entry === 'string' ? entry : (entry.email || entry.storeEmail || entry.name || '');
            if (val.trim()) linkedStoreIdentifiers.add(val.trim().toLowerCase());
        });
    }

    supplierUsers.forEach(su => {
        if (Array.isArray(su.linkedStores)) {
            su.linkedStores.forEach(entry => {
                const val = typeof entry === 'string' ? entry : (entry.email || entry.storeEmail || entry.name || '');
                if (val.trim()) linkedStoreIdentifiers.add(val.trim().toLowerCase());
            });
        }
    });

    suppliersInCol.forEach(s => {
        if (Array.isArray(s.linkedStores)) {
            s.linkedStores.forEach(entry => {
                const val = typeof entry === 'string' ? entry : (entry.email || entry.storeEmail || entry.name || '');
                if (val.trim()) linkedStoreIdentifiers.add(val.trim().toLowerCase());
            });
        }
    });

    supplierProducts.forEach(p => {
        if (p.ownerEmail) linkedStoreIdentifiers.add(p.ownerEmail.trim().toLowerCase());
        if (p.storeName) linkedStoreIdentifiers.add(p.storeName.trim().toLowerCase());
    });

    replenishments.forEach(r => {
        if (r.storeEmail) linkedStoreIdentifiers.add(r.storeEmail.trim().toLowerCase());
        if (r.storeName) linkedStoreIdentifiers.add(r.storeName.trim().toLowerCase());
    });
    restockRequests.forEach(r => {
        if (r.storeEmail) linkedStoreIdentifiers.add(r.storeEmail.trim().toLowerCase());
        if (r.storeName) linkedStoreIdentifiers.add(r.storeName.trim().toLowerCase());
    });

    const storeMap = new Map();

    // Populate stores matching linkedStoreIdentifiers using userProfileMap
    linkedStoreIdentifiers.forEach(identifier => {
        const matchedObj = userProfileMap.get(identifier);
        if (matchedObj) {
            const key = matchedObj.name.toLowerCase().trim();
            if (!storeMap.has(key)) {
                storeMap.set(key, matchedObj);
            }
        }
    });

    // Fallback: include stores from replenishments
    replenishments.forEach((r, idx) => {
        const storeName = r.storeName;
        if (!storeName) return;
        const key = storeName.toLowerCase().trim();
        if (!storeMap.has(key)) {
            const emailKey = r.storeEmail ? r.storeEmail.toLowerCase().trim() : '';
            const matchedObj = userProfileMap.get(key) || (emailKey ? userProfileMap.get(emailKey) : null);
            if (matchedObj) {
                storeMap.set(key, matchedObj);
            } else {
                storeMap.set(key, {
                    id: r._id ? r._id.toString() : `store-rep-${idx}`,
                    name: storeName,
                    owner: r.ownerName || 'Registered Client',
                    address: r.address || 'Main Street, Maharagama',
                    phone: r.phone || '071 987 6543',
                    email: r.storeEmail || '',
                    status: 'ACTIVE',
                    city: r.city || 'Maharagama',
                    picture: r.picture || r.profilePic || '',
                    profilePic: r.picture || r.profilePic || ''
                });
            }
        }
    });

    // Fallback: include stores from RestockRequests
    restockRequests.forEach((r, idx) => {
        const storeName = r.storeName;
        if (!storeName) return;
        const key = storeName.toLowerCase().trim();
        if (!storeMap.has(key)) {
            const emailKey = r.storeEmail ? r.storeEmail.toLowerCase().trim() : '';
            const matchedObj = userProfileMap.get(key) || (emailKey ? userProfileMap.get(emailKey) : null);
            if (matchedObj) {
                storeMap.set(key, matchedObj);
            } else {
                storeMap.set(key, {
                    id: r._id ? r._id.toString() : `store-req-${idx}`,
                    name: storeName,
                    owner: r.ownerName || 'Shop Owner',
                    address: r.storeAddress || 'Main Street',
                    phone: r.phone || '077 000 0000',
                    email: r.storeEmail || '',
                    status: 'ACTIVE',
                    city: r.city || 'Colombo',
                    picture: r.picture || r.profilePic || '',
                    profilePic: r.picture || r.profilePic || ''
                });
            }
        }
    });

    const resultStores = Array.from(storeMap.values());
    storeListCache.set(cacheKey, { timestamp: Date.now(), stores: resultStores });
    return resultStores;
};

// 1. Supplier Dashboard Stats (Pure Dynamic MongoDB Atlas Queries)
exports.getDashboardStats = async (req, res) => {
    try {
        await cleanSeededMockData();

        const supplierContext = getSupplierFilter(req);

        // If no authenticated/provided supplier context, return empty stats without data leakage
        if (!supplierContext) {
            return res.json({
                success: true,
                stats: { storeClients: 0, pendingOrders: 0, deliveriesToday: 0 },
                latestAlert: null,
                recentRequests: []
            });
        }

        const { supplierName, supplierEmail, filter: supplierFilter, nameRegex, emailRegex } = supplierContext;
        const { Supplier, RestockRequest } = require('../product_inventory/ProductInventoryModel');

        // 1. Calculate storeClients: Count UNIQUE stores linked to THIS supplier via shared helper
        const uniqueStores = await fetchStoreListForSupplier(supplierContext);
        const storeClientsCount = uniqueStores.length;

        // 2. Count UNIQUE pending replenishment orders for THIS supplier (deduplicated by PO number)
        const [pendingReps, pendingRestocks] = await Promise.all([
            SupplierReplenishment.find({
                ...supplierFilter,
                status: { $in: ['Pending Approval', 'Pending'] }
            }).select('poId _id').lean(),
            RestockRequest.find({
                ...supplierFilter,
                status: 'Pending'
            }).select('poNumber _id').lean()
        ]);

        const uniquePendingPos = new Set();
        pendingReps.forEach(r => {
            if (r.poId) uniquePendingPos.add(r.poId);
            else if (r._id) uniquePendingPos.add(r._id.toString());
        });
        pendingRestocks.forEach(r => {
            if (r.poNumber) uniquePendingPos.add(r.poNumber);
            else if (r._id) uniquePendingPos.add(r._id.toString());
        });

        const pendingOrdersCount = uniquePendingPos.size;

        // 3. Count active deliveries for THIS supplier
        let deliveriesTodayCount = await SupplierReplenishment.countDocuments({
            ...supplierFilter,
            status: { $in: ['In Transit', 'Dispatched', 'Accepted', 'Packed'] }
        });

        // 4. Get latest stock alert SPECIFICALLY for THIS supplier
        let latestAlertDoc = null;

        try {
            // First check RestockRequest specifically for this supplier
            let latestReq = await RestockRequest.findOne({
                ...supplierFilter,
                status: 'Pending'
            }).sort({ createdAt: -1 });

            if (latestReq && latestReq.items && latestReq.items.length > 0) {
                const itemNames = latestReq.items.map(i => i.name).join(', ');
                const totalReorder = latestReq.items.reduce((sum, i) => sum + (i.qty || 0), 0);
                latestAlertDoc = {
                    storeName: latestReq.storeName || 'Store Client',
                    productName: `${itemNames} restock alert`,
                    currentStock: latestReq.unitsLeft !== undefined ? latestReq.unitsLeft : 4,
                    suggestedReorder: totalReorder || 40
                };
            } else {
                // Check SupplierReplenishment
                let latestRep = await SupplierReplenishment.findOne({
                    ...supplierFilter,
                    status: { $in: ['Pending Approval', 'Pending'] }
                }).sort({ requestedDate: -1 });

                if (latestRep) {
                    latestAlertDoc = {
                        storeName: latestRep.storeName || 'Store Client',
                        productName: `${latestRep.itemsSummary || latestRep.product} restock alert`,
                        currentStock: latestRep.unitsLeft !== undefined ? latestRep.unitsLeft : 4,
                        suggestedReorder: latestRep.reorderUnits || 40
                    };
                }
            }
        } catch (err) {
            console.error("Latest alert sub-query error:", err.message);
        }

        let recentRequests = await SupplierReplenishment.find(supplierFilter).sort({ requestedDate: -1 }).limit(5);

        return res.json({
            success: true,
            stats: {
                storeClients: storeClientsCount,
                pendingOrders: pendingOrdersCount,
                deliveriesToday: deliveriesTodayCount
            },
            latestAlert: latestAlertDoc ? {
                storeName: latestAlertDoc.storeName || 'Store Client',
                productName: latestAlertDoc.productName || 'Stock threshold alert',
                currentStock: latestAlertDoc.currentStock ?? 0,
                suggestedReorder: latestAlertDoc.suggestedReorderQuantity ?? latestAlertDoc.suggestedReorder ?? 20
            } : null,
            recentRequests
        });
    } catch (error) {
        console.error('getDashboardStats Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


// 2. Get Replenishment Requests List (Filtered strictly by supplier) - merges SupplierReplenishment + RestockRequest
exports.getReplenishmentRequests = async (req, res) => {
    try {
        const supplierContext = getSupplierFilter(req);
        if (!supplierContext) {
            return res.json({ success: true, count: 0, requests: [] });
        }

        const { filter: supplierFilter, supplierName } = supplierContext;
        const { RestockRequest } = require('../product_inventory/ProductInventoryModel');

        // Query BOTH collections in parallel for THIS supplier only
        let [replenishments, restockRequests] = await Promise.all([
            SupplierReplenishment.find(supplierFilter).sort({ requestedDate: -1 }).lean(),
            RestockRequest.find(supplierFilter).sort({ createdAt: -1 }).lean()
        ]);

        const catalogMap = await getCachedCatalogMap();

        // Format SupplierReplenishment records
        const formattedReplenishments = replenishments.map(r => {
            const rawItems = r.items || [];
            const formattedItems = rawItems.map(i => {
                const title = (i.produce || i.name || i.product || '').trim().toLowerCase();
                const catEntry = catalogMap.get(title);
                const resolvedImg = i.image || i.imageUrl || (catEntry ? catEntry.img : '') || '';
                return {
                    produce: i.produce || i.name || i.product,
                    name: i.name || i.produce || i.product,
                    qty: i.qty || 1,
                    unit: i.unit || 'pack',
                    image: resolvedImg,
                    imageUrl: resolvedImg,
                    currentStock: i.currentStock,
                    minOrder: i.minOrder
                };
            });
            let prodName = r.product;
            if (!prodName || prodName === 'Multiple Products') {
                prodName = formattedItems.length > 0
                    ? formattedItems.map(i => i.produce).join(', ')
                    : (r.itemsSummary || 'Restock Request');
            }
            const summary = r.itemsSummary || formattedItems.map(i => `${i.qty}x ${i.produce}`).join(', ');

            return {
                id: r.poId || r._id.toString(),
                _id: r._id.toString(),
                poId: r.poId || r._id.toString(),
                store: r.storeName || 'Unknown Store',
                storeName: r.storeName || 'Unknown Store',
                supplierName: r.supplierName || supplierName || 'Supplier',
                product: prodName,
                itemsSummary: summary,
                items: formattedItems,
                unitsLeft: r.unitsLeft !== undefined ? r.unitsLeft : 0,
                threshold: r.threshold || 10,
                reorderUnits: r.reorderUnits || (formattedItems.reduce((sum, i) => sum + (i.qty || 0), 0)),
                status: r.status || 'Pending Approval',
                highlight: r.highlight,
                requestedDate: r.requestedDate,
                deliveryTarget: r.deliveryTarget || 'Tomorrow 10.30 AM',
                deliveryDate: r.deliveryTarget || 'Tomorrow 10.30 AM',
                source: 'replenishment'
            };
        });

        // Track poIds already included to avoid duplicates
        const includedPoIds = new Set(formattedReplenishments.map(r => r.poId));

        // Format RestockRequest records (shop owner side POs)
        const formattedRestock = restockRequests
            .filter(r => !includedPoIds.has(r.poNumber || r._id.toString()))
            .map(r => {
                const totalQty = r.items ? r.items.reduce((sum, i) => sum + (i.qty || 0), 0) : 0;
                const summary = r.items ? r.items.map(i => `${i.qty || 1}x ${i.name}`).join(', ') : 'Restock Item';
                const formattedItems = r.items ? r.items.map(i => {
                    const title = (i.name || i.produce || '').trim().toLowerCase();
                    const catEntry = catalogMap.get(title);
                    const resolvedImg = i.image || i.imageUrl || (catEntry ? catEntry.img : '') || '';
                    return {
                        produce: i.name || i.produce,
                        name: i.name || i.produce,
                        qty: i.qty,
                        unit: i.unit,
                        image: resolvedImg,
                        imageUrl: resolvedImg,
                        currentStock: i.currentStock,
                        minOrder: i.minOrder
                    };
                }) : [];
                return {
                    id: r.poNumber || r._id.toString(),
                    _id: r._id.toString(),
                    poId: r.poNumber || r._id.toString(),
                    store: r.storeName || 'Unknown Store',
                    storeName: r.storeName || 'Unknown Store',
                    supplierName: r.supplierName || supplierName || 'Supplier',
                    product: r.items && r.items.length > 1 ? `${r.items.length} Products (${summary})` : (r.items && r.items[0] ? r.items[0].name : 'Restock Item'),
                    itemsSummary: summary,
                    items: formattedItems,
                    unitsLeft: r.unitsLeft !== undefined ? r.unitsLeft : 0,
                    threshold: r.threshold || 10,
                    reorderUnits: totalQty,
                    status: r.status || 'Pending',
                    highlight: false,
                    requestedDate: r.createdAt,
                    deliveryTarget: r.deliveryDate || 'Tomorrow',
                    deliveryDate: r.deliveryDate || 'Tomorrow',
                    source: 'restock'
                };
            });

        const allRequests = [...formattedReplenishments, ...formattedRestock]
            .sort((a, b) => new Date(b.requestedDate || 0) - new Date(a.requestedDate || 0));

        return res.json({
            success: true,
            count: allRequests.length,
            requests: allRequests
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get Restock Request Details (MongoDB Atlas)
exports.getRequestDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const cleanId = String(id || '').replace('#', '').trim();
        const { RestockRequest } = require('../product_inventory/ProductInventoryModel');
        let po = null;
        if (cleanId) {
            po = await SupplierReplenishment.findOne({
                $or: [{ poId: cleanId }, { poId: `#${cleanId}` }]
            });
            if (!po && /^[0-9a-fA-F]{24}$/.test(cleanId)) {
                try { po = await SupplierReplenishment.findById(cleanId); } catch (e) { }
            }
            if (!po) {
                po = await RestockRequest.findOne({
                    $or: [{ poNumber: cleanId }, { poNumber: `#${cleanId}` }]
                });
                if (!po && /^[0-9a-fA-F]{24}$/.test(cleanId)) {
                    try { po = await RestockRequest.findById(cleanId); } catch (e) { }
                }
            }
        }
        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

        const poObj = po.toObject ? po.toObject() : { ...po };
        if (Array.isArray(poObj.items)) {
            const catalogMap = await getCachedCatalogMap();
            poObj.items = poObj.items.map(i => {
                const title = i.produce || i.name || i.product || '';
                const catEntry = findCatalogInfo(catalogMap, title);
                const resolvedImg = i.image || i.imageUrl || (catEntry ? catEntry.img : '') || '';
                let rate = (catEntry && catEntry.price > 0) ? catEntry.price : Number(i.wholesalePrice || i.wholesaleRate || i.price || 0);
                if (!rate) rate = 150;
                const qty = Number(i.qty || i.quantity || 1);
                return {
                    ...i,
                    image: resolvedImg,
                    imageUrl: resolvedImg,
                    wholesaleRate: rate,
                    wholesalePrice: rate,
                    price: rate,
                    subtotal: rate * qty
                };
            });
            poObj.totalAmount = poObj.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        }

        return res.json({ success: true, po: poObj, request: poObj });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Update PO Status & Logistics Info (MongoDB Atlas CRUD Update)
exports.updatePOStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, driverName, vehicleNo, tempStorage, etaMinutes, currentLocation } = req.body;

        const cleanId = String(id || '').replace('#', '').trim();
        const { RestockRequest } = require('../product_inventory/ProductInventoryModel');

        let po = null;
        let restockDoc = null;

        if (cleanId) {
            po = await SupplierReplenishment.findOne({
                $or: [{ poId: cleanId }, { poId: `#${cleanId}` }]
            });
            if (!po && /^[0-9a-fA-F]{24}$/.test(cleanId)) {
                try { po = await SupplierReplenishment.findById(cleanId); } catch (e) { }
            }

            restockDoc = await RestockRequest.findOne({
                $or: [{ poNumber: cleanId }, { poNumber: `#${cleanId}` }]
            });
            if (!restockDoc && /^[0-9a-fA-F]{24}$/.test(cleanId)) {
                try { restockDoc = await RestockRequest.findById(cleanId); } catch (e) { }
            }
        }

        if (!po && restockDoc) {
            po = await SupplierReplenishment.findOne({
                $or: [{ poId: restockDoc.poNumber }, { poId: `#${restockDoc.poNumber}` }]
            });
        }
        if (!restockDoc && po) {
            restockDoc = await RestockRequest.findOne({
                $or: [{ poNumber: po.poId }, { poNumber: `#${po.poId}` }]
            });
        }

        if (!po && !restockDoc) {
            return res.status(404).json({ success: false, message: 'PO not found in MongoDB Atlas' });
        }

        if (po) {
            if (status) po.status = status;
            if (driverName !== undefined) po.driverName = driverName;
            if (vehicleNo !== undefined) po.vehicleNo = vehicleNo;
            if (tempStorage !== undefined) po.tempStorage = tempStorage;
            if (etaMinutes !== undefined) po.etaMinutes = etaMinutes;
            if (currentLocation !== undefined) po.currentLocation = currentLocation;
            await po.save();
        }

        if (restockDoc) {
            if (status) restockDoc.status = status;
            if (etaMinutes !== undefined) {
                restockDoc.etaMinutes = etaMinutes;
                restockDoc.deliveryTarget = `${etaMinutes} mins`;
            }
            await restockDoc.save();
        }

        const activeDoc = po || restockDoc;
        const itemsList = (po && po.items) || (restockDoc && restockDoc.items) || [];
        const poIdVal = (po && po.poId) || (restockDoc && restockDoc.poNumber) || cleanId;
        const sName = (po && po.supplierName) || (restockDoc && restockDoc.supplierName) || '';
        const sEmail = (po && po.supplierEmail) || (restockDoc && restockDoc.supplierEmail) || '';
        const storeN = (po && po.storeName) || (restockDoc && restockDoc.storeName) || 'Store Client';

        // Auto-restock inventory stock levels when status becomes 'Delivered', 'Completed', or 'Fulfilled' (case-insensitive)
        const isDeliveredState = status && ['delivered', 'completed', 'fulfilled'].includes(status.trim().toLowerCase());
        if (isDeliveredState && Array.isArray(itemsList) && itemsList.length > 0) {
            try {
                const Product = require('../models/Product');
                for (const item of itemsList) {
                    const itemTitle = (item.produce || item.name || '').trim();
                    const qtyToAdd = Number(item.qty) || 0;
                    if (itemTitle && qtyToAdd > 0) {
                        const regex = new RegExp(`^${itemTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
                        let matchedProds = await Product.find({ name: regex });
                        if (!matchedProds || matchedProds.length === 0) {
                            matchedProds = await Product.find({ name: new RegExp(itemTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
                        }
                        if (matchedProds && matchedProds.length > 0) {
                            for (const matchedProd of matchedProds) {
                                const currentStk = Number(matchedProd.stock !== undefined ? matchedProd.stock : matchedProd.stockQuantity) || 0;
                                const newStock = currentStk + qtyToAdd;
                                matchedProd.stock = newStock;
                                matchedProd.stockQuantity = newStock;
                                const threshold = matchedProd.minStock || matchedProd.lowStockThreshold || 10;
                                if (newStock >= threshold) {
                                    matchedProd.status = 'IN STOCK';
                                    matchedProd.stockStatus = 'In Stock';
                                } else {
                                    matchedProd.status = 'LOW STOCK';
                                    matchedProd.stockStatus = 'Low Stock';
                                }
                                await matchedProd.save();
                                console.log(`✅ Auto-restocked ${matchedProd.name} (ID: ${matchedProd._id}) +${qtyToAdd} (Stock: ${currentStk} -> ${newStock})`);
                            }
                        }
                    }
                }
                // Invalidate Product RAM Cache so shop owner views updated stock levels immediately
                try {
                    const { invalidateProductsCache } = require('../product_inventory/productInventoryController');
                    if (invalidateProductsCache) invalidateProductsCache();
                } catch (e) { }
            } catch (autoRestockErr) {
                console.warn('Auto-restock inventory warning:', autoRestockErr.message);
            }
        }

        if (status) {
            try {
                await SupplierNotification.create({
                    supplierName: sName,
                    supplierEmail: sEmail,
                    type: status === 'In Transit' || status === 'Dispatched' ? 'delivery' : 'po',
                    title: `PO ${poIdVal} status updated to ${status} 📦`,
                    message: `${storeN} request status updated to ${status}.`,
                    read: false
                });
            } catch (notifErr) {
                console.warn('Notification creation notice:', notifErr.message);
            }
        }

        return res.json({ success: true, message: 'Status updated successfully in MongoDB Atlas', po: activeDoc });
    } catch (error) {
        console.error('EXACT_STACK:', error.stack);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Get Store List Directory (Only stores linked to THIS supplier)
exports.getStoreList = async (req, res) => {
    try {
        const supplierContext = getSupplierFilter(req);
        if (!supplierContext) {
            return res.json({ success: true, count: 0, stores: [] });
        }

        const stores = await fetchStoreListForSupplier(supplierContext);
        return res.json({ success: true, count: stores.length, stores });
    } catch (error) {
        console.error('getStoreList error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Get Live Delivery Tracking Status (Filtered by Supplier)
exports.getDeliveryTracking = async (req, res) => {
    try {
        const supplierContext = getSupplierFilter(req);
        let supplierFilter = {};
        let supplierName = '';

        if (supplierContext) {
            supplierFilter = supplierContext.filter;
            supplierName = supplierContext.supplierName;
        } else if (req.query.storeName || req.query.storeEmail || req.query.store) {
            const sName = (req.query.storeName || req.query.store || '').trim();
            const sEmail = (req.query.storeEmail || '').trim().toLowerCase();
            const conds = [];
            if (sName) {
                const cleanName = sName.split('•')[0].split('-')[0].trim();
                conds.push({ storeName: new RegExp(cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
            }
            if (sEmail) {
                conds.push({ storeEmail: new RegExp(`^${sEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
            }
            if (conds.length > 0) {
                supplierFilter = conds.length === 1 ? conds[0] : { $or: conds };
            }
        }

        const { RestockRequest } = require('../product_inventory/ProductInventoryModel');

        // Query BOTH SupplierReplenishment and RestockRequest collections in parallel
        let [activeDeliveries, restockDeliveries] = await Promise.all([
            SupplierReplenishment.find(supplierFilter).sort({ requestedDate: -1 }).lean(),
            RestockRequest.find(supplierFilter).sort({ createdAt: -1 }).lean()
        ]);

        const catalogMap = await getCachedCatalogMap();

        // Format SupplierReplenishment records
        const formattedReplenishments = activeDeliveries.map(d => {
            const rawItems = d.items || [];
            const formattedItems = rawItems.map(i => {
                const prodTitle = i.produce || i.name || 'Product';
                const catInfo = findCatalogInfo(catalogMap, prodTitle);

                let itemImg = i.image || i.imageUrl || (catInfo ? catInfo.img : '') || '';
                let rate = (catInfo && catInfo.price > 0) ? catInfo.price : Number(i.wholesaleRate || i.wholesalePrice || i.price || 0);
                if (!rate) rate = 150;
                const qty = i.qty || 1;

                return {
                    produce: prodTitle,
                    name: prodTitle,
                    qty: qty,
                    unit: i.unit || 'pack',
                    image: itemImg,
                    imageUrl: itemImg,
                    wholesaleRate: rate,
                    wholesalePrice: rate,
                    price: rate,
                    subtotal: rate * qty
                };
            });

            const calculatedTotal = formattedItems.reduce((sum, it) => sum + (it.subtotal || 0), 0) || d.totalAmount || 6000;

            return {
                id: d._id,
                _id: d._id,
                poId: d.poId || 'PO-0001',
                storeName: d.storeName || 'LankaMart',
                supplierName: d.supplierName || supplierName || 'Central Food City',
                status: d.status || 'Pending Approval',
                product: d.product || (formattedItems.length > 0 ? formattedItems.map(i => i.produce).join(', ') : 'Fresh Produce Restock'),
                items: formattedItems,
                itemsSummary: d.itemsSummary || formattedItems.map(i => `${i.qty}x ${i.produce}`).join(', '),
                totalAmount: calculatedTotal,
                reorderUnits: d.reorderUnits || formattedItems.reduce((sum, i) => sum + (i.qty || 0), 0) || 40,
                requestedDate: d.requestedDate || d.createdAt,
                driverName: d.driverName || 'Kamal Wijekoon',
                driverPhone: d.driverPhone || '077 888 2211',
                vehicleNo: d.vehicleNo || 'WP-GA-4521',
                tempStorage: d.tempStorage || '4.2°C (Optimal)',
                etaMinutes: d.etaMinutes || 24,
                currentLocation: d.currentLocation || 'High Level Road, Maharagama (En Route)'
            };
        });

        // Format RestockRequest records (preventing duplicates if already in SupplierReplenishment)
        const existingPoNumbers = new Set(formattedReplenishments.map(r => String(r.poId).replace('#', '').trim()));

        const formattedRestock = restockDeliveries
            .filter(r => !existingPoNumbers.has(String(r.poNumber || '').replace('#', '').trim()))
            .map(r => {
                const rawItems = r.items || [];
                const formattedItems = rawItems.map(i => {
                    const prodTitle = i.name || i.produce || 'Product';
                    const catInfo = findCatalogInfo(catalogMap, prodTitle);

                    let itemImg = i.image || i.imageUrl || (catInfo ? catInfo.img : '') || '';
                    let rate = (catInfo && catInfo.price > 0) ? catInfo.price : Number(i.wholesalePrice || i.wholesaleRate || i.price || 0);
                    if (!rate) rate = 150;
                    const qty = i.qty || i.quantity || 1;

                    return {
                        produce: prodTitle,
                        name: prodTitle,
                        qty: qty,
                        unit: i.unit || 'pack',
                        image: itemImg,
                        imageUrl: itemImg,
                        wholesaleRate: rate,
                        wholesalePrice: rate,
                        price: rate,
                        subtotal: rate * qty
                    };
                });

                const calculatedTotal = formattedItems.reduce((sum, it) => sum + (it.subtotal || 0), 0) || 5000;

                return {
                    id: r._id,
                    _id: r._id,
                    poId: r.poNumber || 'PO-0001',
                    storeName: r.storeName || 'LankaMart',
                    supplierName: r.supplierName || supplierName || 'Central Food City',
                    status: r.status || 'Pending Approval',
                    product: formattedItems.length > 0 ? formattedItems.map(i => i.produce).join(', ') : 'Fresh Produce Restock',
                    items: formattedItems,
                    itemsSummary: formattedItems.map(i => `${i.qty}x ${i.produce}`).join(', '),
                    totalAmount: calculatedTotal,
                    reorderUnits: formattedItems.reduce((sum, i) => sum + (i.qty || 0), 0) || 40,
                    requestedDate: r.createdAt,
                    driverName: 'Kamal Wijekoon',
                    driverPhone: '077 888 2211',
                    vehicleNo: 'WP-GA-4521',
                    tempStorage: '4.2°C (Optimal)',
                    etaMinutes: r.etaMinutes || 24,
                    currentLocation: 'High Level Road, Maharagama (En Route)'
                };
            });

        const allDeliveries = [...formattedReplenishments, ...formattedRestock]
            .sort((a, b) => new Date(b.requestedDate || 0) - new Date(a.requestedDate || 0));

        if (allDeliveries.length === 0) {
            return res.json({
                success: true,
                delivery: null,
                deliveries: []
            });
        }

        const activeDeliveryDoc = allDeliveries.find(d => ['In Transit', 'Dispatched', 'Accepted', 'Packed'].includes(d.status)) || allDeliveries[0];

        return res.json({
            success: true,
            delivery: activeDeliveryDoc || null,
            deliveries: allDeliveries
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Get Notifications (Filtered by Supplier)
exports.getNotifications = async (req, res) => {
    try {
        const supplierContext = getSupplierFilter(req);
        if (!supplierContext) {
            return res.json({ success: true, notifications: [] });
        }

        const { filter: supplierFilter, supplierEmail } = supplierContext;

        let supplierCreatedAt = new Date(0);
        if (supplierEmail) {
            try {
                const user = await User.findOne({ email: supplierEmail.toLowerCase() }).select('createdAt').lean();
                if (user && user.createdAt) {
                    supplierCreatedAt = new Date(user.createdAt);
                }
            } catch (e) {
                console.warn('Could not fetch supplier createdAt date:', e.message);
            }
        }

        const query = { ...supplierFilter, createdAt: { $gte: supplierCreatedAt } };
        const notifications = await SupplierNotification.find(query).sort({ createdAt: -1 });
        return res.json({ success: true, notifications });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Mark Notifications Read (MongoDB Atlas)
exports.markNotificationRead = async (req, res) => {
    try {
        const supplierContext = getSupplierFilter(req);
        const filter = supplierContext ? supplierContext.filter : {};
        await SupplierNotification.updateMany({ ...filter, read: false }, { read: true });
        return res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Create Notification (MongoDB Atlas)
exports.createNotification = async (req, res) => {
    try {
        const { type, title, message, supplierName, supplierEmail } = req.body;
        const notif = await SupplierNotification.create({
            supplierName: supplierName || '',
            supplierEmail: supplierEmail || '',
            type: type || 'po',
            title: title || 'New Restock Alert 📦',
            message: message || 'Store submitted restock request',
            read: false
        });
        return res.status(201).json({ success: true, notification: notif });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 10. Supplier Catalog Management (CRUD)
const SupplierProductCatalog = require('../models/SupplierProductCatalog');
const invalidateCatalogCache = () => { };
const clearSupplierCaches = () => {
    try {
        storeListCache.clear();
        globalCatalogMapCache = { timestamp: 0, map: new Map() };
    } catch (e) { }
};
exports.clearSupplierCaches = clearSupplierCaches;

// POST /api/supplier-replenishment/catalog
exports.addSupplierCatalogProduct = async (req, res) => {
    try {
        invalidateCatalogCache();
        const { name, brand, category, price, minOrderQty, unit, image, status } = req.body;
        const supplierEmail = (req.body.supplierEmail || req.user?.email || req.query.supplierEmail || '').trim().toLowerCase();
        const supplierName = (req.body.supplierName || req.user?.supplierName || req.user?.name || req.query.supplierName || 'Supplier').trim();

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Product name is required' });
        }

        let finalBrand = (brand || '').trim();
        if (!finalBrand) {
            finalBrand = autoExtractBrand(name);
        }

        const numPrice = Number(price) || 0;
        const newProduct = await SupplierProductCatalog.create({
            supplierEmail,
            supplierName,
            name: name.trim(),
            brand: finalBrand,
            category: category || 'General Wholesale',
            price: numPrice,
            wholesalePrice: numPrice,
            wholesaleRate: numPrice,
            minOrderQty: Number(minOrderQty) || 1,
            unit: unit || 'unit',
            image: image || '',
            status: status || 'Available'
        });

        const prodObj = newProduct.toObject();
        prodObj.brand = prodObj.brand || autoExtractBrand(prodObj.name);
        prodObj.price = numPrice;
        prodObj.wholesalePrice = numPrice;
        prodObj.wholesaleRate = numPrice;

        return res.status(201).json({ success: true, product: prodObj });
    } catch (error) {
        console.error('addSupplierCatalogProduct Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/supplier-replenishment/catalog/:id
exports.updateSupplierCatalogProduct = async (req, res) => {
    try {
        invalidateCatalogCache();
        const { id } = req.params;
        const { name, brand, category, price, minOrderQty, unit, image, status } = req.body;

        let product = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            product = await SupplierProductCatalog.findById(id);
        }
        if (!product) {
            product = await SupplierProductCatalog.findOne({ _id: id });
        }

        if (!product) {
            return res.status(404).json({ success: false, message: 'Catalog product not found' });
        }

        if (name !== undefined) product.name = name.trim();

        if (brand !== undefined) {
            product.brand = String(brand || '').trim();
        }
        if (!product.brand && product.name) {
            product.brand = autoExtractBrand(product.name);
        }

        if (category !== undefined) product.category = category;
        if (price !== undefined) {
            const numP = Number(price) || 0;
            product.price = numP;
            product.wholesalePrice = numP;
            product.wholesaleRate = numP;
        }
        if (minOrderQty !== undefined) product.minOrderQty = Number(minOrderQty);
        if (unit !== undefined) product.unit = unit;
        if (image !== undefined) product.image = image;
        if (status !== undefined) product.status = status;

        await product.save();

        const prodObj = product.toObject();
        prodObj.brand = prodObj.brand || autoExtractBrand(prodObj.name);
        const finalP = product.price || 0;
        prodObj.price = finalP;
        prodObj.wholesalePrice = finalP;
        prodObj.wholesaleRate = finalP;

        return res.json({ success: true, message: 'Catalog product updated successfully', product: prodObj });
    } catch (error) {
        console.error('updateSupplierCatalogProduct Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/supplier-replenishment/catalog/:id
exports.deleteSupplierCatalogProduct = async (req, res) => {
    try {
        invalidateCatalogCache();
        const { id } = req.params;
        let deleted = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            deleted = await SupplierProductCatalog.findByIdAndDelete(id);
        }
        if (!deleted) {
            deleted = await SupplierProductCatalog.findOneAndDelete({ _id: id });
        }

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Catalog product not found' });
        }

        return res.json({ success: true, message: 'Product deleted from catalog successfully' });
    } catch (error) {
        console.error('deleteSupplierCatalogProduct Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/supplier-replenishment/requests/:id
// Delete PO / Replenishment Request permanently from MongoDB Atlas
exports.deletePO = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Order ID is required' });
        }

        const cleanId = (id || '').replace(/^#/, '').trim();

        let poQuery = { $or: [{ poId: cleanId }, { poId: `#${cleanId}` }] };
        let restockQuery = { $or: [{ poNumber: cleanId }, { poNumber: `#${cleanId}` }] };

        if (mongoose.Types.ObjectId.isValid(cleanId)) {
            poQuery.$or.push({ _id: cleanId });
            restockQuery.$or.push({ _id: cleanId });
        }

        const { RestockRequest: RestockRequestModel } = require('../product_inventory/ProductInventoryModel');
        const [poRes, restockRes] = await Promise.all([
            SupplierReplenishment.deleteMany(poQuery),
            RestockRequestModel.deleteMany(restockQuery)
        ]);

        console.log(`🗑️ Deleted PO ${cleanId} from DB. SupplierReplenishment deleted: ${poRes.deletedCount}, RestockRequest deleted: ${restockRes.deletedCount}`);

        return res.json({
            success: true,
            message: 'Order deleted successfully from database',
            deletedCount: (poRes.deletedCount || 0) + (restockRes.deletedCount || 0)
        });
    } catch (error) {
        console.error('Failed to delete PO:', error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

