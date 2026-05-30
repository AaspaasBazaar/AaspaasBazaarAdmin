document.addEventListener('DOMContentLoaded', () => {
    // Current application state
    let activeTab = 'dashboard';
    let currentFilter = 'All';
    let searchFilter = 'All';
    let dashboardInterval = null;

    // Elements
    const tabMenuItems = document.querySelectorAll('.menu-item');
    const contentFrames = document.querySelectorAll('.content-frame');
    const topBarTitle = document.getElementById('top-bar-title');
    const topBarDesc = document.getElementById('top-bar-desc');
    const globalSearchInput = document.getElementById('global-search-input');
    const geofenceBadgeText = document.getElementById('geofence-badge-text');

    // Tab Headers Metadata
    const tabHeaders = {
        'dashboard': { title: 'Dashboard', desc: 'Live overview of your local marketplace' },
        'orders': { title: 'Orders', desc: 'Manage local customer orders and fulfillment' },
        'vendors': { title: 'Vendors', desc: 'Onboard and manage local shops in your geofence' },
        'categories': { title: 'Categories', desc: 'Organise what your vendors sell' },
        'items': { title: 'Items', desc: 'Browse the catalog of products across all vendors' },
        'users': { title: 'Users', desc: 'Control administrator access and roles' },
        'settings': { title: 'Settings', desc: 'Configure system preferences and delivery rules' },
        'add-vendor': { title: 'Add Vendor', desc: 'Onboard a new local shop into your geofence' },
        'search': { title: 'Search Results', desc: 'Unified results across your local catalog' }
    };

    // Category Styling Dictionary
    const catStyles = {
        'Vegetables': { bg: 'var(--cat-vegetables-bg)', text: 'var(--cat-vegetables)', border: 'var(--cat-vegetables)' },
        'Fruits': { bg: 'var(--cat-fruits-bg)', text: 'var(--cat-fruits)', border: 'var(--cat-fruits)' },
        'Groceries': { bg: 'var(--cat-groceries-bg)', text: 'var(--cat-groceries)', border: 'var(--cat-groceries)' },
        'Dairy': { bg: 'var(--cat-dairy-bg)', text: 'var(--cat-dairy)', border: 'var(--cat-dairy)' },
        'Ice Cream': { bg: 'var(--cat-icecream-bg)', text: 'var(--cat-icecream)', border: 'var(--cat-icecream)' },
        'Pharmacy': { bg: 'var(--cat-pharmacy-bg)', text: 'var(--cat-pharmacy)', border: 'var(--cat-pharmacy)' }
    };

    // --- TAB NAV LOGIC ---
    function switchTab(tabId) {
        activeTab = tabId;

        // Clear active polling intervals if switching away from dashboard
        if (tabId !== 'dashboard' && dashboardInterval) {
            clearInterval(dashboardInterval);
            dashboardInterval = null;
        }

        // Update active class in sidebar menu items
        tabMenuItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Hide all frames and show active frame
        contentFrames.forEach(frame => {
            const frameTab = frame.getAttribute('id').replace('frame-', '');
            if (frameTab === tabId) {
                frame.classList.add('active');
            } else {
                frame.classList.remove('active');
            }
        });

        // Update title and subtitle
        if (tabHeaders[tabId]) {
            topBarTitle.textContent = tabHeaders[tabId].title;
            topBarDesc.textContent = tabHeaders[tabId].desc;
        }

        // Fetch frame-specific data
        if (tabId === 'dashboard') {
            fetchStats();
            fetchLiveFeed();
            // Enable real-time interval polling every 4 seconds to catch background simulated orders
            if (!dashboardInterval) {
                dashboardInterval = setInterval(() => {
                    fetchStats();
                    fetchLiveFeed();
                }, 4000);
            }
        } else if (tabId === 'vendors') {
            fetchVendors();
        } else if (tabId === 'settings' || tabId === 'categories') {
            fetchSettings();
        } else if (tabId === 'items') {
            fetchItems();
        } else if (tabId === 'orders') {
            fetchOrders();
        }
    }

    tabMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            // Reset search input if switching away from search
            if (item.getAttribute('data-tab') !== 'search') {
                globalSearchInput.value = '';
            }
            switchTab(item.getAttribute('data-tab'));
        });
    });

    // Special Add Vendor button inside vendors tab
    document.getElementById('vendors-add-btn').addEventListener('click', () => {
        switchTab('add-vendor');
    });

    // Cancel add vendor
    document.getElementById('add-vendor-cancel-btn').addEventListener('click', () => {
        switchTab('vendors');
    });

    // Click on a category card switches filters in vendors tab
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const filter = card.getAttribute('data-filter');
            switchTab('vendors');
            // Set filter button active in toolbar
            const filterButtons = document.querySelectorAll('#vendor-category-filters .filter-btn');
            filterButtons.forEach(btn => {
                if (btn.getAttribute('data-filter') === filter) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            currentFilter = filter;
            fetchVendors();
        });
    });

    // --- API & DATA FETCHING LOGIC ---

    // 1. Fetch Stats & Chart Data
    function fetchStats() {
        fetch('/api/stats')
            .then(res => res.json())
            .then(data => {
                // Update metrics cards
                document.getElementById('stat-orders-val').textContent = data.orders_today;
                document.getElementById('stat-orders-trend').textContent = data.orders_today_change;
                document.getElementById('stat-vendors-val').textContent = data.active_vendors;
                document.getElementById('stat-vendors-trend').textContent = data.active_vendors_change;
                document.getElementById('stat-revenue-val').textContent = data.revenue_today;
                document.getElementById('stat-revenue-trend').textContent = data.revenue_today_change;
                document.getElementById('stat-pending-val').textContent = data.pending_action;
                document.getElementById('stat-pending-trend').textContent = data.pending_action_change;
                
                // Update the Orders count in Sidebar badge dynamically too!
                document.getElementById('sidebar-orders-badge').textContent = data.pending_action;

                // Dynamic chart height animation based on real backend weekly totals
                const chartBars = document.querySelectorAll('.chart-bar');
                const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const maxVal = Math.max(...Object.values(data.weekly_totals), 10);
                
                weekdays.forEach((day, index) => {
                    const value = data.weekly_totals[day] || 0;
                    const bar = chartBars[index];
                    if (bar) {
                        const heightPercent = (value / maxVal) * 100;
                        bar.style.height = `${heightPercent}%`;
                        bar.setAttribute('data-value', value);
                        bar.setAttribute('aria-label', `${day}: ${value} orders`);
                    }
                });
            })
            .catch(err => console.error('Error fetching stats:', err));
    }

    // 2. Fetch Live Orders Feed (for dashboard sidebar)
    function fetchLiveFeed() {
        fetch('/api/orders')
            .then(res => res.json())
            .then(orders => {
                const feedContainer = document.getElementById('dashboard-order-feed');
                feedContainer.innerHTML = '';

                // Get first 4 orders
                orders.slice(0, 4).forEach((order, index) => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'feed-item';

                    // Pick avatar colors
                    let avatarBg = 'var(--cat-dairy-bg)';
                    let avatarColor = 'var(--cat-dairy)';
                    if (index === 0) { avatarBg = '#FBE9F1'; avatarColor = '#E26FA0'; }
                    else if (index === 1) { avatarBg = '#E7F4EC'; avatarColor = '#2E9E4F'; }
                    else if (index === 2) { avatarBg = '#E4ECF7'; avatarColor = '#3B6FB0'; }
                    else if (index === 3) { avatarBg = 'var(--cat-fruits-bg)'; avatarColor = 'var(--cat-fruits)'; }

                    itemDiv.innerHTML = `
                        <div class="feed-item-left">
                            <div class="feed-item-icon" style="background-color: ${avatarBg}; color: ${avatarColor};">
                                ${order.customer_code}
                            </div>
                            <div class="feed-item-info">
                                <span class="feed-item-title">Order #${order.id}</span>
                                <span class="feed-item-subtitle">${order.vendor_name} → ${order.customer_code}</span>
                            </div>
                        </div>
                        <span class="feed-item-amount">₹${order.amount}</span>
                    `;
                    feedContainer.appendChild(itemDiv);
                });
            })
            .catch(err => console.error('Error fetching feed:', err));
    }

    // 3. Fetch Vendors list
    function fetchVendors() {
        fetch('/api/vendors')
            .then(res => res.json())
            .then(data => {
                const tableBody = document.getElementById('vendors-table-body');
                tableBody.innerHTML = '';

                // Filter data based on active category filter
                const filteredVendors = currentFilter === 'All' 
                    ? data 
                    : data.filter(v => v.categories.includes(currentFilter));

                if (filteredVendors.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-secondary);">No vendors found in this category.</td></tr>`;
                    return;
                }

                filteredVendors.forEach(vendor => {
                    const row = document.createElement('tr');

                    // Generate list of tag HTMLs
                    const tagsHtml = vendor.categories.map(cat => {
                        const style = catStyles[cat] || { bg: '#E2E8F0', text: '#475569' };
                        return `<span class="cat-tag" style="background-color: ${style.bg}; color: ${style.text};">${cat}</span>`;
                    }).join(' ');

                    // Define avatar background based on category
                    const primaryCat = vendor.categories[0] || 'Dairy';
                    const avatarStyle = catStyles[primaryCat] || { bg: 'var(--accent-green-bg)', text: 'var(--accent-green)' };
                    const firstLetter = vendor.name.charAt(0);

                    row.innerHTML = `
                        <td>
                            <div class="vendor-cell-info">
                                <div class="vendor-avatar-container" style="background-color: ${avatarStyle.bg}; color: ${avatarStyle.text};">
                                    ${firstLetter}
                                </div>
                                <div class="vendor-details-cell">
                                    <span class="vendor-name-label">${vendor.name}</span>
                                    <span class="vendor-sub-label">${vendor.address.split(',')[0]} · Geofence #1</span>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="tag-list">${tagsHtml}</div>
                        </td>
                        <td>
                            <span class="distance-label">${vendor.distance}</span>
                        </td>
                        <td>
                            <span class="rating-badge">★ ${vendor.rating}</span>
                        </td>
                        <td>
                            <label class="switch-label">
                                <input type="checkbox" class="toggle-status-switch" data-id="${vendor.id}" ${vendor.open ? 'checked' : ''}>
                                <span class="switch-slider"></span>
                            </label>
                        </td>
                        <td>
                            <div class="action-btn-group">
                                <button class="action-btn edit-vendor" data-id="${vendor.id}" aria-label="Edit vendor">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button class="action-btn delete delete-vendor" data-id="${vendor.id}" aria-label="Delete vendor">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });

                // Attach toggle switch event listeners
                document.querySelectorAll('.toggle-status-switch').forEach(toggle => {
                    toggle.addEventListener('change', (e) => {
                        const vendorId = e.target.getAttribute('data-id');
                        toggleVendorStatus(vendorId);
                    });
                });

                // Attach delete button event listeners
                document.querySelectorAll('.delete-vendor').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const vendorId = btn.getAttribute('data-id');
                        if (confirm("Are you sure you want to delete this vendor?")) {
                            deleteVendor(vendorId);
                        }
                    });
                });
            })
            .catch(err => console.error('Error fetching vendors:', err));
    }

    // Toggle Vendor Open/Closed
    function toggleVendorStatus(vendorId) {
        fetch(`/api/vendors/${vendorId}/toggle`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    fetchStats(); // Update dashboard active count
                }
            })
            .catch(err => console.error('Error toggling vendor status:', err));
    }

    // Delete Vendor
    function deleteVendor(vendorId) {
        fetch(`/api/vendors/${vendorId}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    fetchVendors();
                    fetchStats();
                }
            })
            .catch(err => console.error('Error deleting vendor:', err));
    }

    // 4. Fetch Items List (Catalog)
    function fetchItems() {
        const tableBody = document.getElementById('items-table-body');
        tableBody.innerHTML = '';
        
        fetch('/api/search?q=') // Fetches everything when empty
            .then(res => res.json())
            .then(data => {
                const itemsList = data.results.items;
                if (itemsList.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-secondary);">No catalog items available.</td></tr>`;
                    return;
                }

                itemsList.forEach(item => {
                    const row = document.createElement('tr');
                    const stockClass = item.status === 'In stock' ? 'stock-in' : (item.status === 'Low stock' ? 'stock-low' : 'stock-out');
                    row.innerHTML = `
                        <td><strong>${item.name}</strong></td>
                        <td>${item.vendor_name}</td>
                        <td>${item.category}</td>
                        <td><span style="font-family: 'JetBrains Mono', monospace;">₹${item.price} / ${item.unit.replace('per ', '')}</span></td>
                        <td><span class="search-stock-badge ${stockClass}">${item.status}</span></td>
                    `;
                    tableBody.appendChild(row);
                });
            });
    }

    // 5. Fetch All Orders List
    function fetchOrders() {
        fetch('/api/orders')
            .then(res => res.json())
            .then(orders => {
                const tableBody = document.getElementById('orders-table-body');
                tableBody.innerHTML = '';

                orders.forEach(order => {
                    const row = document.createElement('tr');
                    let statusClass = 'order-completed';
                    if (order.status === 'Accepted') statusClass = 'order-accepted';
                    if (order.status === 'Pending') statusClass = 'order-pending';

                    row.innerHTML = `
                        <td><strong style="font-family: 'JetBrains Mono', monospace;">#${order.id}</strong></td>
                        <td>${order.vendor_name}</td>
                        <td>${order.customer_name} (${order.customer_code})</td>
                        <td>${order.type} · ${order.time}</td>
                        <td><strong style="font-family: 'JetBrains Mono', monospace;">₹${order.amount}</strong></td>
                        <td><span class="search-order-status ${statusClass}">${order.status}</span></td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch(err => console.error('Error fetching orders:', err));
    }

    // 6. Settings Handling
    function fetchSettings() {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                document.getElementById('input-radius').value = data.discovery_radius;
                document.getElementById('input-delivery-fee').value = data.default_delivery_fee;
                document.getElementById('input-order-model').value = data.order_model;
                
                // Update radius displays
                geofenceBadgeText.textContent = `Geofence · ${data.discovery_radius}km`;
                document.getElementById('add-vendor-radius-label').textContent = `${data.discovery_radius} km radius`;
            })
            .catch(err => console.error('Error fetching settings:', err));
    }

    // Submit settings form
    document.getElementById('geofence-settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const updatedData = {
            discovery_radius: document.getElementById('input-radius').value,
            default_delivery_fee: document.getElementById('input-delivery-fee').value,
            order_model: document.getElementById('input-order-model').value
        };

        fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Settings updated successfully!');
                fetchSettings();
            }
        })
        .catch(err => console.error('Error saving settings:', err));
    });

    // --- VENDORS FILTERS CLICK HANDLER ---
    const filterButtons = document.querySelectorAll('#vendor-category-filters .filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            fetchVendors();
        });
    });

    // --- MANUAL SIMULATION TRIGGER ---
    document.getElementById('dashboard-simulate-btn').addEventListener('click', () => {
        const btn = document.getElementById('dashboard-simulate-btn');
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.querySelector('span').textContent = 'Placing Order...';

        fetch('/api/simulate_order', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Update views instantly
                    fetchStats();
                    fetchLiveFeed();
                } else {
                    alert('Order simulation failed: ' + data.error);
                }
            })
            .catch(err => console.error('Error placing simulated order:', err))
            .finally(() => {
                setTimeout(() => {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.querySelector('span').textContent = '+ Simulate Order';
                }, 800);
            });
    });

    // --- ADD VENDOR SUBMIT LOGIC ---
    let selectedCategories = [];
    const selectTags = document.querySelectorAll('#vendor-categories-selection .cat-select-tag');
    
    selectTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const cat = tag.getAttribute('data-cat');
            if (tag.classList.contains('selected')) {
                tag.classList.remove('selected');
                selectedCategories = selectedCategories.filter(c => c !== cat);
            } else {
                tag.classList.add('selected');
                selectedCategories.push(cat);
            }
        });
    });

    document.getElementById('add-vendor-save-btn').addEventListener('click', (e) => {
        e.preventDefault();

        const name = document.getElementById('vendor-shop-name').value.trim();
        const phone = document.getElementById('vendor-owner-phone').value.trim();
        const owner = document.getElementById('vendor-owner-name').value.trim();
        const address = document.getElementById('vendor-address').value.trim();
        const lat = document.getElementById('vendor-lat').value;
        const lng = document.getElementById('vendor-lng').value;
        const delivery = document.getElementById('vendor-delivery-opt').checked;
        const open = document.getElementById('vendor-open-opt').checked;
        const deliveryRadius = document.getElementById('vendor-delivery-rad').value;

        if (!name || !phone || !owner || !address) {
            alert('Please fill out all required fields.');
            return;
        }

        if (selectedCategories.length === 0) {
            alert('Please select at least one category.');
            return;
        }

        const vendorData = {
            name,
            owner,
            phone: `+91 ${phone}`,
            address,
            latitude: lat,
            longitude: lng,
            categories: selectedCategories,
            delivery,
            open,
            delivery_radius: deliveryRadius
        };

        fetch('/api/vendors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vendorData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.id) {
                alert('Vendor onboarded successfully!');
                // Reset form
                document.getElementById('add-vendor-form').reset();
                document.getElementById('vendor-shop-name').value = '';
                document.getElementById('vendor-owner-phone').value = '';
                document.getElementById('vendor-owner-name').value = '';
                document.getElementById('vendor-address').value = '';
                selectTags.forEach(t => t.classList.remove('selected'));
                selectedCategories = [];

                // Redirect to vendor list
                switchTab('vendors');
                fetchStats();
            }
        })
        .catch(err => console.error('Error adding vendor:', err));
    });

    // --- SEARCH LOGIC ---
    let searchTimeout;
    globalSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        clearTimeout(searchTimeout);
        if (!query) {
            if (activeTab === 'search') {
                switchTab('dashboard');
            }
            return;
        }

        // Wait 150ms before querying backend
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 150);
    });

    function performSearch(query) {
        fetch(`/api/search?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                // Switch to search tab
                switchTab('search');
                
                // Update metadata
                document.getElementById('search-results-summary').textContent = `${data.total_results} results for “${data.query}”`;
                
                // Show sections
                const vSection = document.getElementById('search-section-vendors');
                const iSection = document.getElementById('search-section-items');
                const oSection = document.getElementById('search-section-orders');
                
                document.getElementById('search-vendors-title').textContent = `Vendors · ${data.results.vendors.length}`;
                document.getElementById('search-items-title').textContent = `Items · ${data.results.items.length}`;
                document.getElementById('search-orders-title').textContent = `Orders · ${data.results.orders.length}`;

                // RENDER SEARCH VENDORS
                const vendorsContainer = document.getElementById('search-vendors-list-container');
                vendorsContainer.innerHTML = '';
                if (data.results.vendors.length === 0) {
                    vSection.style.display = 'none';
                } else {
                    vSection.style.display = 'block';
                    data.results.vendors.forEach(v => {
                        const div = document.createElement('div');
                        div.className = 'search-row-item';
                        
                        const primaryCat = v.categories[0] || 'Dairy';
                        const avatarStyle = catStyles[primaryCat] || { bg: 'var(--accent-green-bg)', text: 'var(--accent-green)' };
                        
                        const tagsHtml = v.categories.map(cat => {
                            const style = catStyles[cat] || { bg: '#E2E8F0', text: '#475569' };
                            return `<span class="cat-tag" style="background-color: ${style.bg}; color: ${style.text};">${cat}</span>`;
                        }).join(' ');

                        div.innerHTML = `
                            <div class="vendor-cell-info">
                                <div class="vendor-avatar-container" style="background-color: ${avatarStyle.bg}; color: ${avatarStyle.text};">
                                    ${v.name.charAt(0)}
                                </div>
                                <div class="vendor-details-cell">
                                    <span class="search-item-primary">${v.name}</span>
                                    <span class="vendor-sub-label">${v.address.split(',')[0]} · Geofence #1</span>
                                </div>
                            </div>
                            <div class="tag-list" style="margin-left: 20px; flex-grow: 1;">${tagsHtml}</div>
                            <span class="distance-label" style="margin-right: 24px;">${v.distance}</span>
                            <span class="rating-badge" style="margin-right: 24px;">★ ${v.rating}</span>
                            <button class="btn-secondary view-vendor-search" data-id="${v.id}" style="height: 28px; padding: 0 12px; font-size: 11.5px; color: var(--accent-green); border-color: var(--border-color);">View</button>
                        `;
                        vendorsContainer.appendChild(div);
                    });
                }

                // RENDER SEARCH ITEMS
                const itemsContainer = document.getElementById('search-items-list-container');
                itemsContainer.innerHTML = '';
                if (data.results.items.length === 0) {
                    iSection.style.display = 'none';
                } else {
                    iSection.style.display = 'block';
                    data.results.items.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'search-row-item';

                        const style = catStyles[item.category] || { bg: 'var(--accent-green-bg)', text: 'var(--accent-green)' };
                        const stockClass = item.status === 'In stock' ? 'stock-in' : (item.status === 'Low stock' ? 'stock-low' : 'stock-out');

                        div.innerHTML = `
                            <div class="vendor-cell-info">
                                <div class="vendor-avatar-container" style="background-color: ${style.bg}; color: ${style.text};">
                                    ${item.name.charAt(0)}
                                </div>
                                <div class="vendor-details-cell">
                                    <span class="search-item-primary">${item.name}</span>
                                    <span class="vendor-sub-label">${item.vendor_name} · ${item.unit}</span>
                                </div>
                            </div>
                            <span class="cat-tag" style="background-color: ${style.bg}; color: ${style.text}; margin-left: 20px; flex-grow: 0;">${item.category}</span>
                            <span style="font-family: 'JetBrains Mono', monospace; font-size: 13.5px; font-weight: 700; margin-left: auto; margin-right: 32px;">₹${item.price}</span>
                            <span class="search-stock-badge ${stockClass}" style="margin-right: 12px;">${item.status}</span>
                        `;
                        itemsContainer.appendChild(div);
                    });
                }

                // RENDER SEARCH ORDERS
                const ordersContainer = document.getElementById('search-orders-list-container');
                ordersContainer.innerHTML = '';
                if (data.results.orders.length === 0) {
                    oSection.style.display = 'none';
                } else {
                    oSection.style.display = 'block';
                    data.results.orders.forEach(o => {
                        const div = document.createElement('div');
                        div.className = 'search-row-item';
                        
                        let statusClass = 'order-completed';
                        if (o.status === 'Accepted') statusClass = 'order-accepted';
                        if (o.status === 'Pending') statusClass = 'order-pending';

                        div.innerHTML = `
                            <div class="vendor-details-cell">
                                <span class="search-item-primary" style="font-family: 'JetBrains Mono', monospace;">#${o.id}</span>
                                <span class="vendor-sub-label">Customer: ${o.customer_name}</span>
                            </div>
                            <div class="vendor-details-cell" style="margin-left: 48px; flex-grow: 1;">
                                <span class="search-item-primary">${o.vendor_name}</span>
                                <span class="vendor-sub-label">${o.type} · ${o.items_count} items</span>
                            </div>
                            <span style="font-family: 'JetBrains Mono', monospace; font-size: 13.5px; font-weight: 700; margin-right: 32px;">₹${o.amount}</span>
                            <span class="search-order-status ${statusClass}" style="margin-right: 24px;">${o.status}</span>
                            <button class="btn-secondary" style="height: 28px; padding: 0 12px; font-size: 11.5px; color: var(--accent-green); border-color: var(--border-color);">View</button>
                        `;
                        ordersContainer.appendChild(div);
                    });
                }

                // View vendor buttons in search
                document.querySelectorAll('.view-vendor-search').forEach(btn => {
                    btn.addEventListener('click', () => {
                        // Switch back to vendor tab, setting filter to All
                        switchTab('vendors');
                        currentFilter = 'All';
                        fetchVendors();
                        
                        // Scroll to vendor row or filter highlight if needed, or simply switch view
                        globalSearchInput.value = '';
                    });
                });

                // Apply dynamic filters inside search results tab
                applySearchFilters();
            })
            .catch(err => console.error('Error performing search:', err));
    }

    // Filter search result subgroups
    function applySearchFilters() {
        const searchFilterButtons = document.querySelectorAll('#search-filters-wrapper .filter-btn');
        searchFilterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                searchFilterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filter = btn.getAttribute('data-search-filter');
                searchFilter = filter;

                const vSection = document.getElementById('search-section-vendors');
                const iSection = document.getElementById('search-section-items');
                const oSection = document.getElementById('search-section-orders');

                if (filter === 'All') {
                    // check original lengths from DOM headers to decide if we show them
                    vSection.style.display = document.getElementById('search-vendors-list-container').children.length > 0 ? 'block' : 'none';
                    iSection.style.display = document.getElementById('search-items-list-container').children.length > 0 ? 'block' : 'none';
                    oSection.style.display = document.getElementById('search-orders-list-container').children.length > 0 ? 'block' : 'none';
                } else {
                    vSection.style.display = filter === 'Vendors' ? 'block' : 'none';
                    iSection.style.display = filter === 'Items' ? 'block' : 'none';
                    oSection.style.display = filter === 'Orders' ? 'block' : 'none';
                }
            });
        });
    }

    // --- INITIAL WORK ---
    switchTab('dashboard');
});
