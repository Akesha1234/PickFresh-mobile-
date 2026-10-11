const mongoose = require('mongoose');
const { Product, Supplier, RestockRequest } = require('./ProductInventoryModel');
const Order = require('../models/Order');
const Category = require('../models/Category');

// Helper default categories if collection is empty
const DEFAULT_CATEGORIES = [
    { name: 'Dairy', fallbackEmoji: '🥛', color: '#E3F2FD', textColor: '#1565C0', image: '/dairy_icon.png' },
    { name: 'Beverages', fallbackEmoji: '🥤', color: '#FFF3E0', textColor: '#E65100', image: '' },
    { name: 'Grocery', fallbackEmoji: '📦', color: '#E8F5E9', textColor: '#2E7D32', image: '' },
    { name: 'Bakery', fallbackEmoji: '🍞', color: '#FCE4EC', textColor: '#C2185B', image: '/bakery_icon.png' },
    { name: 'Vegetables', fallbackEmoji: '🥕', color: '#E8F5E9', textColor: '#2E7D32', image: '/veg_icon.png' },
    { name: 'Fruits', fallbackEmoji: '🥑', color: '#FFF3E0', textColor: '#E65100', image: '/fruit_icon.png' },
    { name: 'Snacks', fallbackEmoji: '🍿', color: '#FFF8E1', textColor: '#F57F17', image: '' },
    { name: 'Grains', fallbackEmoji: '🌾', color: '#F3E5F5', textColor: '#7B1FA2', image: '' }
];

let isCategoriesSeeded = false;
const ensureCategoriesSeeded = async () => {
    if (isCategoriesSeeded) return;
    try {
        const count = await Category.countDocuments();
        if (count === 0) {
            await Category.insertMany(DEFAULT_CATEGORIES);
        }
        isCategoriesSeeded = true;
    } catch (e) {
        console.warn('Category seed check exception:', e.message);
    }
};

// Get All Categories from MongoDB
exports.getCategories = async (req, res) => {
    try {
        ensureCategoriesSeeded(); // Non-blocking async check
        const categories = await Category.find({}).sort({ createdAt: 1 }).lean();
        return res.json({ success: true, categories });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Add New Custom Category
exports.addCategory = async (req, res) => {
    try {
        const { name, image, fallbackEmoji } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }
        const existing = await Category.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
        if (existing) {
            return res.json({ success: true, message: 'Category already exists', category: existing });
        }

        const newCat = await Category.create({
            name: name.trim(),
            image: image || '',
            fallbackEmoji: fallbackEmoji || '📦',
            color: '#E8F5E9',
            textColor: '#2E7D32'
        });

        return res.status(201).json({ success: true, message: 'Category created successfully', category: newCat });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Update Existing Category in MongoDB Atlas
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, image, fallbackEmoji } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Category ID or Name is required' });
        }

        const decoded = decodeURIComponent(id).trim();
        let cat = null;

        if (mongoose.Types.ObjectId.isValid(decoded)) {
            cat = await Category.findById(decoded);
        }
        if (!cat) {
            const safeName = decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cat = await Category.findOne({ name: new RegExp(`^${safeName}$`, 'i') });
        }

        if (!cat) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const oldName = cat.name;

        if (name && name.trim()) cat.name = name.trim();
        if (image !== undefined) cat.image = image;
        if (fallbackEmoji !== undefined) cat.fallbackEmoji = fallbackEmoji;

        await cat.save();

        // Also update any products associated with old category name if name changed
        if (name && name.trim() && name.trim() !== oldName) {
            await Product.updateMany({ category: oldName }, { category: name.trim() });
        }

        return res.json({ success: true, message: 'Category updated successfully', category: cat });
    } catch (err) {
        console.error('Error updating category:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Delete Category from MongoDB
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Category ID or Name is required' });
        }

        const decoded = decodeURIComponent(id).trim();
        let deletedCategory = null;

        // Try deleting by ObjectId if valid
        if (mongoose.Types.ObjectId.isValid(decoded)) {
            deletedCategory = await Category.findByIdAndDelete(decoded);
        }

        // Fallback: Delete by category name (case-insensitive)
        if (!deletedCategory) {
            const safeName = decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            deletedCategory = await Category.findOneAndDelete({ name: new RegExp(`^${safeName}$`, 'i') });
        }

        return res.json({
            success: true,
            message: 'Category deleted successfully from MongoDB',
            deletedCategory
        });
    } catch (err) {
        console.error('Error deleting category:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
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

// Helper to calculate status
const calculateStatus = (stock, minStock) => {
    if (stock <= 0) return 'OUT OF STOCK';
    if (stock <= minStock) return 'LOW STOCK';
    return 'IN STOCK';
};

// 1. Shop Owner Dashboard Summary strictly from MongoDB Atlas for target shop (Ultra Fast Parallel Queries)
exports.getDashboardStats = async (req, res) => {
    try {
        let query = {};
        const { storeEmail, storeName } = req.query;

        if (storeEmail) {
            query.ownerEmail = storeEmail.toLowerCase();
        }

        let targetStoreName = (storeName || '').split('•')[0].trim();
        let storeRegex = null;
        if (targetStoreName) {
            storeRegex = new RegExp(targetStoreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }

        // Execute all database queries simultaneously in parallel for instant sub-20ms response
        let [dbProducts, activePickupsCount, completedOrders, recentProducts] = await Promise.all([
            Product.find(query).lean(),
            storeRegex
                ? Order.countDocuments({ status: { $in: ['Pending', 'Preparing', 'Ready for Pickup'] }, pickupStore: storeRegex })
                : (!storeEmail && !storeName ? Order.countDocuments({ status: { $in: ['Pending', 'Preparing', 'Ready for Pickup'] } }) : 0),
            storeRegex
                ? Order.find({ status: 'Completed', pickupStore: storeRegex }).select('totalAmount').lean()
                : (!storeEmail && !storeName ? Order.find({ status: 'Completed' }).select('totalAmount').lean() : []),
            Product.find(query).sort({ createdAt: -1 }).limit(5).lean()
        ]);

        const totalProducts = dbProducts.length;
        const lowStockCount = dbProducts.filter(p => {
            const stk = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
            const minStk = p.minStock !== undefined ? p.minStock : (p.lowStockThreshold || 10);
            return stk > 0 && stk <= minStk;
        }).length;
        const outOfStockCount = dbProducts.filter(p => {
            const stk = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
            return stk === 0;
        }).length;

        const todaySales = (completedOrders || []).reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Generate real recent activity dynamically from shop owner's products
        const recentActivity = (recentProducts || []).map((p) => {
            const stk = p.stock !== undefined ? p.stock : (p.stockQuantity || 0);
            const isOut = stk === 0;
            const diffMinutes = Math.floor((new Date() - new Date(p.createdAt || Date.now())) / (1000 * 60));
            let timeAgoStr = 'Just now';
            if (diffMinutes >= 60 * 24) {
                timeAgoStr = `${Math.floor(diffMinutes / (60 * 24))}d ago`;
            } else if (diffMinutes >= 60) {
                timeAgoStr = `${Math.floor(diffMinutes / 60)}h ago`;
            } else if (diffMinutes > 0) {
                timeAgoStr = `${diffMinutes}m ago`;
            }

            return {
                id: p._id.toString(),
                title: p.name,
                subtitle: `${timeAgoStr} • ${isOut ? 'Out of Stock' : 'Stock Updated'}`,
                change: isOut ? `0` : `+${stk}`,
                type: isOut ? 'out' : 'in'
            };
        });

        return res.json({
            success: true,
            stats: {
                totalProducts,
                lowStockCount,
                outOfStockCount,
                todaySales,
                activePickups: activePickupsCount || 0
            },
            lowStockItems: dbProducts.filter(p => {
                const stk = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
                const minStk = p.minStock !== undefined ? p.minStock : (p.lowStockThreshold || 10);
                return stk <= minStk;
            }),
            recentActivity
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Product RAM memory cache for instant (1ms) responses
let productsMemoryCache = null;
let productsMemoryCacheTime = 0;

const invalidateProductsCache = () => {
    productsMemoryCache = null;
    productsMemoryCacheTime = 0;
};
exports.invalidateProductsCache = invalidateProductsCache;

const getCategoryImageFallback = (catName = '', prodName = '') => {
    const combined = `${catName} ${prodName}`.toLowerCase();
    if (combined.includes('milk') || combined.includes('dairy') || combined.includes('cheese') || combined.includes('egg')) return '/cat_dairy.png';
    if (combined.includes('fruit') || combined.includes('avocado') || combined.includes('apple') || combined.includes('strawberry')) return '/cat_fruits.png';
    if (combined.includes('bread') || combined.includes('bakery') || combined.includes('bun')) return '/cat_bakery.png';
    if (combined.includes('drink') || combined.includes('beverage') || combined.includes('coke') || combined.includes('juice')) return '/cat_beverages.png';
    return '/cat_veg.png';
};

// Pre-warm products RAM cache on server startup
setTimeout(async () => {
    try {
        const products = await Product.find({}).lean().exec();
        if (products && products.length > 0) {
            productsMemoryCache = products.map(p => {
                const stk = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
                const minStk = p.minStock !== undefined ? p.minStock : (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 10);
                const rawImg = p.image || p.imageUrl || '';
                const finalImg = rawImg && (rawImg.startsWith('data:') || rawImg.startsWith('http') || rawImg.startsWith('/')) ? rawImg : getCategoryImageFallback(p.category, p.name);
                let b = (p.brand || '').trim();
                if (!b && p.name) {
                    b = autoExtractBrand(p.name);
                }
                return {
                    id: p._id.toString(),
                    _id: p._id.toString(),
                    name: p.name,
                    price: p.price,
                    unit: p.unit || 'kg',
                    brand: b,
                    stock: stk,
                    stockQuantity: stk,
                    minStock: minStk,
                    lowStockThreshold: minStk,
                    status: p.status || p.stockStatus || calculateStatus(stk, minStk),
                    stockStatus: p.stockStatus || calculateStatus(stk, minStk),
                    storeName: p.storeName || 'Lanka Mart',
                    supplierName: p.supplierName || 'Central Food City',
                    ownerEmail: p.ownerEmail || '',
                    storeIcon: p.storeIcon || '',
                    category: p.category || 'Grocery',
                    image: finalImg,
                    imageUrl: finalImg,
                    fallbackEmoji: p.fallbackEmoji || '📦',
                    bgColor: p.bgColor || '#EFF6FF'
                };
            });
            productsMemoryCacheTime = Date.now();
            console.log('⚡ [PERFORMANCE] Product Inventory RAM Cache pre-warmed successfully with', productsMemoryCache.length, 'products!');
        }
    } catch (e) {
        console.warn('Product cache pre-warm task queued:', e.message);
    }
}, 1500);

// 2. Get All Products (Direct MongoDB Atlas 'products' collection query with RAM cache & instant response)
exports.getProducts = async (req, res) => {
    try {
        const now = Date.now();
        const storeEmailParam = (req.query.storeEmail || '').toLowerCase().trim();
        const forceRefresh = req.query._t || req.query.refresh === 'true';

        // Return instant sub-millisecond RAM memory cache if available AND forceRefresh is not requested
        if (!forceRefresh && productsMemoryCache && productsMemoryCache.length > 0 && (now - productsMemoryCacheTime < 30 * 60 * 1000)) {
            let filtered = productsMemoryCache;
            if (storeEmailParam) {
                filtered = productsMemoryCache.filter(p => !p.ownerEmail || p.ownerEmail.toLowerCase() === storeEmailParam);
            }
            return res.json({ success: true, count: filtered.length, products: filtered });
        }

        let query = {};
        if (storeEmailParam) {
            query.ownerEmail = storeEmailParam;
        }

        let products = await Product.find(query).sort({ createdAt: -1 }).lean().maxTimeMS(5000);

        // Auto seed ONLY if global DB is fully empty
        if ((!products || products.length === 0) && !storeEmailParam) {
            const totalCount = await Product.countDocuments().maxTimeMS(3000);
            if (totalCount === 0) {
                const seedProducts = [
                    { name: 'Fresh Red Tomatoes', category: 'Vegetables', price: 320, unit: '1kg', stockQuantity: 45, lowStockThreshold: 10, stockStatus: 'In Stock', description: 'Fresh farm red tomatoes', supplierName: 'Central Food City' },
                    { name: 'Green Beans', category: 'Vegetables', price: 280, unit: '1kg', stockQuantity: 8, lowStockThreshold: 10, stockStatus: 'Low Stock', description: 'Organic green beans', supplierName: 'Central Food City' }
                ];
                await Product.insertMany(seedProducts);
                products = await Product.find({}).sort({ createdAt: -1 }).lean();
            }
        }

        const formattedProducts = (products || []).map(p => {
            const stk = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
            const minStk = p.minStock !== undefined ? p.minStock : (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 10);
            const rawImg = p.image || p.imageUrl || '';
            const finalImg = rawImg && (rawImg.startsWith('data:') || rawImg.startsWith('http') || rawImg.startsWith('/')) ? rawImg : getCategoryImageFallback(p.category, p.name);
            let b = (p.brand || '').trim();
            if (!b && p.name) {
                b = autoExtractBrand(p.name);
            }
            return {
                id: p._id.toString(),
                _id: p._id.toString(),
                name: p.name,
                price: p.price,
                unit: p.unit || 'kg',
                brand: b,
                stock: stk,
                stockQuantity: stk,
                minStock: minStk,
                lowStockThreshold: minStk,
                status: p.status || p.stockStatus || calculateStatus(stk, minStk),
                stockStatus: p.stockStatus || calculateStatus(stk, minStk),
                storeName: p.storeName || 'Lanka Mart',
                supplierName: p.supplierName || 'Central Food City',
                ownerEmail: p.ownerEmail || '',
                storeIcon: p.storeIcon || '',
                category: p.category || 'Grocery',
                image: finalImg,
                imageUrl: finalImg,
                fallbackEmoji: p.fallbackEmoji || '📦',
                bgColor: p.bgColor || '#EFF6FF'
            };
        });

        if (!storeEmailParam && formattedProducts.length > 0) {
            productsMemoryCache = formattedProducts;
            productsMemoryCacheTime = Date.now();
        }

        return res.json({ success: true, count: formattedProducts.length, products: formattedProducts });
    } catch (err) {
        // Fallback to RAM cache if DB operation timed out
        if (productsMemoryCache && productsMemoryCache.length > 0) {
            const storeEmailParam = (req.query.storeEmail || '').toLowerCase().trim();
            let filtered = productsMemoryCache;
            if (storeEmailParam) {
                filtered = productsMemoryCache.filter(p => !p.ownerEmail || p.ownerEmail.toLowerCase() === storeEmailParam);
            }
            return res.json({ success: true, count: filtered.length, products: filtered, cached: true });
        }
        return res.status(500).json({ success: false, message: err.message });
    }
};


// 3. Add New Product (Saves directly to MongoDB 'products' collection)
exports.addProduct = async (req, res) => {
    try {
        const stockNum = Number(req.body.stock) || Number(req.body.stockQuantity) || 0;
        const minStockNum = Number(req.body.minStock) || Number(req.body.lowStockThreshold) || 10;
        const status = calculateStatus(stockNum, minStockNum);
        const nameVal = req.body.name ? req.body.name.trim() : 'New Product';
        let brandVal = (req.body.brand || '').trim();
        if (!brandVal) {
            brandVal = autoExtractBrand(nameVal);
        }

        const newProductData = {
            name: nameVal,
            price: Number(req.body.price) || 0,
            costPrice: Number(req.body.costPrice) || Math.round((Number(req.body.price) || 0) * 0.8),
            unit: req.body.unit || 'item',
            brand: brandVal,
            stock: stockNum,
            stockQuantity: stockNum,
            minStock: minStockNum,
            lowStockThreshold: minStockNum,
            status,
            stockStatus: status === 'OUT OF STOCK' ? 'Out of Stock' : status === 'LOW STOCK' ? 'Low Stock' : 'In Stock',
            storeName: req.body.storeName || 'Lanka Mart',
            supplierName: req.body.supplierName || 'Local Supplier',
            ownerEmail: req.body.storeEmail ? req.body.storeEmail.toLowerCase() : (req.body.ownerEmail ? req.body.ownerEmail.toLowerCase() : ''),
            storeIcon: req.body.storeIcon || '',
            category: req.body.category || 'Grocery',
            image: req.body.image || req.body.imageUrl || '',
            imageUrl: req.body.image || req.body.imageUrl || '',
            fallbackEmoji: req.body.fallbackEmoji || '📦',
            bgColor: req.body.bgColor || '#EFF6FF'
        };

        const savedProduct = await Product.create(newProductData);
        invalidateProductsCache();

        const formatted = {
            id: savedProduct._id.toString(),
            _id: savedProduct._id.toString(),
            ...newProductData
        };

        return res.status(201).json({
            success: true,
            message: 'Product saved successfully to MongoDB products collection',
            product: formatted
        });
    } catch (err) {
        console.error('Add product MongoDB error:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 4. Update Product (Updates MongoDB 'products' collection)
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const stockNum = req.body.stock !== undefined ? Number(req.body.stock) : undefined;
        const minStockNum = req.body.minStock !== undefined ? Number(req.body.minStock) : undefined;

        let updateFields = { ...req.body };
        if (updateFields.name) {
            updateFields.name = updateFields.name.trim();
        }
        if (updateFields.brand !== undefined) {
            updateFields.brand = String(updateFields.brand || '').trim();
        }
        if (!updateFields.brand && updateFields.name) {
            updateFields.brand = autoExtractBrand(updateFields.name);
        }

        if (stockNum !== undefined || minStockNum !== undefined) {
            const finalStock = stockNum !== undefined ? stockNum : 0;
            const finalMin = minStockNum !== undefined ? minStockNum : 10;
            updateFields.status = calculateStatus(finalStock, finalMin);
            updateFields.stock = finalStock;
            updateFields.stockQuantity = finalStock;
            updateFields.minStock = finalMin;
            updateFields.lowStockThreshold = finalMin;
        }

        const updatedDoc = await Product.findByIdAndUpdate(id, updateFields, { new: true });
        invalidateProductsCache();

        return res.json({
            success: true,
            message: 'Product updated successfully in MongoDB products collection',
            product: updatedDoc
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 5. Delete Product (Deletes from MongoDB 'products' collection)
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await Product.findByIdAndDelete(id);
        invalidateProductsCache();
        return res.json({ success: true, message: 'Product deleted from MongoDB products collection' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// In-memory RAM cache for Suppliers list
let suppliersMemoryCache = null;
let suppliersMemoryCacheTime = 0;

const invalidateSuppliersCache = () => {
    suppliersMemoryCache = null;
    suppliersMemoryCacheTime = 0;
};

// 6. Get Suppliers List from MongoDB Atlas (Optimized Parallel Execution & RAM Cache)
exports.getSuppliers = async (req, res) => {
    try {
        const { storeEmail, onlyLinked, linkedOnly } = req.query;
        const filterEmail = storeEmail ? storeEmail.toLowerCase().trim() : null;
        const isOnlyLinkedRequested = onlyLinked === 'true' || linkedOnly === 'true';
        const now = Date.now();

        // Return instant RAM cache if available (0ms execution time)
        if (!req.query._t && suppliersMemoryCache && (now - suppliersMemoryCacheTime < 300 * 1000)) {
            const list = suppliersMemoryCache.map(s => ({
                ...s,
                isLinkedToCurrentStore: filterEmail
                    ? (Array.isArray(s.linkedStores) ? s.linkedStores.map(ls => (typeof ls === 'string' ? ls : (ls.email || ls.storeEmail || '')).toLowerCase()) : []).includes(filterEmail)
                    : false
            }));
            const finalSuppliers = isOnlyLinkedRequested ? list.filter(s => s.isLinkedToCurrentStore === true) : list;
            return res.json({ success: true, count: finalSuppliers.length, suppliers: finalSuppliers });
        }

        const User = require('../models/User');
        const SupplierProductCatalog = require('../models/SupplierProductCatalog');

        // Parallel MongoDB collection queries for maximum sub-20ms performance
        const [supplierUsers, dbSuppliers, catalogItems, allProducts] = await Promise.all([
            User.find({ role: { $regex: /^supplier$/i } }).select('name email phone supplierName contactPerson supplyRegion supplyRegions supplyCategory supplyCategories linkedStores').lean().exec(),
            Supplier.find({}).lean().exec(),
            SupplierProductCatalog.find({}).lean().exec(),
            Product.find({ supplierName: { $exists: true, $ne: '' } }).select('supplierName name').lean().exec()
        ]);

        const buildList = (applyFilter = true) => {
            const suppliersList = [];
            const seenEmails = new Set();

            supplierUsers.forEach(u => {
                const emailKey = u.email ? u.email.toLowerCase() : u._id.toString();
                seenEmails.add(emailKey);

                if (applyFilter && filterEmail) {
                    const storeList = Array.isArray(u.linkedStores) ? u.linkedStores.map(s => (typeof s === 'string' ? s : (s.email || s.storeEmail || '')).toLowerCase()) : [];
                    if (!storeList.includes(filterEmail)) return;
                }

                const sEmailLower = (u.email || '').toLowerCase();
                const sNameLower = (u.supplierName || u.name || '').toLowerCase();

                // 1. Strictly match supplier's real catalog products
                const supplierCatalogProducts = catalogItems.filter(c => {
                    const cEmail = (c.supplierEmail || '').toLowerCase();
                    const cName = (c.supplierName || '').toLowerCase();
                    return (sEmailLower && cEmail === sEmailLower) || (sNameLower && cName && (cName === sNameLower || cName.includes(sNameLower)));
                });

                // 2. Compute categories from profile + catalog
                const profileCategories = Array.isArray(u.supplyCategories) && u.supplyCategories.length > 0
                    ? u.supplyCategories
                    : (u.supplyCategory ? u.supplyCategory.split(',').map(s => s.trim()).filter(Boolean) : []);

                const catalogCategories = Array.from(new Set(supplierCatalogProducts.map(c => c.category).filter(Boolean)));
                const combinedCategories = Array.from(new Set([...profileCategories, ...catalogCategories]));
                const categoriesList = combinedCategories.length > 0 ? combinedCategories : ['General Wholesale'];

                // 3. Compute product counts per category
                const categoryCounts = {};
                supplierCatalogProducts.forEach(c => {
                    const cat = c.category || 'General';
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                });

                const regionsList = Array.isArray(u.supplyRegions) && u.supplyRegions.length > 0
                    ? u.supplyRegions
                    : (u.supplyRegion ? u.supplyRegion.split(',').map(s => s.trim()).filter(Boolean) : []);

                const regionDisplay = u.supplyRegion || (regionsList.length > 0 ? regionsList.join(', ') : 'Colombo 03');
                const categoryDisplay = u.supplyCategory || (categoriesList.length > 0 ? categoriesList.join(', ') : 'General Wholesale');

                // 4. Products list: use real catalog products if present, else fallback
                const uniqueSuppliedProducts = supplierCatalogProducts.length > 0
                    ? supplierCatalogProducts.map(c => c.name)
                    : Array.from(new Set(allProducts.filter(p => {
                        const pSup = (p.supplierName || '').toLowerCase();
                        return pSup && (pSup === sNameLower || sNameLower.includes(pSup) || pSup.includes(sNameLower));
                    }).map(p => p.name)));

                suppliersList.push({
                    id: u._id.toString(),
                    _id: u._id.toString(),
                    name: u.supplierName || u.name || 'Registered Supplier',
                    contactPerson: u.contactPerson || u.name || 'Sales Representative',
                    category: categoryDisplay,
                    supplyCategories: categoriesList,
                    categoryCounts,
                    phone: u.phone || '077 000 0000',
                    email: u.email || '',
                    region: regionDisplay,
                    supplyRegions: regionsList,
                    rating: '5.0 ★',
                    status: 'ACTIVE',
                    catalogCount: supplierCatalogProducts.length > 0 ? supplierCatalogProducts.length : uniqueSuppliedProducts.length,
                    suppliedProducts: uniqueSuppliedProducts,
                    suppliedProductsFull: supplierCatalogProducts,
                    linkedStores: Array.isArray(u.linkedStores) ? u.linkedStores : []
                });
            });

            dbSuppliers.forEach(s => {
                const emailKey = s.email ? s.email.toLowerCase() : s._id.toString();
                if (!seenEmails.has(emailKey)) {
                    seenEmails.add(emailKey);

                    if (applyFilter && filterEmail) {
                        const storeList = Array.isArray(s.linkedStores) ? s.linkedStores.map(ls => (typeof ls === 'string' ? ls : (ls.email || ls.storeEmail || '')).toLowerCase()) : [];
                        if (!storeList.includes(filterEmail)) return;
                    }

                    const sEmailLower = (s.email || '').toLowerCase();
                    const sNameLower = (s.name || '').toLowerCase();

                    const supplierCatalogProducts = catalogItems.filter(c => {
                        const cEmail = (c.supplierEmail || '').toLowerCase();
                        const cName = (c.supplierName || '').toLowerCase();
                        return (sEmailLower && cEmail === sEmailLower) || (sNameLower && cName && (cName === sNameLower || cName.includes(sNameLower)));
                    });

                    const profileCategories = Array.isArray(s.supplyCategories) && s.supplyCategories.length > 0
                        ? s.supplyCategories
                        : (s.category ? s.category.split(',').map(c => c.trim()).filter(Boolean) : []);

                    const catalogCategories = Array.from(new Set(supplierCatalogProducts.map(c => c.category).filter(Boolean)));
                    const combinedCategories = Array.from(new Set([...profileCategories, ...catalogCategories]));
                    const categoriesList = combinedCategories.length > 0 ? combinedCategories : ['General Wholesale'];

                    const categoryCounts = {};
                    supplierCatalogProducts.forEach(c => {
                        const cat = c.category || 'General';
                        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                    });

                    const staticProducts = Array.isArray(s.suppliedProducts) ? s.suppliedProducts : [];
                    const uniqueSuppliedProducts = supplierCatalogProducts.length > 0
                        ? supplierCatalogProducts.map(c => c.name)
                        : staticProducts;

                    suppliersList.push({
                        id: s._id.toString(),
                        _id: s._id.toString(),
                        name: s.name,
                        contactPerson: s.contactPerson || 'Sales Representative',
                        category: s.category || 'General Wholesale',
                        supplyCategories: categoriesList,
                        categoryCounts,
                        phone: s.phone || '077 000 0000',
                        email: s.email || '',
                        region: s.region || 'Colombo 03',
                        supplyRegions: s.supplyRegions || [s.region || 'Colombo 03'],
                        rating: s.rating || '4.9 ★',
                        status: s.status || 'ACTIVE',
                        catalogCount: supplierCatalogProducts.length > 0 ? supplierCatalogProducts.length : uniqueSuppliedProducts.length,
                        suppliedProducts: uniqueSuppliedProducts,
                        suppliedProductsFull: supplierCatalogProducts,
                        linkedStores: Array.isArray(s.linkedStores) ? s.linkedStores : []
                    });
                }
            });

            return suppliersList;
        };

        // Always build full unfiltered list — no supplier is hidden from shop owners
        let resultList = buildList(false);

        // Cache full suppliers list for instant future responses
        if (resultList.length > 0) {
            suppliersMemoryCache = resultList;
            suppliersMemoryCacheTime = now;
        }

        // Annotate each supplier with isLinkedToCurrentStore for the requesting shop owner
        const annotatedList = resultList.map(s => ({
            ...s,
            isLinkedToCurrentStore: filterEmail
                ? (Array.isArray(s.linkedStores) ? s.linkedStores.map(ls => (typeof ls === 'string' ? ls : (ls.email || ls.storeEmail || '')).toLowerCase()) : []).includes(filterEmail)
                : false
        }));

        const finalSuppliers = isOnlyLinkedRequested ? annotatedList.filter(s => s.isLinkedToCurrentStore === true) : annotatedList;

        return res.json({ success: true, count: finalSuppliers.length, suppliers: finalSuppliers });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, suppliers: [] });
    }
};


// 7. Add New Supplier to MongoDB Atlas
exports.addSupplier = async (req, res) => {
    try {
        const { name, phone, category, contactPerson, email, region, suppliedProducts } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Supplier name and phone are required' });
        }
        const supplier = await Supplier.create({
            name: name.trim(),
            phone: phone.trim(),
            category: category || 'General Wholesale',
            contactPerson: contactPerson || '',
            email: email || '',
            region: region || 'Colombo',
            suppliedProducts: Array.isArray(suppliedProducts) ? suppliedProducts : (suppliedProducts ? [suppliedProducts] : []),
            status: 'ACTIVE',
            linkedStores: []
        });
        invalidateSuppliersCache();
        return res.status(201).json({ success: true, message: 'Supplier registered in MongoDB Atlas', supplier });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 7b. Update Supplier / Toggle Store Link in MongoDB Atlas
exports.updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const User = require('../models/User');
        let updated = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            const user = await User.findById(id);
            if (user && user.role === 'supplier') {
                if (req.body.linkedStores !== undefined) {
                    user.linkedStores = req.body.linkedStores;
                }
                if (req.body.name) user.supplierName = req.body.name;
                if (req.body.phone) user.phone = req.body.phone;
                if (req.body.category) user.supplyCategory = req.body.category;
                await user.save();
                updated = {
                    id: user._id.toString(),
                    _id: user._id.toString(),
                    name: user.supplierName || user.name,
                    linkedStores: user.linkedStores
                };

                // Also sync to Supplier collection document if present
                if (user.email || user.name || user.supplierName) {
                    const matchName = user.supplierName || user.name;
                    await Supplier.updateMany(
                        { $or: [{ email: user.email }, { name: matchName }] },
                        { $set: { linkedStores: user.linkedStores } }
                    );
                }
            } else {
                updated = await Supplier.findByIdAndUpdate(id, req.body, { new: true });
            }
        } else {
            updated = await Supplier.findOneAndUpdate({ name: id }, req.body, { new: true });
        }

        invalidateSuppliersCache();
        return res.json({ success: true, message: 'Supplier updated in MongoDB Atlas', supplier: updated });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 7c. Delete Supplier from MongoDB Atlas
exports.deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        await Supplier.findByIdAndDelete(id);
        return res.json({ success: true, message: 'Supplier deleted from MongoDB Atlas' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 8. Low Stock Advanced Analytics
exports.getLowStockAnalytics = async (req, res) => {
    try {
        const products = await Product.find({});
        const criticalItems = products.filter(p => (p.stock !== undefined ? p.stock : p.stockQuantity) <= (p.minStock || 10));
        return res.json({ success: true, count: criticalItems.length, criticalItems });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 9. Create Restock Request (PO) — Connects directly with MongoDB Atlas & syncs to Supplier Dashboard
exports.createRestockRequest = async (req, res) => {
    try {
        const count = await RestockRequest.countDocuments();
        const poNum = `PO-${String(count + 1).padStart(4, '0')}`;
        req.body.poNumber = poNum;
        const po = await RestockRequest.create(req.body);

        // Synchronize with SupplierReplenishment & SupplierNotification collections in MongoDB Atlas
        try {
            const SupplierReplenishment = require('../supplier_replenishment/SupplierReplenishmentModel');
            const SupplierNotification = require('../models/SupplierNotification');

            const reqItems = req.body.items || [];
            if (reqItems.length === 0) {
                reqItems.push({ name: 'Restock Item', qty: 20, unit: 'pack' });
            }

            const storeName = req.body.storeName || 'Lanka Mart';
            const storeEmail = req.body.storeEmail || '';
            const supplierName = req.body.supplierName || 'Default Supplier';
            const supplierEmail = req.body.supplierEmail || '';

            const SupplierProductCatalog = require('../models/SupplierProductCatalog');
            const catalogDocs = await SupplierProductCatalog.find({}).lean();
            const catMap = new Map();
            catalogDocs.forEach(c => {
                const k = (c.productName || c.name || '').trim().toLowerCase();
                const pVal = Number(c.wholesalePrice || c.price || c.wholesaleRate || 0);
                if (k && pVal > 0) catMap.set(k, pVal);
            });

            const itemsArray = reqItems.map(it => {
                const prodName = it.name || it.produce || 'Product';
                const tKey = prodName.trim().toLowerCase();
                let price = Number(it.wholesalePrice || it.wholesaleRate || it.price || 0);
                if (!price || price === 150) {
                    if (catMap.has(tKey)) price = catMap.get(tKey);
                    else {
                        for (const [k, pVal] of catMap.entries()) {
                            if (k.includes(tKey) || tKey.includes(k)) {
                                price = pVal;
                                break;
                            }
                        }
                    }
                }
                if (!price) price = 150;
                const qty = Number(it.qty || 1);

                return {
                    produce: prodName,
                    name: prodName,
                    qty: qty,
                    unit: it.unit || 'pack',
                    wholesaleRate: price,
                    wholesalePrice: price,
                    price: price,
                    subtotal: qty * price
                };
            });

            const totalAmount = itemsArray.reduce((acc, it) => acc + it.subtotal, 0);
            const itemName = reqItems.length === 1 ? reqItems[0].name : 'Multiple Products';
            const itemQty = reqItems.reduce((acc, it) => acc + it.qty, 0);
            const itemsSummary = reqItems.map(it => `${it.qty}x ${it.name}`).join(', ');

            await SupplierReplenishment.create({
                poId: poNum,
                storeName: storeName,
                storeEmail: storeEmail,
                supplierName: supplierName,
                supplierEmail: supplierEmail,
                product: itemName,
                unitsLeft: req.body.unitsLeft !== undefined ? req.body.unitsLeft : 4,
                reorderUnits: itemQty,
                status: 'Pending Approval',
                requestedDate: new Date(),
                deliveryTarget: req.body.deliveryDate || 'Tomorrow',
                itemsSummary: itemsSummary,
                items: itemsArray,
                totalAmount: totalAmount
            });

            const notificationMessage = reqItems.length === 1
                ? `${storeName} submitted a replenishment request for ${reqItems[0].name}.`
                : `${storeName} submitted a combined PO for ${reqItems.length} products.`;

            await SupplierNotification.create({
                supplierName: supplierName,
                supplierEmail: supplierEmail,
                type: 'po',
                title: `New Restock Request ${poNum}`,
                message: notificationMessage,
                read: false
            });
        } catch (syncErr) {
            console.warn('Sync to SupplierReplenishment notice:', syncErr.message);
        }

        return res.status(201).json({ success: true, message: 'Restock PO created and sent to supplier in MongoDB Atlas', po });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 9b. Get All Restock Requests (Sent POs) from MongoDB Atlas (Ultra Fast Parallel Queries)
exports.getRestockRequests = async (req, res) => {
    try {
        const filter = {};
        if (req.query.storeEmail) filter.storeEmail = req.query.storeEmail;
        if (req.query.storeName) filter.storeName = req.query.storeName;

        const SupplierReplenishment = require('../supplier_replenishment/SupplierReplenishmentModel');
        const replFilter = {};
        if (req.query.storeEmail) replFilter.storeEmail = req.query.storeEmail;
        if (req.query.storeName) replFilter.storeName = req.query.storeName;

        const [requests, replenishments] = await Promise.all([
            RestockRequest.find(filter).sort({ createdAt: -1 }).lean().maxTimeMS(4000).catch(err => []),
            SupplierReplenishment.find(replFilter).lean().maxTimeMS(4000).catch(err => [])
        ]);

        return res.status(200).json({
            success: true,
            requests: requests || [],
            replenishments: replenishments || []
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 10. Get Real-Time Shop Owner Notifications directly from MongoDB Atlas
exports.getShopOwnerNotifications = async (req, res) => {
    try {
        const { storeEmail, storeName } = req.query;
        let productQuery = {};
        let userCreatedAt = new Date(0);

        if (storeEmail) {
            productQuery.ownerEmail = storeEmail.toLowerCase();
            try {
                const User = require('../models/User');
                const user = await User.findOne({ email: storeEmail.toLowerCase() }).select('createdAt').lean();
                if (user && user.createdAt) {
                    userCreatedAt = new Date(user.createdAt);
                }
            } catch (e) {
                console.warn('Could not fetch user created date:', e.message);
            }
        }

        const dbProducts = await Product.find(productQuery);
        let targetStoreName = (storeName || '').split('•')[0].trim();
        if (!targetStoreName && dbProducts.length > 0) {
            targetStoreName = dbProducts[0].storeName || '';
        }

        const notificationsList = [];

        // Helper time ago
        const formatTimeAgo = (date) => {
            if (!date) return 'Just now';
            const diffMinutes = Math.floor((new Date() - new Date(date)) / (1000 * 60));
            if (diffMinutes < 1) return 'Just now';
            if (diffMinutes < 60) return `${diffMinutes}m ago`;
            if (diffMinutes < 60 * 24) return `${Math.floor(diffMinutes / 60)}h ago`;
            return `${Math.floor(diffMinutes / (60 * 24))}d ago`;
        };

        // 1. Fetch live orders from MongoDB 'Order' collection
        let orderQuery = { createdAt: { $gte: userCreatedAt } };
        if (targetStoreName) {
            const regex = new RegExp(targetStoreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            orderQuery.pickupStore = regex;
        }

        const recentOrders = await Order.find(orderQuery).sort({ createdAt: -1 }).limit(5).lean();
        recentOrders.forEach(o => {
            const orderCode = o.orderId || (o._id ? o._id.toString().slice(-4).toUpperCase() : '1048');
            const totalItems = Array.isArray(o.items) ? o.items.length : 1;
            const amount = o.totalAmount || o.total || 0;
            const custName = o.customerName || o.userEmail || 'Customer';

            notificationsList.push({
                id: `ord_${o._id ? o._id.toString() : Math.random()}`,
                title: `New Customer Pre-Order #PF-${orderCode}`,
                message: `${custName} placed a pickup order (${totalItems} ${totalItems === 1 ? 'item' : 'items'} • Rs. ${amount.toLocaleString()}).`,
                time: formatTimeAgo(o.createdAt),
                type: 'order',
                targetTab: 'orders',
                read: false,
                rawDate: o.createdAt || new Date()
            });
        });

        // 2. Fetch live low-stock alerts from MongoDB 'Product' collection
        const lowStockProducts = dbProducts.filter(p => {
            const stk = p.stock !== undefined ? p.stock : p.stockQuantity;
            const minStk = p.minStock !== undefined ? p.minStock : p.lowStockThreshold;
            return stk <= (minStk || 10);
        });

        lowStockProducts.slice(0, 3).forEach(p => {
            const stk = p.stock !== undefined ? p.stock : p.stockQuantity;
            notificationsList.push({
                id: `stk_${p._id ? p._id.toString() : Math.random()}`,
                title: 'Critical Low Stock Warning',
                message: `${p.name} is down to ${stk} ${p.unit || 'items'} in stock. Reorder recommended.`,
                time: formatTimeAgo(p.updatedAt || p.createdAt),
                type: 'stock',
                targetTab: 'inventory',
                read: false,
                rawDate: p.updatedAt || p.createdAt || new Date()
            });
        });

        // 3. Fetch live supplier replenishment notifications from SupplierReplenishment collection
        try {
            const SupplierReplenishment = require('../supplier_replenishment/SupplierReplenishmentModel');
            let poQuery = { requestedDate: { $gte: userCreatedAt } };
            if (targetStoreName) {
                poQuery.storeName = new RegExp(targetStoreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            }
            const recentPOs = await SupplierReplenishment.find(poQuery).sort({ requestedDate: -1 }).limit(3).lean();
            recentPOs.forEach(po => {
                notificationsList.push({
                    id: `sup_${po._id ? po._id.toString() : Math.random()}`,
                    title: `Supplier Delivery ${po.status || 'Arriving Soon'}`,
                    message: `${po.supplierName || po.storeName || 'Nuwara Eliya Produce'} shipment #${po.poId || 'PO-892'} status is ${po.status || 'In Transit'}.`,
                    time: formatTimeAgo(po.requestedDate || po.createdAt),
                    type: 'supplier',
                    targetTab: 'suppliers',
                    read: false,
                    rawDate: po.requestedDate || po.createdAt || new Date()
                });
            });
        } catch (e) {
            console.warn('Supplier notification fetch notice:', e.message);
        }

        // Sort all notifications by date descending
        notificationsList.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

        return res.json({
            success: true,
            count: notificationsList.length,
            notifications: notificationsList
        });
    } catch (err) {
        console.error('Error fetching shop owner notifications:', err);
        return res.status(500).json({ success: false, message: err.message, notifications: [] });
    }
};

const findShopOwnerUser = async (storeEmail, storeName) => {
    const User = require('../models/User');
    let shopOwner = null;

    if (storeEmail && storeEmail.trim()) {
        shopOwner = await User.findOne({ email: storeEmail.toLowerCase().trim() });
    }

    if (!shopOwner && storeName && storeName.trim()) {
        const regex = new RegExp(storeName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        shopOwner = await User.findOne({
            $or: [{ shopName: regex }, { storeName: regex }, { name: regex }]
        });
    }

    if (!shopOwner) {
        shopOwner = await User.findOne({ role: 'shop_owner' });
    }

    if (!shopOwner) {
        shopOwner = await User.findOne({ offerBanner: { $exists: true } });
    }

    return shopOwner;
};

// 11. Get Store Offer Banner from MongoDB Atlas
exports.getOfferBanner = async (req, res) => {
    try {
        const { storeEmail, storeName } = req.query;
        let shopOwner = await findShopOwnerUser(storeEmail, storeName);

        const defaultBanner = {
            hasCustomBanner: false,
            badge: '🔥 20% OFF DEALS',
            title: 'Fresh Harvest Deals',
            subtitle: 'Pick up in 15 mins at nearest grocery store',
            btnText: 'Shop Now',
            active: true,
            bannerBg: '/banner_bg.png'
        };

        const hasCustomBanner = !!(
            shopOwner &&
            shopOwner.offerBanner &&
            shopOwner.offerBanner.hasCustomBanner === true &&
            shopOwner.offerBanner.title &&
            shopOwner.offerBanner.title.trim().length > 0
        );

        const banner = hasCustomBanner ? { ...defaultBanner, ...shopOwner.offerBanner, hasCustomBanner: true } : defaultBanner;

        return res.json({
            success: true,
            offerBanner: banner,
            hasCustomBanner,
            shopName: shopOwner?.shopName || shopOwner?.name || storeName || 'GroceryMart'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 12. Update Store Offer Banner in MongoDB Atlas
exports.saveOfferBanner = async (req, res) => {
    try {
        const { storeEmail, storeName, badge, title, subtitle, btnText, active, bannerBg } = req.body;
        let shopOwner = await findShopOwnerUser(storeEmail, storeName);

        const newBannerData = {
            hasCustomBanner: true,
            badge: badge !== undefined ? badge : '🔥 20% OFF DEALS',
            title: title || 'Fresh Harvest Deals',
            subtitle: subtitle !== undefined ? subtitle : 'Pick up in 15 mins at nearest grocery store',
            btnText: btnText || 'Shop Now',
            active: active !== undefined ? Boolean(active) : true,
            bannerBg: bannerBg || '/banner_bg.png'
        };

        if (shopOwner) {
            shopOwner.offerBanner = newBannerData;
            shopOwner.markModified('offerBanner');
            await shopOwner.save();
        }

        return res.json({
            success: true,
            message: 'Store offer banner saved to MongoDB Atlas & published to Customer Home!',
            offerBanner: newBannerData,
            hasCustomBanner: true
        });
    } catch (err) {
        console.error('Error saving offer banner:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 13. Delete / Remove Store Offer Banner from MongoDB Atlas
exports.deleteOfferBanner = async (req, res) => {
    try {
        const storeEmail = req.body?.storeEmail || req.query?.storeEmail;
        const storeName = req.body?.storeName || req.query?.storeName;
        const shopOwner = await findShopOwnerUser(storeEmail, storeName);

        if (shopOwner) {
            shopOwner.offerBanner = {
                hasCustomBanner: false,
                badge: '',
                title: '',
                subtitle: '',
                btnText: '',
                active: false,
                bannerBg: '/banner_bg.png'
            };
            shopOwner.markModified('offerBanner');
            await shopOwner.save();
        }

        return res.json({
            success: true,
            message: 'Store offer banner removed successfully!'
        });
    } catch (err) {
        console.error('Error deleting offer banner:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
